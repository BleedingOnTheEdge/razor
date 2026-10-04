// -----------------------------------------------------------------------------
// <copyright file="SetCheckpointHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using System.Text.Json;
using System.Text.Json.Serialization;
using Engine.Communication;
using Engine.Management.Commands;
using Engine.Management.Tasks;
using global::Kernel.Optimization;
using Microsoft.Extensions.Logging;

/// <summary>
/// Handles the SetCheckpoint wire command (1309) to modify or restore a computation checkpoint with an audit rationale.
/// </summary>
internal sealed class SetCheckpointHandler : CommandHandlerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals,
        PropertyNameCaseInsensitive = true
    };

    private readonly ITaskManager _taskManager;

    private static readonly Action<ILogger, string, string, Exception?> _logIntervention =
        LoggerMessage.Define<string, string>(LogLevel.Warning, 0, "Applying intervention to computation {TaskId}. Reason: {Reason}");

    /// <summary>
    /// Initialises a new instance of the <see cref="SetCheckpointHandler"/> class.
    /// </summary>
    public SetCheckpointHandler(
        ICloudConnector cloudConnector,
        ICommandDispatcher dispatcher,
        ITaskManager taskManager,
        ILogger<SetCheckpointHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
        _taskManager = taskManager;
    }

    /// <inheritdoc/>
    public override int CommandId => CommandIds.SetCheckpoint;

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

        if (!dict.TryGetValue("Reason", out object? reasonObj) ||
            reasonObj is null ||
            string.IsNullOrWhiteSpace(reasonObj.ToString()))
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, "An explicit audit reason is mandatory for SetCheckpoint interventions.", cancellationToken).ConfigureAwait(false);
            return;
        }

        string reason = reasonObj.ToString()!.Trim();

        ComputationCheckpoint? checkpoint = null;
        if (dict.TryGetValue("Checkpoint", out object? cpObj) && cpObj is not null)
        {
            if (cpObj is ComputationCheckpoint parsedCp)
            {
                checkpoint = parsedCp;
            }
            else if (cpObj is JsonElement je)
            {
                checkpoint = JsonSerializer.Deserialize<ComputationCheckpoint>(je.GetRawText(), JsonOptions);
            }
            else if (cpObj is string jsonStr)
            {
                checkpoint = JsonSerializer.Deserialize<ComputationCheckpoint>(jsonStr, JsonOptions);
            }
        }
        else if (dict.TryGetValue("State", out object? stObj) && stObj is not null)
        {
            GeneticOptimizerState? state = null;
            if (stObj is GeneticOptimizerState parsedState)
            {
                state = parsedState;
            }
            else if (stObj is JsonElement je)
            {
                state = JsonSerializer.Deserialize<GeneticOptimizerState>(je.GetRawText(), JsonOptions);
            }
            else if (stObj is string jsonStr)
            {
                state = JsonSerializer.Deserialize<GeneticOptimizerState>(jsonStr, JsonOptions);
            }

            if (state != null)
            {
                checkpoint = new ComputationCheckpoint
                {
                    ComputationId = taskId,
                    StepIndex = state.CurrentGeneration,
                    Fingerprint = CheckpointFingerprint.Compute(state),
                    ParentFingerprint = null,
                    State = state,
                    Diverged = true,
                    Interventions = Array.Empty<InterventionRecord>()
                };
            }
        }

        if (checkpoint == null)
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, "Missing or invalid Checkpoint/State parameter.", cancellationToken).ConfigureAwait(false);
            return;
        }

        _logIntervention(Logger, taskId, reason, null);

        try
        {
            var updatedCheckpoint = await _taskManager.SetCheckpointAsync(taskId, checkpoint, reason, cancellationToken).ConfigureAwait(false);
            await SendSuccessAsync(
                command.CorrelationId ?? string.Empty,
                new
                {
                    TaskId = taskId,
                    StepIndex = updatedCheckpoint.StepIndex,
                    Fingerprint = updatedCheckpoint.Fingerprint,
                    ParentFingerprint = updatedCheckpoint.ParentFingerprint,
                    Diverged = updatedCheckpoint.Diverged,
                    Checkpoint = updatedCheckpoint
                },
                cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(command.CorrelationId ?? string.Empty, ex.Message, cancellationToken).ConfigureAwait(false);
        }
    }
}
