// -----------------------------------------------------------------------------
// <copyright file="SetLiveConfigHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using Engine.Communication;
using Engine.Core;
using Engine.Management.Commands;
using Engine.Management.Tasks;
using Microsoft.Extensions.Logging;

/// <summary>Handler for updating live trading configuration.</summary>
internal sealed class SetLiveConfigHandler : CommandHandlerBase
{
    private readonly ITaskManager _taskManager;
    private readonly ConfigStore _configStore;

    private static readonly Action<ILogger, string, Exception?> _logLiveConfigUpdated =
        LoggerMessage.Define<string>(LogLevel.Information, 0, "Live config updated for task {TaskId}.");

    public SetLiveConfigHandler(
        ICloudConnector cloudConnector,
        ICommandDispatcher dispatcher,
        ITaskManager taskManager,
        ConfigStore configStore,
        ILogger<SetLiveConfigHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
        _taskManager = taskManager;
        _configStore = configStore;
    }

    public override int CommandId => CommandIds.SetLiveConfig;

    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        string? taskId = TryGetParameterString(command.Parameters, "TaskId");
        if (string.IsNullOrWhiteSpace(taskId))
        {
            var runningLive = _taskManager.RunningTasks.FirstOrDefault(t => t.TaskType == "Live");
            if (runningLive != null)
            {
                taskId = runningLive.TaskId;
            }
        }

        if (string.IsNullOrWhiteSpace(taskId))
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, "Missing TaskId.", cancellationToken)
                .ConfigureAwait(false);
            return;
        }

        _logLiveConfigUpdated(Logger, taskId, null);

        var task = _taskManager.GetTask(taskId);
        if (task is not LiveTask liveTask)
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, $"Task {taskId} is not a live task.", cancellationToken)
                .ConfigureAwait(false);
            return;
        }

        var updatedConfig = new Dictionary<string, object>();

        string? stopOutStr = TryGetParameterString(command.Parameters, "StopOutLevel")
            ?? TryGetParameterString(command.Parameters, "MaxDailyDrawdownPct");
        if (stopOutStr != null && double.TryParse(stopOutStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double stopOut))
        {
            _configStore.Set($"Live_{taskId}_StopOutLevel", stopOut);
            updatedConfig["StopOutLevel"] = stopOut;
        }

        string? maxPosStr = TryGetParameterString(command.Parameters, "MaxOpenPositions")
            ?? TryGetParameterString(command.Parameters, "MaxConcurrentPositions");
        if (maxPosStr != null && int.TryParse(maxPosStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out int maxPos))
        {
            _configStore.Set($"Live_{taskId}_MaxOpenPositions", maxPos);
            updatedConfig["MaxOpenPositions"] = maxPos;
        }

        string? lossCapStr = TryGetParameterString(command.Parameters, "PerTradeLossCap");
        if (lossCapStr != null && double.TryParse(lossCapStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double lossCap))
        {
            _configStore.Set($"Live_{taskId}_PerTradeLossCap", lossCap);
            updatedConfig["PerTradeLossCap"] = lossCap;
        }

        await SendSuccessAsync(command.CorrelationId ?? string.Empty, new { TaskId = taskId, UpdatedConfig = updatedConfig }, cancellationToken)
            .ConfigureAwait(false);
    }
}
