// -----------------------------------------------------------------------------
// <copyright file="CloudConnector.Connection.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Communication;

using Core;
using Core.Exceptions;
using Microsoft.Extensions.Logging;
using System.Net.WebSockets;

internal sealed partial class CloudConnector
{
    private async Task ConnectAndAuthenticateAsync(CancellationToken cancellationToken)
    {
        _connectionAttemptCounter++;

        if (RuntimeEnvironment.IsProduction)
        {
            _logConnectingCloudAttempt(_logger, _connectionAttemptCounter, null);
            try
            {
                await ConnectSingleEndpointAsync(AppConstants.PrimaryEndpoint, cancellationToken).ConfigureAwait(false);
                return;
            }
            catch (Exception)
            {
                // Silently fallback.
            }

            try
            {
                await ConnectSingleEndpointAsync(AppConstants.FallbackEndpoint, cancellationToken).ConfigureAwait(false);
                return;
            }
            catch (Exception ex)
            {
                throw new EngineException("Failed to connect to any cloud endpoint.", ex);
            }
        }
        else
        {
            string[] endpoints = string.Equals(AppConstants.PrimaryEndpoint, AppConstants.FallbackEndpoint, StringComparison.OrdinalIgnoreCase)
                ? [AppConstants.PrimaryEndpoint]
                : [AppConstants.PrimaryEndpoint, AppConstants.FallbackEndpoint];
            Exception? lastException = null;
            foreach (string endpoint in endpoints)
            {
                try
                {
                    _logConnectingToEndpoint(_logger, endpoint, null);
                    Console.WriteLine($"Connecting to {endpoint}...");
                    await this.ConnectSingleEndpointAsync(endpoint, cancellationToken).ConfigureAwait(false);
                    return;
                }
                catch (Exception ex)
                {
                    lastException = ex;
                    _logConnectFailed(_logger, endpoint, ex);
                }
            }

            throw new EngineException("Failed to connect to any cloud endpoint.", lastException!);
        }
    }

    private async Task ConnectSingleEndpointAsync(string endpoint, CancellationToken cancellationToken)
    {
        var socket = new ClientWebSocket();
        _webSocket = socket;
        await socket.ConnectAsync(new Uri(endpoint), cancellationToken).ConfigureAwait(false);

        if (socket.State == WebSocketState.Open)
        {
            if (RuntimeEnvironment.IsDevelopment)
            {
                _logConnectedToEndpoint(_logger, endpoint, null);
                Console.WriteLine($"Connected to {endpoint}.");
            }
            else
            {
                _logConnectedToEndpoint(_logger, "Cloud", null);
                Console.WriteLine("Connected to Cloud.");
            }

            // The AuthResponse that completes the handshake can only be read off the socket, and only the
            // receive loop reads it, so the loop has to be running before the Auth is sent: started
            // afterwards it could not be reached until authentication had already finished, which deadlocks
            // the handshake against any Cloud.
            _receiveCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            _ = Task.Run(() => this.ReceiveLoopAsync(socket, _receiveCts.Token), _receiveCts.Token);

            try
            {
                await this.AuthenticateAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (Exception)
            {
                // A failed handshake is retried on a fresh socket, so the reader is released first: left
                // running it would keep reading whichever socket the retry installs.
                await _receiveCts.CancelAsync().ConfigureAwait(false);
                throw;
            }

            _isConnected = true;
            _connectionLostEvent.Reset(); // ensure event is not set

            _queueCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            _queueProcessingTask = Task.Run(
                () => ProcessOutgoingQueueAsync(_queueCts.Token),
                _queueCts.Token);

            _telemetry.SetConnectionState(true);
            _reconnectAttempt = 0;

            await this.SendHeartbeatAsync(cancellationToken).ConfigureAwait(false);
            _ = Task.Run(() => this.HeartbeatLoopAsync(cancellationToken), cancellationToken);
        }
    }
}
