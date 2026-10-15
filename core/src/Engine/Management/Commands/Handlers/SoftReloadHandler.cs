// -----------------------------------------------------------------------------
// <copyright file="SoftReloadHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using Engine.Communication;
using Engine.Core;
using Engine.Extensions;
using Engine.Management.Commands;
using Microsoft.Extensions.Logging;

internal sealed class SoftReloadHandler : CommandHandlerBase
{
    public const int Id = 1002;
    private readonly IExtensionManager _extensionManager;

    public SoftReloadHandler(
        ICloudConnector cloudConnector,
        ICommandDispatcher dispatcher,
        IExtensionManager extensionManager,
        ILogger<SoftReloadHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
        _extensionManager = extensionManager;
    }

    public override int CommandId => Id;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        await _extensionManager.DiscoverExtensionsAsync(cancellationToken).ConfigureAwait(false);
        var manifest = await _extensionManager.GetManifestAsync(cancellationToken).ConfigureAwait(false);
        await CloudConnector.SendExtensionManifestAsync(manifest, cancellationToken).ConfigureAwait(false);

        var result = new
        {
            Reloaded = true,
            Timestamp = DateTimeOffset.UtcNow,
            Message = "Extensions soft-reloaded successfully."
        };
        await SendSuccessAsync(command.CorrelationId ?? string.Empty, result, cancellationToken).ConfigureAwait(false);
    }
}
