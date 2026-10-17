// -----------------------------------------------------------------------------
// <copyright file="DeployExtensionHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using Engine.Communication;
using Engine.Extensions;
using Engine.Management.Commands;
using Microsoft.Extensions.Logging;

internal sealed class DeployExtensionHandler : CommandHandlerBase
{
    private readonly IExtensionManager _extensionManager;

    public DeployExtensionHandler(ICloudConnector cloudConnector, ICommandDispatcher dispatcher, IExtensionManager extensionManager, ILogger<DeployExtensionHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
        _extensionManager = extensionManager;
    }

    public override int CommandId => CommandIds.DeployExtension;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        if (command.Parameters is not Dictionary<string, object> dict ||
            !dict.TryGetValue("Name", out object? nameObj) ||
            !dict.TryGetValue("BinaryData", out object? dataObj))
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, "Missing Name or BinaryData.", cancellationToken).ConfigureAwait(false);
            return;
        }

        string name = nameObj?.ToString()!;
        byte[] data;
        if (dataObj is byte[] rawBytes)
        {
            data = rawBytes;
        }
        else if (dataObj is string base64Str)
        {
            try
            {
                data = Convert.FromBase64String(base64Str);
            }
            catch (FormatException)
            {
                await SendErrorAsync(command.CorrelationId ?? string.Empty, "BinaryData must be a valid Base64 string.", cancellationToken).ConfigureAwait(false);
                return;
            }
        }
        else if (dataObj is System.Text.Json.JsonElement elem)
        {
            if (elem.ValueKind == System.Text.Json.JsonValueKind.String)
            {
                try
                {
                    data = elem.GetBytesFromBase64();
                }
                catch (FormatException)
                {
                    await SendErrorAsync(command.CorrelationId ?? string.Empty, "BinaryData must be a valid Base64 string.", cancellationToken).ConfigureAwait(false);
                    return;
                }
            }
            else if (elem.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                data = elem.EnumerateArray().Select(e => e.GetByte()).ToArray();
            }
            else
            {
                data = [];
            }
        }
        else if (dataObj is IEnumerable<byte> byteSeq)
        {
            data = byteSeq.ToArray();
        }
        else if (dataObj is IEnumerable<object> objSeq)
        {
            data = objSeq.Select(Convert.ToByte).ToArray();
        }
        else
        {
            data = [];
        }

        try
        {
            await _extensionManager.DeployExtensionAsync(name, data, cancellationToken).ConfigureAwait(false);
            await SendSuccessAsync(command.CorrelationId ?? string.Empty, new { Name = name }, cancellationToken).ConfigureAwait(false);
        }
        catch (ArgumentException ex)
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, ex.Message, cancellationToken).ConfigureAwait(false);
        }
    }
}
