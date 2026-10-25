// -----------------------------------------------------------------------------
// <copyright file="CloudConnector.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------
namespace Engine.Communication;

using Engine.Management.Commands;
using Core;
using Core.Exceptions;
using Management.Tasks;
using Microsoft.Extensions.Logging;
using Services.Update;
using System.Diagnostics;
using System.Globalization;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

internal sealed partial class CloudConnector
{
    internal async Task HandleHeartbeatResponseAsync(CloudMessage message, CancellationToken cancellationToken)
    {
        if (message.Payload is not Dictionary<string, object> payload)
        {
            return;
        }

        if (payload.TryGetValue("Status", out object? statusObj))
        {
            string? status = statusObj.ToString();
            if (status == "Stop")
            {
                _logStopRequested(_logger, null);
                Console.WriteLine("Cloud requested engine stop.");
                // Signal cancellation to stop the main loop
                cancellationToken = new CancellationToken(true);
                return;
            }
            else if (status == "Lock" || status == "Ban")
            {
                _logLockBanRequested(_logger, null);
                Console.WriteLine("🔴 Engine is locked/banned. Stopping user tasks.");
                var stopCommand = new CloudCommand
                {
                    CommandId = CommandIds.EmergencyStop,
                    CommandType = "EmergencyStop",
                    CorrelationId = Guid.NewGuid().ToString()
                };
                if (this.CommandReceived != null)
                {
                    await this.CommandReceived.Invoke(stopCommand).ConfigureAwait(false);
                }
            }
            else
            {
                _logHeartbeatResponseStatus(_logger, status ?? "unknown", null);
            }
        }

        // 002-020-020 §4: NextIntervalSeconds dynamically paces the heartbeat loop
        if (payload.TryGetValue("NextIntervalSeconds", out object? intervalObj) && intervalObj != null)
        {
            if (TryReadPositiveInt(intervalObj, out int nextInterval))
            {
                _heartbeatIntervalSeconds = nextInterval;
                _logHeartbeatIntervalUpdated(_logger, nextInterval, null);
            }
        }

        // 002-020-020 §4: ServerTime enables clock drift detection and synchronization
        if (payload.TryGetValue("ServerTime", out object? serverTimeObj) && serverTimeObj != null)
        {
            if (TryReadDateTimeOffset(serverTimeObj, out DateTimeOffset serverTime))
            {
                TimeSpan drift = serverTime - DateTimeOffset.UtcNow;
                _clockDrift = drift;
                if (Math.Abs(drift.TotalSeconds) > 2.0)
                {
                    _logClockDriftWarning(_logger, drift.TotalSeconds, null);
                }
            }
        }


        if (payload.TryGetValue("Commands", out object? commandsObj) && commandsObj is object[] commands)
        {
            foreach (object cmd in commands)
            {
                if (cmd is Dictionary<string, object> cmdDict)
                {
                    var command = new CloudCommand
                    {
                        CommandId = Convert.ToInt32(cmdDict.GetValueOrDefault("CommandId", 0),
                            CultureInfo.InvariantCulture),
                        CommandType = cmdDict.GetValueOrDefault("CommandType")?.ToString() ?? string.Empty,
                        Parameters = cmdDict.GetValueOrDefault("Parameters"),

                        // 002-020-020 §3.5: the command carries the identifier its result must echo, so a result
                        // can be matched to the command that asked for it. A command delivered inside a
                        // heartbeat response has no envelope of its own, so its own identifier is the one that
                        // makes the result matchable; the envelope's is honoured as a fallback, and a fresh
                        // identifier is minted only when neither names one.
                        CorrelationId = cmdDict.GetValueOrDefault("CorrelationId")?.ToString()
                            ?? message.CorrelationId
                            ?? Guid.NewGuid().ToString()
                    };
                    if (this.CommandReceived != null)
                    {
                        _ = Task.Run(() => this.CommandReceived.Invoke(command), cancellationToken);
                    }
                }
            }
        }

        if (payload.TryGetValue("AuthValid", out object? authValidObj) && authValidObj is bool authValid && !authValid)
        {
            _logAuthInvalid(_logger, null);
            Console.WriteLine("🔴 Authentication invalid. Stopping user tasks.");
            var stopCommand = new CloudCommand
            {
                CommandId = CommandIds.EmergencyStop,
                CommandType = "EmergencyStop",
                CorrelationId = Guid.NewGuid().ToString()
            };
            if (this.CommandReceived != null)
            {
                await this.CommandReceived.Invoke(stopCommand).ConfigureAwait(false);
            }

            // Force reconnection by disconnecting and signaling the event.
            //
            // The session identifier is cleared, not just the socket: a rejected credential means the session
            // issued at authentication is no longer valid. Leaving it set would let the rest of the connector
            // keep reporting an established session -- and keep sending under it -- after the Cloud has said
            // the credentials are invalid, which is exactly the condition this branch exists to stop.
            _isConnected = false;
            _sessionId = null;
            _connectionLostEvent.Set();
            await this.DisconnectAsync(CancellationToken.None).ConfigureAwait(false);
            return;
        }

        if (payload.TryGetValue("AdminMessage", out object? adminMsgObj) && adminMsgObj.ToString() is string adminMsg)
        {
            Console.WriteLine($"\n[ADMIN] {adminMsg}");
        }

        // Check for self-update metadata
        if (payload.TryGetValue("NewVersion", out object? newVersionObj) && newVersionObj is string newVersion &&
            payload.TryGetValue("DownloadUrl", out object? downloadUrlObj) && downloadUrlObj is string downloadUrlStr &&
            payload.TryGetValue("Checksum", out object? checksumObj) && checksumObj is string checksum)
        {
            try
            {
                _selfUpdateManager.CheckForUpdate(newVersion, new Uri(downloadUrlStr), checksum);
                if (_selfUpdateManager.IsUpdateAvailable)
                {
                    // Trigger update in background
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await _selfUpdateManager.InstallUpdateAsync(CancellationToken.None).ConfigureAwait(false);
                        }
                        catch (Exception ex)
                        {
                            _logSelfUpdateInstallFailed(_logger, ex);
                        }
                    }, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logSelfUpdateMetadataFailed(_logger, ex);
            }
        }
    }

    /// <inheritdoc/>
    public async Task SendExtensionManifestAsync(object manifest, CancellationToken cancellationToken)
    {
        _cachedManifest = manifest;

        if (!_isConnected || _webSocket == null || _webSocket.State != WebSocketState.Open)
        {
            _logCannotSendManifest(_logger, null);
            return;
        }

        var message = new CloudMessage
        {
            MessageType = "ExtensionManifest",
            Encrypted = true,
            Payload = manifest
        };

        await this.SendAsync(message, cancellationToken).ConfigureAwait(false);
    }

    private async Task DisplayBroadcastMessageAsync(CloudMessage message, CancellationToken cancellationToken)
    {
        // The payload arrives in whichever shape the decoder produced for it: the payload converter yields a
        // dictionary, but a payload that never went through it is still a JsonElement. Reading only the
        // dictionary shape silently dropped the broadcast instead of reporting it, so both are accepted.
        string? text = null;
        string style = "info";
        switch (message.Payload)
        {
            case Dictionary<string, object> dict:
                text = dict.GetValueOrDefault("Text")?.ToString();
                style = dict.GetValueOrDefault("Style")?.ToString() ?? "info";
                break;
            case JsonElement element when element.ValueKind == JsonValueKind.Object:
                if (element.TryGetProperty("Text", out JsonElement textElement))
                {
                    text = textElement.ValueKind == JsonValueKind.String ? textElement.GetString() : textElement.ToString();
                }

                if (element.TryGetProperty("Style", out JsonElement styleElement))
                {
                    style = styleElement.ValueKind == JsonValueKind.String ? styleElement.GetString() ?? "info" : styleElement.ToString();
                }

                break;
        }

        if (string.IsNullOrEmpty(text))
        {
            _logUnhandledMessageType(_logger, "BroadcastMessage (no Text in payload)", null);
            return;
        }

        // The colour is a presentation nicety; the text is the message. When the process has no console --
        // output redirected, or running as a service -- setting a colour throws, and an unguarded call would
        // discard the broadcast with it. Colour is therefore attempted and never allowed to swallow the text.
        bool colourChanged = false;
        try
        {
            Console.ForegroundColor = style switch
            {
                "error" => ConsoleColor.Red,
                "warning" => ConsoleColor.Yellow,
                "success" => ConsoleColor.Green,
                _ => ConsoleColor.Cyan
            };
            colourChanged = true;
        }
        catch (IOException)
        {
            // No console to colour; the text below is what matters.
            colourChanged = false;
        }

        try
        {
            Console.WriteLine($"\n=== BROADCAST ===\n{text}\n================\n");
        }
        finally
        {
            if (colourChanged)
            {
                try
                {
                    Console.ResetColor();
                }
                catch (IOException)
                {
                    // Nothing to restore when the console could not take a colour in the first place.
                }
            }
        }

        await Task.CompletedTask.ConfigureAwait(false);
    }

    private async Task HeartbeatLoopAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested && _isConnected)
        {
            try
            {
                int delaySeconds = Math.Max(1, _heartbeatIntervalSeconds);
                await Task.Delay(TimeSpan.FromSeconds(delaySeconds), cancellationToken)
                    .ConfigureAwait(false);
                await this.SendHeartbeatAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logHeartbeatError(_logger, ex);
            }
        }
    }

    private async Task SendHeartbeatAsync(CancellationToken cancellationToken)
    {
        if (!_isConnected || _webSocket == null)
        {
            return;
        }

        // Collect system metrics
        double cpuUsage = GetCpuUsage();
        long memoryUsage = Process.GetCurrentProcess().WorkingSet64;
        int tasksRunning = _taskManager.RunningTasks.Count;
        long? liveTickAgeTicks = GetLiveTickAgeTicks();

        // Record live tick age telemetry
        if (liveTickAgeTicks.HasValue)
        {
            _telemetry.RecordLiveTickAge(liveTickAgeTicks.Value);
        }

        var heartbeat = new CloudMessage
        {
            MessageType = "Heartbeat",
            Encrypted = true,
            Payload = new
            {
                EngineId = _stateManager.EngineId,
                LocalTimestamp = DateTime.UtcNow,
                IsConnected = _isConnected,
                Health = new
                {
                    CpuUsage = cpuUsage,
                    MemoryUsage = memoryUsage,
                    TasksRunning = tasksRunning,
                    LiveTickAge = liveTickAgeTicks ?? 0
                }
            }
        };

        await this.SendAsync(heartbeat, cancellationToken).ConfigureAwait(false);
    }

    private double GetCpuUsage()
    {
        try
        {
            var process = Process.GetCurrentProcess();
            var now = DateTime.UtcNow;
            var totalProcessorTime = process.TotalProcessorTime;
            var deltaTime = (now - _lastCpuTimeSample).TotalSeconds;
            var deltaProcessorTime = (totalProcessorTime - _lastTotalProcessorTime).TotalSeconds;

            _lastCpuTimeSample = now;
            _lastTotalProcessorTime = totalProcessorTime;

            if (deltaTime <= 0 || deltaProcessorTime <= 0)
            {
                return 0.0;
            }

            // CPU usage as percentage of total available (Environment.ProcessorCount)
            double usage = (deltaProcessorTime / deltaTime) / Environment.ProcessorCount * 100.0;
            return Math.Min(100.0, Math.Max(0.0, usage));
        }
        catch
        {
            return 0.0;
        }
    }

    private long? GetLiveTickAgeTicks()
    {
        var lastTick = _taskManager.GetLastLiveTickTimestamp();
        if (lastTick.HasValue)
        {
            return (DateTime.UtcNow - lastTick.Value).Ticks;
        }
        return null;
    }

    private TimeSpan GetReconnectDelay()
    {
        _reconnectAttempt++;
        double delay = Math.Min(AppConstants.MaxRetryDelaySeconds, AppConstants.DefaultRetryDelaySeconds * Math.Pow(1.5, _reconnectAttempt));
        return TimeSpan.FromSeconds(delay);
    }

    /// <summary>Attempts to read a strictly positive integer from a loosely typed payload object.</summary>
    /// <param name="value">The object value to parse.</param>
    /// <param name="result">The parsed positive integer, or 0 if parsing fails.</param>
    /// <returns><see langword="true"/> if a valid positive integer was read; otherwise, <see langword="false"/>.</returns>
    private static bool TryReadPositiveInt(object value, out int result)
    {
        result = 0;
        if (value is int i)
        {
            if (i > 0)
            {
                result = i;
                return true;
            }

            return false;
        }

        if (value is long l)
        {
            if (l > 0 && l <= int.MaxValue)
            {
                result = (int)l;
                return true;
            }

            return false;
        }

        if (value is JsonElement je)
        {
            if (je.ValueKind == JsonValueKind.Number && je.TryGetInt32(out int jeInt) && jeInt > 0)
            {
                result = jeInt;
                return true;
            }

            if (je.ValueKind == JsonValueKind.String && int.TryParse(je.GetString(), CultureInfo.InvariantCulture, out int jeStrInt) && jeStrInt > 0)
            {
                result = jeStrInt;
                return true;
            }

            return false;
        }

        if (int.TryParse(value.ToString(), CultureInfo.InvariantCulture, out int parsed) && parsed > 0)
        {
            result = parsed;
            return true;
        }

        return false;
    }

    /// <summary>Attempts to read a <see cref="DateTimeOffset"/> from a loosely typed payload object.</summary>
    /// <param name="value">The object value to parse.</param>
    /// <param name="result">The parsed UTC <see cref="DateTimeOffset"/>.</param>
    /// <returns><see langword="true"/> if a valid timestamp was read; otherwise, <see langword="false"/>.</returns>
    private static bool TryReadDateTimeOffset(object value, out DateTimeOffset result)
    {
        result = default;
        if (value is DateTime dt)
        {
            result = dt.Kind == DateTimeKind.Utc ? dt : DateTime.SpecifyKind(dt, DateTimeKind.Utc);
            return true;
        }

        if (value is DateTimeOffset dto)
        {
            result = dto.ToUniversalTime();
            return true;
        }

        if (value is JsonElement je)
        {
            if (je.ValueKind == JsonValueKind.String && je.TryGetDateTimeOffset(out DateTimeOffset jeDto))
            {
                result = jeDto.ToUniversalTime();
                return true;
            }

            return false;
        }

        string? str = value.ToString();
        if (!string.IsNullOrWhiteSpace(str) && DateTimeOffset.TryParse(str, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out DateTimeOffset parsed))
        {
            result = parsed.ToUniversalTime();
            return true;
        }

        return false;
    }

    /// <inheritdoc/>
    public async ValueTask DisposeAsync()
    {
        if (_isDisposing)
        {
            return;
        }

        _isDisposing = true;

        await this.DisconnectAsync(CancellationToken.None).ConfigureAwait(false);
        _receiveCts?.Dispose();
        _sendLock.Dispose();
        _transferManager.Dispose();
        _queueCts?.Dispose();
        _connectionLostEvent.Dispose();
    }
}
