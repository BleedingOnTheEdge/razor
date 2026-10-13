// -----------------------------------------------------------------------------
// <copyright file="GetCheckpointHandler.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Commands.Handlers;

using Engine.Communication;
using Engine.Management.Commands;
using Engine.Management.Tasks;
using Microsoft.Extensions.Logging;

/// <summary>
/// Handles the GetCheckpoint wire command (1308) to retrieve the active computation checkpoint.
/// </summary>
internal sealed class GetCheckpointHandler : CommandHandlerBase
{
    private readonly ITaskManager _taskManager;

    /// <summary>
    /// Initialises a new instance of the <see cref="GetCheckpointHandler"/> class.
    /// </summary>
    public GetCheckpointHandler(
        ICloudConnector cloudConnector,
        ICommandDispatcher dispatcher,
        ITaskManager taskManager,
        ILogger<GetCheckpointHandler> logger)
        : base(cloudConnector, dispatcher, logger)
    {
        _taskManager = taskManager;
    }

    /// <inheritdoc/>
    public override int CommandId => CommandIds.GetCheckpoint;

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

        try
        {
            var checkpoint = await _taskManager.GetCheckpointAsync(taskId, cancellationToken).ConfigureAwait(false);
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
