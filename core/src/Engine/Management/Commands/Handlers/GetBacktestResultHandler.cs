// -----------------------------------------------------------------------------
// <copyright file="GetBacktestResultHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using Engine.Communication;
using Engine.Management.Commands;
using Engine.Management.Tasks;
using Microsoft.Extensions.Logging;

internal sealed class GetBacktestResultHandler : CommandHandlerBase
{
    private readonly ITaskManager _taskManager;

    public GetBacktestResultHandler(ICloudConnector cloudConnector, ICommandDispatcher dispatcher, ITaskManager taskManager, ILogger<GetBacktestResultHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
        _taskManager = taskManager;
    }

    public override int CommandId => CommandIds.GetBacktestResult;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        if (command.Parameters is not Dictionary<string, object> dict || !dict.TryGetValue("TaskId", out object? idObj))
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, "Missing TaskId.", cancellationToken).ConfigureAwait(false);
            return;
        }

        string taskId = idObj?.ToString()!;

        // The task's state and its result are different answers, and this handler used to return the
        // state for both -- so a caller asking for a result received metadata and never the run's
        // outcome. Report the result when there is one, and say plainly when there is not yet.
        object? result = await _taskManager.GetTaskResultAsync(taskId, cancellationToken).ConfigureAwait(false);
        object state = await _taskManager.GetTaskStateAsync(taskId, cancellationToken).ConfigureAwait(false);

        if (result is null)
        {
            await SendSuccessAsync(
                command.CorrelationId ?? string.Empty,
                new { TaskId = taskId, State = state, Result = (object?)null, IsComplete = false },
                cancellationToken).ConfigureAwait(false);
            return;
        }

        await SendSuccessAsync(
            command.CorrelationId ?? string.Empty,
            new { TaskId = taskId, State = state, Result = result, IsComplete = true },
            cancellationToken).ConfigureAwait(false);
    }
}
