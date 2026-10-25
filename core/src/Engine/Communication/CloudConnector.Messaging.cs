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
    private async Task ProcessOutgoingQueueAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            // RUN‑02: Check cancellation at the start of each loop iteration.
            if (cancellationToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                if (_isConnected && _webSocket?.State == WebSocketState.Open)
                {
                    var pending = await _stateManager.GetPendingOutgoingMessagesAsync(cancellationToken).ConfigureAwait(false);
                    foreach (var msg in pending)
                    {
                        if (!_isConnected || cancellationToken.IsCancellationRequested)
                        {
                            break;
                        }
                        // Deserialize message from JSON
                        var cloudMsg = JsonSerializer.Deserialize<CloudMessage>(msg.PayloadJson);
                        if (cloudMsg == null)
                        {
                            continue;
                        }
                        // Send it
                        try
                        {
                            await SendAsync(cloudMsg, cancellationToken).ConfigureAwait(false);
                            // Mark as sent
                            await _stateManager.DeleteOutgoingMessageAsync(msg.Id, cancellationToken).ConfigureAwait(false);
                        }
                        catch (Exception ex)
                        {
                            // Log and break to retry later
                            _logErrorInLoop(_logger, $"Failed to send queued message: {ex.Message}", ex);
                            break;
                        }
                    }
                }
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                _logErrorInLoop(_logger, $"Error in queue processing: {ex.Message}", ex);
            }
            // Wait a short interval before checking again
            await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken).ConfigureAwait(false);
        }
    }

    private async Task AuthenticateAsync(CancellationToken cancellationToken)
    {
        _logAuthenticating(_logger, null);
        Console.WriteLine("Authenticating with cloud...");

        var authMessage = new CloudMessage
        {
            MessageType = "Auth",
            Encrypted = false,
            Payload = new
            {
                Credentials.Username,
                Credentials.Password,
                InstanceApiKey = Credentials.InstanceApiKey,
                EngineVersion = AppConstants.EngineVersion,
                ClientCapabilities = AppConstants.SupportedCapabilities,
                PublicKey = _securityManager.GetPublicKey()
            }
        };

        await this.SendAsync(authMessage, cancellationToken).ConfigureAwait(false);

        bool authResponseReceived = false;
        while (!authResponseReceived && !cancellationToken.IsCancellationRequested)
        {
            if (!string.IsNullOrEmpty(_sessionId))
            {
                authResponseReceived = true;
                break;
            }

            await Task.Delay(100, cancellationToken).ConfigureAwait(false);
        }

        if (string.IsNullOrEmpty(_sessionId))
        {
            throw new EngineException("Authentication failed: no session ID received.");
        }

        _logAuthenticated(_logger, _sessionId, null);
        Console.WriteLine($"Authenticated. Session ID: {_sessionId}");
        _isConnected = true;
        await _stateManager.SetSessionIdAsync(_sessionId, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Reads and dispatches every frame the cloud sends on one connection.
    /// </summary>
    /// <param name="socket">The connection this loop owns; it is a parameter rather than a field read so that
    /// a loop left over from an abandoned connection cannot consume the frames of its replacement.</param>
    /// <param name="cancellationToken">Cancellation token; cancelling it ends the loop.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    private async Task ReceiveLoopAsync(WebSocket socket, CancellationToken cancellationToken)
    {
        byte[] buffer = new byte[4096];
        StringBuilder messageBuilder = new StringBuilder();

        while (!cancellationToken.IsCancellationRequested && socket.State == WebSocketState.Open)
        {
            try
            {
                WebSocketReceiveResult result = await socket
                    .ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken).ConfigureAwait(false);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    _logWebSocketClosedByServer(_logger, null);
                    Console.WriteLine("WebSocket closed by server.");
                    _isConnected = false;
                    _connectionLostEvent.Set(); // signal connection lost
                    break;
                }

                string messagePart = Encoding.UTF8.GetString(buffer, 0, result.Count);
                messageBuilder.Append(messagePart);

                if (result.EndOfMessage)
                {
                    string json = messageBuilder.ToString();
                    messageBuilder.Clear();

                    try
                    {
                        CloudMessage? message = JsonSerializer.Deserialize<CloudMessage>(json);
                        if (message != null)
                        {
                            await this.ProcessReceivedMessageAsync(message, cancellationToken).ConfigureAwait(false);
                        }
                    }
                    catch (JsonException ex)
                    {
                        _logDeserializationError(_logger, json, ex);
                    }
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logReceiveLoopError(_logger, ex.Message, ex);
                await Task.Delay(1000, cancellationToken).ConfigureAwait(false);
            }
        }

        _isConnected = false;
        _connectionLostEvent.Set(); // signal connection lost
        _telemetry.SetConnectionState(false);
        _logReceiveLoopEnded(_logger, null);
        Console.WriteLine("Receive loop ended.");
    }

    private async Task ProcessReceivedMessageAsync(CloudMessage message, CancellationToken cancellationToken)
    {
        _logReceivedMessage(_logger, message.MessageType, message.Encrypted, null);

        if (message.Encrypted && message.Payload is string encryptedPayload)
        {
            try
            {
                string decryptedJson = _securityManager.DecryptMessage(encryptedPayload);

                // The plaintext replaces the cipher text in the same member, so it has to be materialised in
                // the same shapes the envelope's own deserialisation produces (002-020-020 §3.2).
                message.Payload = CloudPayloadJsonConverter.Parse(decryptedJson);
            }
            catch (Exception ex)
            {
                _logDecryptError(_logger, ex.Message, ex);
                return;
            }
        }

        switch (message.MessageType)
        {
            case "AuthResponse":
                if (message.Payload is Dictionary<string, object> payload)
                {
                    if (payload.TryGetValue("Status", out object? statusObj) && statusObj.ToString() == "Success")
                    {
                        string? sessionId = payload.TryGetValue("SessionId", out object? sessionObj)
                            ? sessionObj.ToString()
                            : null;
                        if (payload.TryGetValue("PublicKey", out object? pubKeyObj))
                        {
                            _securityManager.SetCloudPublicKey(pubKeyObj.ToString()!);
                        }

                        if (payload.TryGetValue("Nonce", out object? nonceObj))
                        {
                            _securityManager.SetNonce(nonceObj.ToString()!);
                        }

                        if (payload.TryGetValue("EngineId", out object? engineIdObj) && engineIdObj != null)
                        {
                            string boundEngineId = engineIdObj.ToString()!;
                            if (!string.IsNullOrWhiteSpace(boundEngineId))
                            {
                                _stateManager.SetEngineId(boundEngineId);
                            }
                        }

                        _securityManager.DeriveSharedSecret();

                        // Send the confirming frame BEFORE publishing the session identifier. AuthenticateAsync
                        // polls for that identifier, so publishing it first let the poll return while this frame
                        // was still pending -- and the caller's first heartbeat then overtook AuthConfirm. A peer
                        // reading the handshake in the order 002-020-020 Section 3.3 prescribes then received a
                        // Heartbeat where it expected AuthConfirm, never acknowledged the session, and the
                        // connector reconnected in a loop.
                        if (sessionId != null)
                        {
                            string challenge = _securityManager.GenerateChallenge(nonceObj?.ToString() ?? string.Empty);
                            var confirm = new CloudMessage
                            {
                                MessageType = "AuthConfirm",
                                Encrypted = true,
                                Payload = new { Challenge = challenge }
                            };
                            await this.SendAsync(confirm, cancellationToken).ConfigureAwait(false);
                        }

                        _sessionId = sessionId;
                    }
                    else
                    {
                        string error = payload.TryGetValue("ErrorMessage", out object? errObj)
                            ? errObj.ToString() ?? "Unknown error"
                            : "Unknown error";
                        _logAuthFailed(_logger, error, null);
                        throw new EngineException($"Authentication failed: {error}");
                    }
                }

                break;

            case "AuthAck":
                _logAuthAck(_logger, null);
                Console.WriteLine("Authentication acknowledged.");
                _isConnected = true;
                if (_cachedManifest != null)
                {
                    await this.SendExtensionManifestAsync(_cachedManifest, cancellationToken).ConfigureAwait(false);
                }
                break;

            case "HeartbeatResponse":
                await this.HandleHeartbeatResponseAsync(message, cancellationToken).ConfigureAwait(false);
                break;

            case "Command":
                if (message.Payload is Dictionary<string, object> payloadDict)
                {
                    try
                    {
                        var command = new CloudCommand
                        {
                            CommandId = Convert.ToInt32(payloadDict.GetValueOrDefault("CommandId", 0),
                                CultureInfo.InvariantCulture),
                            CommandType = payloadDict.GetValueOrDefault("CommandType")?.ToString() ?? string.Empty,
                            Parameters = payloadDict.GetValueOrDefault("Parameters"),
                            TimeoutSeconds = payloadDict.GetValueOrDefault("TimeoutSeconds") as int?,

                            // 002-020-020 §3.5: the command carries the identifier its result must echo, so a
                            // result can be matched to the command that asked for it. It is taken off the
                            // envelope first, then from the command's own payload.
                            CorrelationId = message.CorrelationId
                                ?? payloadDict.GetValueOrDefault("CorrelationId")?.ToString()
                        };

                        if (this.CommandReceived != null)
                        {
                            await this.CommandReceived.Invoke(command).ConfigureAwait(false);
                        }
                        else
                        {
                            _logNoCommandHandler(_logger, null);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logCommandError(_logger, ex.Message, ex);
                    }
                }
                else
                {
                    _logInvalidCommandPayload(_logger, null);
                }

                break;

            case "CommandResponse":
                break;

            case "BinaryTransferStart":
            case "BinaryChunk":
            case "BinaryTransferEnd":
            case "BinaryTransferAck":
                await this.ProcessBinaryTransferAsync(message, cancellationToken).ConfigureAwait(false);
                break;

            case "BroadcastMessage":
                await this.DisplayBroadcastMessageAsync(message, cancellationToken).ConfigureAwait(false);
                break;

            default:
                _logUnhandledMessageType(_logger, message.MessageType, null);
                break;
        }
    }

    private async Task ProcessBinaryTransferAsync(CloudMessage message, CancellationToken cancellationToken)
    {
        _logBinaryTransfer(_logger, message.MessageType, null);

        if (message.Payload is not Dictionary<string, object> payload)
        {
            return;
        }

        switch (message.MessageType)
        {
            case "BinaryTransferStart":
                string transferId = payload.GetValueOrDefault("TransferId")?.ToString() ?? string.Empty;
                string fileName = payload.GetValueOrDefault("FileName")?.ToString() ?? "unknown";
                long totalSize = Convert.ToInt64(payload.GetValueOrDefault("TotalSize", 0L), CultureInfo.InvariantCulture);
                string checksum = payload.GetValueOrDefault("Checksum")?.ToString() ?? string.Empty;
                string contentType = payload.GetValueOrDefault("ContentType")?.ToString() ?? "application/octet-stream";

                _transferManager.StartIncoming(transferId, fileName, totalSize, checksum, contentType);
                break;

            case "BinaryChunk":
                string chunkTransferId = payload.GetValueOrDefault("TransferId")?.ToString() ?? string.Empty;
                long offset = Convert.ToInt64(payload.GetValueOrDefault("Offset", 0L), CultureInfo.InvariantCulture);
                string dataB64 = payload.GetValueOrDefault("Data")?.ToString() ?? string.Empty;
                byte[] chunkData = Convert.FromBase64String(dataB64);

                bool complete = _transferManager.AppendChunk(chunkTransferId, offset, chunkData);
                if (complete)
                {
                    // Send ACK
                    var ackPayload = new
                    {
                        TransferId = chunkTransferId,
                        Status = "Success"
                    };
                    var ackMessage = new CloudMessage
                    {
                        MessageType = "BinaryTransferAck",
                        Encrypted = true,
                        Payload = ackPayload
                    };
                    await this.SendAsync(ackMessage, cancellationToken).ConfigureAwait(false);
                    _logBinaryTransfer(_logger, "BinaryTransferAck", null);
                }
                break;

            case "BinaryTransferEnd":
                string endTransferId = payload.GetValueOrDefault("TransferId")?.ToString() ?? string.Empty;
                string status = payload.GetValueOrDefault("Status")?.ToString() ?? "Success";

                if (status == "Success")
                {
                    var transfer = _transferManager.GetCompletedTransfer(endTransferId);
                    if (transfer != null)
                    {
                        // Save the received file to disk. The directory is configurable so that two
                        // connectors in one process -- concurrent engine instances, or tests running
                        // side by side -- cannot collide on the same file name: a fixed directory makes
                        // the second writer fail with a sharing violation rather than saving its file.
                        string outputDir = AppConstants.DownloadDirectory;
                        Directory.CreateDirectory(outputDir);
                        string outputPath = Path.Combine(outputDir, transfer.FileName);
                        if (File.Exists(transfer.TempFilePath))
                        {
                            File.Move(transfer.TempFilePath, outputPath, true);
                            _logBinaryTransferSaved(_logger, endTransferId, outputPath, null);
                        }
                        else
                        {
                            _logBinaryTransferNotFound(_logger, endTransferId, null);
                        }
                    }
                    else
                    {
                        _logBinaryTransferNotFound(_logger, endTransferId, null);
                    }
                }
                else
                {
                    _transferManager.CancelIncoming(endTransferId);
                    _logBinaryTransferEnded(_logger, endTransferId, status, null);
                }
                break;

            case "BinaryTransferAck":
                string ackTransferId = payload.GetValueOrDefault("TransferId")?.ToString() ?? string.Empty;
                string ackStatus = payload.GetValueOrDefault("Status")?.ToString() ?? "Success";
                if (ackStatus == "RetransmitRequest")
                {
                    // The receiver is asking to retransmit from a specific offset.
                    long expectedOffset = Convert.ToInt64(payload.GetValueOrDefault("ExpectedOffset", 0L), CultureInfo.InvariantCulture);
                    _logRetransmitRequest(_logger, ackTransferId, null);
                    _transferManager.HandleRetransmitRequest(ackTransferId, expectedOffset);
                }
                else
                {
                    _logBinaryTransferAck(_logger, ackTransferId, ackStatus, null);
                }
                break;
        }
    }


}
