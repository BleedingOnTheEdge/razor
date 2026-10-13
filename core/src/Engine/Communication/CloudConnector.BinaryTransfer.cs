// -----------------------------------------------------------------------------
// <copyright file="CloudConnector.BinaryTransfer.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Communication;

using Core;
using Core.Exceptions;
using Microsoft.Extensions.Logging;
using System.Net.WebSockets;
using System.Security.Cryptography;

internal sealed partial class CloudConnector
{
    /// <inheritdoc/>
    public async Task SendBinaryAsync(string filePath, string contentType, CancellationToken cancellationToken)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File not found: {filePath}");
        }

        if (_webSocket == null || _webSocket.State != WebSocketState.Open)
        {
            throw new InvalidOperationException("WebSocket is not connected.");
        }

        _logBinarySendStarted(_logger, filePath, null);

        var fileInfo = new FileInfo(filePath);
        long totalSize = fileInfo.Length;
        string transferId = Guid.NewGuid().ToString();
        string checksum;

        // Compute checksum using static HashData
        using (var stream = File.OpenRead(filePath))
        {
            checksum = Convert.ToHexString(await SHA256.HashDataAsync(stream, cancellationToken).ConfigureAwait(false));
        }

        // Start transfer
        var startPayload = new
        {
            TransferId = transferId,
            FileName = Path.GetFileName(filePath),
            TotalSize = totalSize,
            ContentType = contentType,
            Checksum = checksum
        };

        var startMessage = new CloudMessage
        {
            MessageType = "BinaryTransferStart",
            Encrypted = true,
            Payload = startPayload
        };

        await this.SendAsync(startMessage, cancellationToken).ConfigureAwait(false);

        // Register outgoing transfer
        _transferManager.StartOutgoing(transferId, filePath, contentType, totalSize, checksum);

        int chunkSize = AppConstants.DefaultChunkSize;
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                var (offset, data) = _transferManager.GetNextChunk(transferId, chunkSize);
                if (data == null)
                {
                    // End of file
                    break;
                }

                var chunkPayload = new
                {
                    TransferId = transferId,
                    Offset = offset,
                    Data = Convert.ToBase64String(data)
                };

                var chunkMessage = new CloudMessage
                {
                    MessageType = "BinaryChunk",
                    Encrypted = true,
                    Payload = chunkPayload
                };

                await this.SendAsync(chunkMessage, cancellationToken).ConfigureAwait(false);

                // Small delay to avoid flooding
                await Task.Delay(10, cancellationToken).ConfigureAwait(false);
            }

            // Send end message
            var endPayload = new
            {
                TransferId = transferId,
                Status = "Success"
            };

            var endMessage = new CloudMessage
            {
                MessageType = "BinaryTransferEnd",
                Encrypted = true,
                Payload = endPayload
            };

            await this.SendAsync(endMessage, cancellationToken).ConfigureAwait(false);
            _transferManager.CompleteOutgoing(transferId);
            _logBinarySendCompleted(_logger, filePath, null);
        }
        catch (Exception ex)
        {
            _transferManager.CancelOutgoing(transferId);
            _logBinarySendFailed(_logger, filePath, ex);
            throw;
        }
    }
}
