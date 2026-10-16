// -----------------------------------------------------------------------------
// <copyright file="GetLiveMetricsHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using Engine.Communication;
using Engine.Core;
using Engine.Management.Commands;
using Engine.Management.Tasks;
using Microsoft.Extensions.Logging;

/// <summary>Handler for retrieving live performance metrics.</summary>
internal sealed class GetLiveMetricsHandler : CommandHandlerBase
{
    private readonly ITaskManager _taskManager;
    private readonly IEngineTelemetry _telemetry;

    public GetLiveMetricsHandler(
        ICloudConnector cloudConnector,
        ICommandDispatcher dispatcher,
        ITaskManager taskManager,
        IEngineTelemetry telemetry,
        ILogger<GetLiveMetricsHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
        _taskManager = taskManager;
        _telemetry = telemetry;
    }

    public override int CommandId => CommandIds.GetLiveMetrics;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        var telemetrySnapshot = _telemetry.GetMetricsSnapshot();

        if (command.Parameters is not Dictionary<string, object> dict ||
            !dict.TryGetValue("TaskId", out object? idObj) ||
            string.IsNullOrWhiteSpace(idObj?.ToString()))
        {
            var generalMetrics = new
            {
                Telemetry = telemetrySnapshot,
                RunningTasks = _taskManager.RunningTasks.Select(t => new { t.TaskId, t.TaskType, State = t.State.ToString() }).ToList(),
                LastTickTime = _taskManager.GetLastLiveTickTimestamp(),
                Timestamp = DateTime.UtcNow
            };

            await SendSuccessAsync(command.CorrelationId ?? string.Empty, generalMetrics, cancellationToken)
                .ConfigureAwait(false);
            return;
        }

        string taskId = idObj.ToString()!;
        var task = _taskManager.GetTask(taskId);

        if (task is LiveTask liveTask)
        {
            var state = await _taskManager.GetLiveStateAsync(taskId, cancellationToken).ConfigureAwait(false);
            var metrics = new
            {
                TaskId = taskId,
                State = state,
                Telemetry = telemetrySnapshot,
                LastTickTime = liveTask.LastTickTime,
                StartTime = liveTask.StartTime,
                Uptime = DateTime.UtcNow - liveTask.StartTime
            };
            await SendSuccessAsync(command.CorrelationId ?? string.Empty, metrics, cancellationToken)
                .ConfigureAwait(false);
            return;
        }

        if (task is not null)
        {
            var taskMetrics = new
            {
                TaskId = taskId,
                TaskType = task.TaskType,
                State = task.State.ToString(),
                Telemetry = telemetrySnapshot,
                StartTime = task.StartTime,
                EndTime = task.EndTime
            };
            await SendSuccessAsync(command.CorrelationId ?? string.Empty, taskMetrics, cancellationToken)
                .ConfigureAwait(false);
            return;
        }

        await SendSuccessAsync(
            command.CorrelationId ?? string.Empty,
            new { TaskId = taskId, State = "NotFound", Telemetry = telemetrySnapshot },
            cancellationToken).ConfigureAwait(false);
    }
}
