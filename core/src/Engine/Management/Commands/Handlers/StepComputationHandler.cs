// -----------------------------------------------------------------------------
// <copyright file="StepComputationHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using System.Text.Json;
using Engine.Communication;
using Engine.Management.Commands;
using Engine.Management.Tasks;
using Microsoft.Extensions.Logging;

/// <summary>
/// Handles the StepComputation wire command (1307) to advance an optimization task by N generations.
/// </summary>
internal sealed class StepComputationHandler : CommandHandlerBase
{
    private readonly ITaskManager _taskManager;

    private static readonly Action<ILogger, string, int, Exception?> _logStepping =
        LoggerMessage.Define<string, int>(LogLevel.Information, 0, "Stepping computation {TaskId} by {Generations} generations.");

    /// <summary>
    /// Initialises a new instance of the <see cref="StepComputationHandler"/> class.
    /// </summary>
    public StepComputationHandler(
        ICloudConnector cloudConnector,
        ICommandDispatcher dispatcher,
        ITaskManager taskManager,
        ILogger<StepComputationHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
        _taskManager = taskManager;
    }

    /// <inheritdoc/>
    public override int CommandId => CommandIds.StepComputation;

    /// <inheritdoc/>
    public override async Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        if (command.Parameters is not Dictionary<string, object> dict ||
            !dict.TryGetValue("TaskId", out object? taskIdObj) ||
            taskIdObj is null)
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, "Missing TaskId parameter.", cancellationToken).ConfigureAwait(false);
            return;
        }

        string taskId = taskIdObj.ToString()!;
        int generations = 1;

        if (dict.TryGetValue("Generations", out object? genObj))
        {
            if (genObj is int i)
            {
                generations = i;
            }
            else if (genObj is long l)
            {
                generations = (int)l;
            }
            else if (genObj is JsonElement je && je.TryGetInt32(out int parsedInt))
            {
                generations = parsedInt;
            }
            else if (int.TryParse(genObj.ToString(), out int parsed))
            {
                generations = parsed;
            }
        }

        if (generations <= 0)
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, "Generations must be greater than zero.", cancellationToken).ConfigureAwait(false);
            return;
        }

        _logStepping(Logger, taskId, generations, null);

        try
        {
            var checkpoint = await _taskManager.StepComputationAsync(taskId, generations, cancellationToken).ConfigureAwait(false);
            await SendSuccessAsync(
                command.CorrelationId ?? string.Empty,
                new
                {
                    TaskId = taskId,
                    StepIndex = checkpoint.StepIndex,
                    Fingerprint = checkpoint.Fingerprint,
                    ParentFingerprint = checkpoint.ParentFingerprint,
                    Diverged = checkpoint.Diverged,
                    Checkpoint = checkpoint
                },
                cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, ex.Message, cancellationToken).ConfigureAwait(false);
        }
    }
}
