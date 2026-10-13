// -----------------------------------------------------------------------------
// <copyright file="TaskManager.Checkpoints.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Tasks;

using Engine.Core;
using Engine.Core.Exceptions;
using global::Kernel.Optimization;

internal sealed partial class TaskManager
{
    /// <inheritdoc/>
    public async Task<ComputationCheckpoint> StepComputationAsync(string taskId, int generations, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_tasks.TryGetValue(taskId, out var task) && task is OptimizationTask optTask)
            {
                var cp = await optTask.StepAsync(generations, cancellationToken).ConfigureAwait(false);

                var optState = new OptimizationState
                {
                    TaskId = taskId,
                    Config = optTask.Config,
                    OptimizerState = cp.State,
                    Population = cp.State.Population,
                    CurrentGeneration = cp.StepIndex,
                    BestFitness = cp.State.BestOverallFitness,
                    StartTime = optTask.StartTime,
                    CheckpointFingerprint = cp.Fingerprint,
                    ParentCheckpointFingerprint = cp.ParentFingerprint,
                    Diverged = cp.Diverged,
                    Interventions = cp.Interventions
                };
                await _stateManager.SaveOptimizationStateAsync(taskId, optState, cancellationToken).ConfigureAwait(false);
                return cp;
            }

            throw new EngineException($"Optimization task {taskId} not found.");
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task<ComputationCheckpoint> GetCheckpointAsync(string taskId, CancellationToken cancellationToken)
    {
        if (_tasks.TryGetValue(taskId, out var task) && task is OptimizationTask optTask)
        {
            return await optTask.GetCheckpointAsync(cancellationToken).ConfigureAwait(false);
        }

        var persistedState = await _stateManager.LoadOptimizationStateAsync(taskId, cancellationToken).ConfigureAwait(false);
        if (persistedState?.OptimizerState != null)
        {
            return new ComputationCheckpoint
            {
                ComputationId = taskId,
                StepIndex = persistedState.CurrentGeneration,
                Fingerprint = persistedState.CheckpointFingerprint ?? CheckpointFingerprint.Compute(persistedState.OptimizerState),
                ParentFingerprint = persistedState.ParentCheckpointFingerprint,
                State = persistedState.OptimizerState,
                Diverged = persistedState.Diverged,
                Interventions = persistedState.Interventions
            };
        }

        throw new EngineException($"Optimization task {taskId} not found.");
    }

    /// <inheritdoc/>
    public async Task<ComputationCheckpoint> SetCheckpointAsync(string taskId, ComputationCheckpoint checkpoint, string? reason, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_tasks.TryGetValue(taskId, out var task) && task is OptimizationTask optTask)
            {
                var updatedCp = await optTask.SetCheckpointAsync(checkpoint, reason, cancellationToken).ConfigureAwait(false);

                var optState = new OptimizationState
                {
                    TaskId = taskId,
                    Config = optTask.Config,
                    OptimizerState = updatedCp.State,
                    Population = updatedCp.State.Population,
                    CurrentGeneration = updatedCp.StepIndex,
                    BestFitness = updatedCp.State.BestOverallFitness,
                    StartTime = optTask.StartTime,
                    CheckpointFingerprint = updatedCp.Fingerprint,
                    ParentCheckpointFingerprint = updatedCp.ParentFingerprint,
                    Diverged = updatedCp.Diverged,
                    Interventions = updatedCp.Interventions
                };
                await _stateManager.SaveOptimizationStateAsync(taskId, optState, cancellationToken).ConfigureAwait(false);
                return updatedCp;
            }

            throw new EngineException($"Optimization task {taskId} not found.");
        }
        finally
        {
            _lock.Release();
        }
    }
}
