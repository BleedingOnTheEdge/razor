using Engine.Core;

namespace Engine.Management.Tasks;

/// <summary>Task states.</summary>
internal enum TaskState
{
    /// <summary>Task is initialising.</summary>
    Initializing,
    /// <summary>Task is running.</summary>
    Running,
    /// <summary>Task is paused.</summary>
    Paused,
    /// <summary>Task has completed successfully.</summary>
    Completed,
    /// <summary>Task was cancelled.</summary>
    Canceled,
    /// <summary>Task faulted with an error.</summary>
    Faulted
}

/// <summary>Manages all engine tasks.</summary>
internal interface ITaskManager
{
    /// <summary>Gets all currently running tasks.</summary>
    IReadOnlyList<EngineTaskBase> RunningTasks { get; }
    /// <summary>Gets all tasks (including completed).</summary>
    IReadOnlyList<EngineTaskBase> AllTasks { get; }

    /// <summary>Gets a task by its ID.</summary>
    EngineTaskBase? GetTask(string taskId);

    /// <summary>Starts a live trading task.</summary>
    Task<string> StartLiveTaskAsync(object config, CancellationToken cancellationToken);
    /// <summary>Stops a live trading task.</summary>
    Task StopLiveTaskAsync(string taskId, CancellationToken cancellationToken);

    /// <summary>Starts a backtest task.</summary>
    Task<string> StartBacktestTaskAsync(object input, CancellationToken cancellationToken);
    /// <summary>Cancels a backtest task.</summary>
    Task CancelBacktestTaskAsync(string taskId, CancellationToken cancellationToken);

    /// <summary>Starts an optimisation task.</summary>
    Task<string> StartOptimizationTaskAsync(object config, CancellationToken cancellationToken);
    /// <summary>Cancels an optimisation task.</summary>
    Task CancelOptimizationTaskAsync(string taskId, CancellationToken cancellationToken);

    /// <summary>Advances the optimization task by the specified number of generations.</summary>
    Task<global::Kernel.Optimization.ComputationCheckpoint> StepComputationAsync(string taskId, int generations, CancellationToken cancellationToken);

    /// <summary>Gets the current computation checkpoint of an optimization task.</summary>
    Task<global::Kernel.Optimization.ComputationCheckpoint> GetCheckpointAsync(string taskId, CancellationToken cancellationToken);

    /// <summary>Updates or overrides the computation checkpoint of an optimization task with an audit rationale.</summary>
    Task<global::Kernel.Optimization.ComputationCheckpoint> SetCheckpointAsync(string taskId, global::Kernel.Optimization.ComputationCheckpoint checkpoint, string? reason, CancellationToken cancellationToken);

    /// <summary>Restores an optimization task from persisted state.</summary>
    Task<string?> RestoreOptimizationTaskAsync(OptimizationState state, CancellationToken cancellationToken);

    /// <summary>Pauses a task.</summary>
    Task PauseTaskAsync(string taskId, CancellationToken cancellationToken);
    /// <summary>Resumes a task.</summary>
    Task ResumeTaskAsync(string taskId, CancellationToken cancellationToken);

    /// <summary>Gets the state of a task.</summary>
    Task<object> GetTaskStateAsync(string taskId, CancellationToken cancellationToken);

    /// <summary>
    /// Gets the result of a task, or <c>null</c> if it has not produced one yet.
    /// </summary>
    /// <remarks>
    /// Distinct from <see cref="GetTaskStateAsync"/> on purpose: state describes progress, the
    /// result is the outcome. Callers that asked for a result used to receive the state, so the
    /// task's actual output was never reachable. Null means "not finished", which is a different
    /// answer from "finished with nothing".
    /// </remarks>
    Task<object?> GetTaskResultAsync(string taskId, CancellationToken cancellationToken);

    /// <summary>Gets the result of an optimisation task, or <c>null</c> if it has not produced one yet.</summary>
    Task<object?> GetOptimizationResultAsync(string taskId, CancellationToken cancellationToken);

    /// <summary>Stops all tasks.</summary>
    Task StopAllTasksAsync(CancellationToken cancellationToken);
    /// <summary>Stops all user tasks (Live, Backtest, Optimisation).</summary>
    Task StopAllUserTasksAsync(CancellationToken cancellationToken);

    /// <summary>Injects genes into a live task.</summary>
    Task InjectGenesAsync(string taskId, double[] genes, CancellationToken cancellationToken);

    /// <summary>Gets the live state of a live task.</summary>
    Task<object> GetLiveStateAsync(string taskId, CancellationToken cancellationToken);

    /// <summary>Stops all live trading tasks gracefully.</summary>
    Task StopAllLiveTasksAsync(CancellationToken cancellationToken);

    /// <summary>Gets the timestamp of the last tick received by the live task, if any.</summary>
    DateTime? GetLastLiveTickTimestamp();

    /// <summary>Restores a live task from persisted state.</summary>
    /// <param name="state">The persisted live state.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The task ID if restoration succeeded, otherwise <c>null</c>.</returns>
    Task<string?> RestoreLiveTaskAsync(LiveState state, CancellationToken cancellationToken);
}
