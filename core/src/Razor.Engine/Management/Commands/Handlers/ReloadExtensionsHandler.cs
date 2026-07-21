// -----------------------------------------------------------------------------
// <copyright file="ReloadExtensionsHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Razor.Engine.Management.Commands.Handlers;

using Razor.Engine.Communication;
using Razor.Engine.Extensions;
using Razor.Engine.Management.Commands;
using Microsoft.Extensions.Logging;

// ─── Extensions ──────────────────────────────────────────────────

internal sealed class ReloadExtensionsHandler : CommandHandlerBase
{
    private readonly IExtensionManager _extensionManager;
    private readonly ICloudConnector _cloudConnector;

    public ReloadExtensionsHandler(
        ICloudConnector cloudConnector,
        ICommandDispatcher dispatcher,
        IExtensionManager extensionManager,
        ILogger<ReloadExtensionsHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
        _extensionManager = extensionManager;
        _cloudConnector = cloudConnector;
    }

    public override int CommandId => CommandIds.ReloadExtensions;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        await _extensionManager.ReloadExtensionsAsync(cancellationToken).ConfigureAwait(false);

        // Send updated manifest
        var manifest = await _extensionManager.GetManifestAsync(cancellationToken).ConfigureAwait(false);
        await _cloudConnector.SendExtensionManifestAsync(manifest, cancellationToken).ConfigureAwait(false);

        await SendSuccessAsync(command.CorrelationId ?? string.Empty, new { Message = "Extensions reloaded." }, cancellationToken)
            .ConfigureAwait(false);
    }
}
