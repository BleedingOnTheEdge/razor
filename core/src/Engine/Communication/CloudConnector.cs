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

/// <summary>Default implementation of <see cref="ICloudConnector"/>.</summary>
internal sealed partial class CloudConnector : ICloudConnector, IAsyncDisposable
{
    private readonly ILogger<CloudConnector> _logger;
    private readonly ISecurityManager _securityManager;
    private readonly IEngineTelemetry _telemetry;
    private readonly IStateManager _stateManager;
    private CancellationTokenSource? _queueCts;
    private Task? _queueProcessingTask;
    private readonly ITaskManager _taskManager;
    private readonly BinaryTransferManager _transferManager;
    private readonly ISelfUpdateManager _selfUpdateManager;
    private readonly SemaphoreSlim _sendLock = new(1, 1);
    private ClientWebSocket? _webSocket;
    private CancellationTokenSource? _receiveCts;
    private bool _isConnected;
    private string? _sessionId;
    private int _heartbeatIntervalSeconds = AppConstants.DefaultHeartbeatIntervalSeconds;
    private TimeSpan _clockDrift = TimeSpan.Zero;
    private int _reconnectAttempt;
    private bool _isDisposing;
    private int _connectionAttemptCounter;
    private readonly ManualResetEventSlim _connectionLostEvent = new(false);

    // For CPU usage calculation
    private DateTime _lastCpuTimeSample = DateTime.UtcNow;
    private TimeSpan _lastTotalProcessorTime = TimeSpan.Zero;

    // LoggerMessage delegates
    private static readonly Action<ILogger, Exception?> _logStartingConnector =
        LoggerMessage.Define(LogLevel.Information, 1, "Starting cloud connector.");

    private static readonly Action<ILogger, Exception?> _logConnectorCancelled =
        LoggerMessage.Define(LogLevel.Information, 3, "Cloud connector cancelled.");

    private static readonly Action<ILogger, string, Exception?> _logErrorInLoop =
        LoggerMessage.Define<string>(LogLevel.Error, 4, "Error in cloud connector loop: {ErrorMessage}");

    private static readonly Action<ILogger, string, Exception?> _logErrorClosingWebSocket =
        LoggerMessage.Define<string>(LogLevel.Warning, 6, "Error closing WebSocket: {ErrorMessage}");

    private static readonly Action<ILogger, Exception?> _logDisconnected =
        LoggerMessage.Define(LogLevel.Information, 7, "Disconnected from cloud.");

    private static readonly Action<ILogger, string, bool, Exception?> _logSentMessage =
        LoggerMessage.Define<string, bool>(LogLevel.Trace, 8, "Sent message: {MessageType} (Encrypted: {Encrypted})");

    private static readonly Action<ILogger, string, Exception?> _logConnectingToEndpoint =
        LoggerMessage.Define<string>(LogLevel.Information, 9, "Connecting to {Endpoint}...");

    private static readonly Action<ILogger, string, Exception?> _logConnectedToEndpoint =
        LoggerMessage.Define<string>(LogLevel.Information, 10, "Connected to {Endpoint}.");

    private static readonly Action<ILogger, Exception?> _logAuthenticating =
        LoggerMessage.Define(LogLevel.Information, 12, "Authenticating with cloud...");

    private static readonly Action<ILogger, string, Exception?> _logAuthenticated =
        LoggerMessage.Define<string>(LogLevel.Information, 13, "Authenticated. Session ID: {SessionId}");

    private static readonly Action<ILogger, Exception?> _logWebSocketClosedByServer =
        LoggerMessage.Define(LogLevel.Information, 14, "WebSocket closed by server.");

    private static readonly Action<ILogger, string, Exception?> _logDeserializationError =
        LoggerMessage.Define<string>(LogLevel.Error, 15, "Error deserializing message: {Json}");

    private static readonly Action<ILogger, string, Exception?> _logReceiveLoopError =
        LoggerMessage.Define<string>(LogLevel.Error, 16, "Error in receive loop: {ErrorMessage}");

    private static readonly Action<ILogger, Exception?> _logReceiveLoopEnded =
        LoggerMessage.Define(LogLevel.Warning, 17, "Receive loop ended.");

    private static readonly Action<ILogger, string, bool, Exception?> _logReceivedMessage =
        LoggerMessage.Define<string, bool>(LogLevel.Trace, 18,
            "Received message: {MessageType} (Encrypted: {Encrypted})");

    private static readonly Action<ILogger, string, Exception?> _logDecryptError =
        LoggerMessage.Define<string>(LogLevel.Error, 19, "Error decrypting message: {ErrorMessage}");

    private static readonly Action<ILogger, string, Exception?> _logAuthFailed =
        LoggerMessage.Define<string>(LogLevel.Error, 20, "Authentication failed: {Error}");

    private static readonly Action<ILogger, Exception?> _logAuthAck =
        LoggerMessage.Define(LogLevel.Information, 21, "Authentication acknowledged.");

    private static readonly Action<ILogger, string, Exception?> _logCommandError =
        LoggerMessage.Define<string>(LogLevel.Error, 23, "Error processing command: {ErrorMessage}");

    private static readonly Action<ILogger, Exception?> _logInvalidCommandPayload =
        LoggerMessage.Define(LogLevel.Warning, 24, "Invalid command payload format.");

    private static readonly Action<ILogger, Exception?> _logStopRequested =
        LoggerMessage.Define(LogLevel.Warning, 25, "Cloud requested engine stop.");

    private static readonly Action<ILogger, Exception?> _logLockBanRequested =
        LoggerMessage.Define(LogLevel.Warning, 26, "Engine is locked/banned. Stopping user tasks.");

    private static readonly Action<ILogger, string, Exception?> _logHeartbeatResponseStatus =
        LoggerMessage.Define<string>(LogLevel.Debug, 27, "Heartbeat response status: {Status}");

    private static readonly Action<ILogger, Exception?> _logAuthInvalid =
        LoggerMessage.Define(LogLevel.Warning, 28, "Authentication invalid. Stopping user tasks.");

    private static readonly Action<ILogger, string, Exception?> _logBinaryTransfer =
        LoggerMessage.Define<string>(LogLevel.Debug, 29, "Binary transfer message received: {MessageType}");

    private static readonly Action<ILogger, Exception?> _logHeartbeatError =
        LoggerMessage.Define(LogLevel.Error, 30, "Error in heartbeat loop.");

    private static readonly Action<ILogger, string, Exception?> _logUnhandledMessageType =
        LoggerMessage.Define<string>(LogLevel.Debug, 31, "Unhandled message type: {MessageType}");

    private static readonly Action<ILogger, Exception?> _logNoCommandHandler =
        LoggerMessage.Define(LogLevel.Warning, 32, "No command handler registered.");

    private static readonly Action<ILogger, int, Exception?> _logConnectingCloudAttempt =
        LoggerMessage.Define<int>(LogLevel.Information, 33, "Connecting to Cloud (attempt {Attempt})...");

    private static readonly Action<ILogger, string, Exception?> _logConnectFailed =
        LoggerMessage.Define<string>(LogLevel.Trace, 34, "Failed to connect to {Endpoint}");

    private static readonly Action<ILogger, string, Exception?> _logBinarySendStarted =
        LoggerMessage.Define<string>(LogLevel.Information, 35, "Started binary send: {FilePath}");

    private static readonly Action<ILogger, string, Exception?> _logBinarySendCompleted =
        LoggerMessage.Define<string>(LogLevel.Information, 36, "Completed binary send: {FilePath}");

    private static readonly Action<ILogger, string, Exception?> _logBinarySendFailed =
        LoggerMessage.Define<string>(LogLevel.Error, 37, "Binary send failed: {FilePath}");

    private static readonly Action<ILogger, string, string, Exception?> _logBinaryTransferSaved =
        LoggerMessage.Define<string, string>(LogLevel.Information, 38, "Binary transfer {TransferId} saved to {Path}");

    private static readonly Action<ILogger, string, Exception?> _logBinaryTransferNotFound =
        LoggerMessage.Define<string>(LogLevel.Warning, 39, "Binary transfer {TransferId} completed but transfer not found.");

    private static readonly Action<ILogger, string, string, Exception?> _logBinaryTransferEnded =
        LoggerMessage.Define<string, string>(LogLevel.Warning, 40, "Binary transfer {TransferId} ended with status: {Status}");

    private static readonly Action<ILogger, string, string, Exception?> _logBinaryTransferAck =
        LoggerMessage.Define<string, string>(LogLevel.Debug, 41, "Binary transfer ACK for {TransferId}: {Status}");

    private static readonly Action<ILogger, Exception?> _logSelfUpdateInstallFailed =
        LoggerMessage.Define(LogLevel.Error, 42, "Self-update installation failed.");

    private static readonly Action<ILogger, Exception?> _logSelfUpdateMetadataFailed =
        LoggerMessage.Define(LogLevel.Error, 43, "Failed to process self-update metadata.");

    private static readonly Action<ILogger, string, Exception?> _logQueuedMessage =
        LoggerMessage.Define<string>(LogLevel.Information, 44, "Message of type {MessageType} queued for later delivery.");

    private static readonly Action<ILogger, string, Exception?> _logRetransmitRequest =
        LoggerMessage.Define<string>(LogLevel.Information, 45, "Retransmit requested for transfer {TransferId}.");

    private static readonly Action<ILogger, Exception?> _logCannotSendManifest =
        LoggerMessage.Define(LogLevel.Warning, 46, "Cannot send extension manifest: not connected.");

    private static readonly Action<ILogger, double, Exception?> _logClockDriftWarning =
        LoggerMessage.Define<double>(LogLevel.Warning, 47, "Clock drift detected between engine and cloud: {DriftSeconds:F2}s");

    private static readonly Action<ILogger, int, Exception?> _logHeartbeatIntervalUpdated =
        LoggerMessage.Define<int>(LogLevel.Debug, 48, "Heartbeat interval updated to {IntervalSeconds}s");

    /// <inheritdoc/>
    public bool IsConnected => _isConnected;

    /// <inheritdoc/>
    public string? SessionId => _sessionId;

    /// <inheritdoc/>
    public int HeartbeatIntervalSeconds => _heartbeatIntervalSeconds;

    /// <inheritdoc/>
    public TimeSpan ClockDrift => _clockDrift;

    /// <summary>Event raised when a command is received.</summary>
    public event Func<CloudCommand, Task>? CommandReceived;

    /// <summary>Initialises a new instance of the <see cref="CloudConnector"/> class.</summary>
    public CloudConnector(
        ILogger<CloudConnector> logger,
        ISecurityManager securityManager,
        IEngineTelemetry telemetry,
        IStateManager stateManager,
        ITaskManager taskManager,
        BinaryTransferManager transferManager,
        ISelfUpdateManager selfUpdateManager)
    {
        _logger = logger;
        _securityManager = securityManager;
        _telemetry = telemetry;
        _stateManager = stateManager;
        _taskManager = taskManager;
        _transferManager = transferManager;
        _selfUpdateManager = selfUpdateManager;
    }

    /// <inheritdoc/>
    public async Task RunAsync(CancellationToken cancellationToken)
    {
        _logStartingConnector(_logger, null);
        Console.WriteLine("Cloud connector starting.");

        while (true)
        {
            try
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    break;
                }

                Credentials.EnsureAvailable();

                await this.ConnectAndAuthenticateAsync(cancellationToken).ConfigureAwait(false);

                if (_isConnected)
                {
                    // Wait until the connection is lost or cancellation is requested.
                    // The event is signaled by ReceiveLoopAsync or DisconnectAsync.
                    try
                    {
                        _connectionLostEvent.Reset();
                        while (!cancellationToken.IsCancellationRequested && _isConnected)
                        {
                            // Wait with a small timeout to allow cancellation checks
                            if (_connectionLostEvent.Wait(TimeSpan.FromSeconds(1), cancellationToken))
                            {
                                break; // connection lost
                            }
                        }

                        // If we exit because cancellation, the outer loop will break.
                        // If we exit because connection lost, we'll loop and reconnect.
                        if (cancellationToken.IsCancellationRequested)
                        {
                            break;
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        // Expected on cancellation.
                        break;
                    }
                }
            }
            catch (OperationCanceledException)
            {
                _logConnectorCancelled(_logger, null);
                Console.WriteLine("Cloud connector cancelled.");
                break;
            }
            catch (Exception ex)
            {
                _logErrorInLoop(_logger, ex.Message, ex);
                Console.WriteLine($"Error in connector loop: {ex.Message}");
                await Task.Delay(this.GetReconnectDelay(), cancellationToken).ConfigureAwait(false);
            }
        }

        await this.DisconnectAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public async Task DisconnectAsync(CancellationToken cancellationToken)
    {
        if (_isDisposing)
        {
            return;
        }

        // Cancel queue processing
        if (_queueCts != null)
        {
            await _queueCts.CancelAsync().ConfigureAwait(false);
            if (_queueProcessingTask != null)
            {
                try { await _queueProcessingTask.ConfigureAwait(false); } catch { }
            }
            _queueCts.Dispose();
            _queueCts = null;
            _queueProcessingTask = null;
        }

        _isConnected = false;
        _connectionLostEvent.Set(); // Signal that we are disconnecting

        if (_receiveCts != null)
        {
            await _receiveCts.CancelAsync().ConfigureAwait(false);
        }

        if (_webSocket != null && _webSocket.State == WebSocketState.Open)
        {
            try
            {
                await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Disconnecting", cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logErrorClosingWebSocket(_logger, ex.Message, ex);
            }
        }

        _webSocket?.Dispose();
        _webSocket = null;
        _telemetry.SetConnectionState(false);
        _logDisconnected(_logger, null);
        Console.WriteLine("Disconnected from cloud.");
    }

    /// <inheritdoc/>
    public async Task SendAsync(CloudMessage message, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(message);

        var ws = _webSocket;
        bool isOpen = ws != null && ws.State == WebSocketState.Open;

        // If socket is not open, enqueue non‑critical messages
        if (!isOpen)
        {
            if (message.MessageType != "Heartbeat" &&
                message.MessageType != "Auth" &&
                message.MessageType != "AuthConfirm")
            {
                string json = JsonSerializer.Serialize(message);
                await _stateManager.EnqueueOutgoingMessageAsync(message.MessageType, json, cancellationToken)
                    .ConfigureAwait(false);
                _logQueuedMessage(_logger, message.MessageType, null);
                return;
            }

            // Critical messages require an open connection
            throw new InvalidOperationException("WebSocket is not connected.");
        }

        // At this point, ws is guaranteed non‑null and open
        await _sendLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            message.Version = AppConstants.EngineVersion;

            if (message.Encrypted)
            {
                string jsonPayload = JsonSerializer.Serialize(message.Payload);
                string encryptedPayload = _securityManager.EncryptMessage(jsonPayload);
                message.Payload = encryptedPayload;
            }

            string json = JsonSerializer.Serialize(message);
            byte[] bytes = Encoding.UTF8.GetBytes(json);
            await ws!.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, cancellationToken)
                .ConfigureAwait(false);
            _logSentMessage(_logger, message.MessageType, message.Encrypted, null);
        }
        finally
        {
            _sendLock.Release();
        }
    }
}
