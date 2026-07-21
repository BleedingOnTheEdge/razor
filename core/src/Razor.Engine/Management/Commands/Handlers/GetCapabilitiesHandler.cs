// -----------------------------------------------------------------------------
// <copyright file="GetCapabilitiesHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Razor.Engine.Management.Commands.Handlers;

using Razor.Engine.Communication;
using Razor.Engine.Core;
using Razor.Engine.Management.Commands;
using Microsoft.Extensions.Logging;

internal sealed class GetCapabilitiesHandler : CommandHandlerBase
{
    public GetCapabilitiesHandler(ICloudConnector cloudConnector, ICommandDispatcher dispatcher, ILogger<GetCapabilitiesHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
    }

    public override int CommandId => CommandIds.GetCapabilities;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        var result = new
        {
            EngineVersion = AppConstants.EngineVersion,
            SdkVersion = AppConstants.SdkVersion,
            Capabilities = AppConstants.SupportedCapabilities
        };
        await SendSuccessAsync(command.CorrelationId ?? string.Empty, result, cancellationToken).ConfigureAwait(false);
    }
}
