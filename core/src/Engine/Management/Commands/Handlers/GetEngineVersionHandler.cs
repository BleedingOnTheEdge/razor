// -----------------------------------------------------------------------------
// <copyright file="GetEngineVersionHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using Engine.Communication;
using Engine.Core;
using Engine.Management.Commands;
using Microsoft.Extensions.Logging;

internal sealed class GetEngineVersionHandler : CommandHandlerBase
{
    public GetEngineVersionHandler(ICloudConnector cloudConnector, ICommandDispatcher dispatcher, ILogger<GetEngineVersionHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
    }

    public override int CommandId => CommandIds.GetEngineVersion;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        await SendSuccessAsync(command.CorrelationId ?? string.Empty, new { Version = AppConstants.EngineVersion }, cancellationToken).ConfigureAwait(false);
    }
}
