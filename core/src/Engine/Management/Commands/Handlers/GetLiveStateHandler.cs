// -----------------------------------------------------------------------------
// <copyright file="GetLiveStateHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using Engine.Communication;
using Engine.Management.Commands;
using Engine.Management.Tasks;
using Microsoft.Extensions.Logging;

internal sealed class GetLiveStateHandler : CommandHandlerBase
{
    private readonly ITaskManager _taskManager;

    public GetLiveStateHandler(ICloudConnector cloudConnector, ICommandDispatcher dispatcher, ITaskManager taskManager, ILogger<GetLiveStateHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
        _taskManager = taskManager;
    }

    public override int CommandId => CommandIds.GetLiveState;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        string? taskId = TryGetParameterString(command.Parameters, "TaskId");
        if (string.IsNullOrWhiteSpace(taskId))
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, "Missing TaskId.", cancellationToken).ConfigureAwait(false);
            return;
        }

        object state = await _taskManager.GetLiveStateAsync(taskId, cancellationToken).ConfigureAwait(false);
        await SendSuccessAsync(command.CorrelationId ?? string.Empty, state, cancellationToken).ConfigureAwait(false);
    }
}
