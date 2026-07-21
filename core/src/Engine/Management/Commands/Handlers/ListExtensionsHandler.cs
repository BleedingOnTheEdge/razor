// -----------------------------------------------------------------------------
// <copyright file="ListExtensionsHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using Engine.Communication;
using Engine.Extensions;
using Engine.Management.Commands;
using Microsoft.Extensions.Logging;

internal sealed class ListExtensionsHandler : CommandHandlerBase
{
    private readonly IExtensionManager _extensionManager;

    public ListExtensionsHandler(ICloudConnector cloudConnector, ICommandDispatcher dispatcher, IExtensionManager extensionManager, ILogger<ListExtensionsHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
        _extensionManager = extensionManager;
    }

    public override int CommandId => CommandIds.ListExtensions;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        object manifest = await _extensionManager.GetManifestAsync(cancellationToken).ConfigureAwait(false);
        await SendSuccessAsync(command.CorrelationId ?? string.Empty, manifest, cancellationToken).ConfigureAwait(false);
    }
}
