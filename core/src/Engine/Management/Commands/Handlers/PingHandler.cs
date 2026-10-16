// -----------------------------------------------------------------------------
// <copyright file="PingHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using Engine.Communication;
using Engine.Core;
using Engine.Management.Commands;
using Microsoft.Extensions.Logging;

internal sealed class PingHandler : CommandHandlerBase
{
    public const int Id = 1001;

    public PingHandler(ICloudConnector cloudConnector, ICommandDispatcher dispatcher, ILogger<PingHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
    }

    public override int CommandId => Id;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        var result = new
        {
            Pong = true,
            EngineVersion = AppConstants.EngineVersion,
            Timestamp = DateTimeOffset.UtcNow,
            SessionId = CloudConnector.SessionId
        };
        await SendSuccessAsync(command.CorrelationId ?? string.Empty, result, cancellationToken).ConfigureAwait(false);
    }
}
