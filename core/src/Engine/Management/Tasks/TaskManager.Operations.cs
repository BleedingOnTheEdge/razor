// -----------------------------------------------------------------------------
// <copyright file="TaskManager.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------
using Engine.Core;
using Engine.Core.Exceptions;
using Engine.Extensions;
using Engine.Kernel;
using global::Kernel.Optimization;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Text.Json;
using LiveState = Engine.Core.LiveState;

namespace Engine.Management.Tasks;

internal sealed partial class TaskManager
{
    public async Task CancelOptimizationTaskAsync(string taskId, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_tasks.TryRemove(taskId, out var task))
            {
                await task.CancellationTokenSource.CancelAsync().ConfigureAwait(false);
                task.State = TaskState.Canceled;
                task.Dispose(); // THR‑05: Dispose CTS.
                // No explicit kernel cancel for optimisation (stub)
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task PauseTaskAsync(string taskId, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_tasks.TryGetValue(taskId, out var task))
            {
                await task.PauseAsync(cancellationToken).ConfigureAwait(false);
                if (task is LiveTask liveTask)
                {
                    await _kernelService.PauseLiveAsync(liveTask.KernelTaskId, cancellationToken).ConfigureAwait(false);
                }
                else if (task is OptimizationTask optTask)
                {
                    await _kernelService.PauseOptimizationAsync(optTask.KernelTaskId, cancellationToken).ConfigureAwait(false);
                }
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task ResumeTaskAsync(string taskId, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_tasks.TryGetValue(taskId, out var task))
            {
                await task.ResumeAsync(cancellationToken).ConfigureAwait(false);
                if (task is LiveTask liveTask)
                {
                    await _kernelService.ResumeLiveAsync(liveTask.KernelTaskId, cancellationToken).ConfigureAwait(false);
                }
                else if (task is OptimizationTask optTask)
                {
                    await _kernelService.ResumeOptimizationAsync(optTask.KernelTaskId, cancellationToken).ConfigureAwait(false);
                }
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task<object> GetTaskStateAsync(string taskId, CancellationToken cancellationToken)
    {
        if (_tasks.TryGetValue(taskId, out var task))
        {
            return await task.GetStateAsync(cancellationToken).ConfigureAwait(false);
        }

        throw new EngineException($"Task {taskId} not found.");
    }

    /// <inheritdoc/>
    public async Task<object?> GetTaskResultAsync(string taskId, CancellationToken cancellationToken)
    {
        if (!_tasks.TryGetValue(taskId, out var task))
        {
            throw new EngineException($"Task {taskId} not found.");
        }

        // A task that has not finished has no result to give, and returning an empty one would be
        // indistinguishable from a real outcome -- the caller cannot tell "still running" from
        // "ran and produced nothing".
        if (task.State != TaskState.Completed)
        {
            return null;
        }

        return await task.GetResultAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public async Task<object?> GetOptimizationResultAsync(string taskId, CancellationToken cancellationToken)
    {
        if (_tasks.TryGetValue(taskId, out var task) && task is OptimizationTask optTask)
        {
            return await optTask.GetResultAsync(cancellationToken).ConfigureAwait(false);
        }

        throw new EngineException($"Optimization task {taskId} not found.");
    }

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

    /// <inheritdoc/>
    public async Task<string?> RestoreOptimizationTaskAsync(OptimizationState state, CancellationToken cancellationToken)
    {
        if (state == null)
        {
            return null;
        }

        if (_tasks.ContainsKey(state.TaskId))
        {
            return state.TaskId;
        }

        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            Dictionary<string, object>? dict = null;
            if (state.Config is Dictionary<string, object> d)
            {
                dict = d;
            }
            else if (state.Config is JsonElement je && je.ValueKind == JsonValueKind.Object)
            {
                dict = JsonSerializer.Deserialize<Dictionary<string, object>>(je.GetRawText());
            }

            if (dict == null)
            {
                return null;
            }

            var optInput = new OptimizationInput
            {
                AdapterName = GetString(dict, "AdapterName"),
                StrategyName = GetString(dict, "StrategyName"),
                StrategyConfig = state.Config,
                Leverage = GetDouble(dict, "Leverage", 100),
                InitialBalance = GetDouble(dict, "InitialBalance", 10000),
                Symbols = GetStringArray(dict, "Symbols", ["EURUSD"]),
                MasterSeed = GetInt(dict, "MasterSeed", 42),
                Generations = GetInt(dict, "Generations", 10),
                PopulationSize = GetInt(dict, "PopulationSize", 50),
                MutationRate = GetDouble(dict, "MutationRate", 0.1),
                CrossoverRate = GetDouble(dict, "CrossoverRate", 0.5),
                ElitismPct = GetDouble(dict, "ElitismPct", 0.05),
                TournamentSize = GetInt(dict, "TournamentSize", 3),
                StagnationGenerationsBeforeHyper = GetInt(dict, "StagnationGenerationsBeforeHyper", 3),
                MaxParallelThreads = GetInt(dict, "MaxParallelThreads", 0),
                NeuralNetworkName = GetString(dict, "NeuralNetworkName", string.Empty),
                StartDate = GetDateTime(dict, "StartDate", DateTime.UtcNow.AddDays(-30)),
                EndDate = GetDateTime(dict, "EndDate", DateTime.UtcNow),
                Timeframes = GetStringArray(dict, "Timeframes", ["M1"]),
                AccountCurrency = GetString(dict, "AccountCurrency", "USD"),
                IsSteppable = true,
                InitialState = state.OptimizerState
            };

            var adapter = _extensionManager.ActiveAdapter
                ?? throw new InvalidOperationException("No active adapter found.");
            var strategy = _extensionManager.ActiveStrategy
                ?? throw new InvalidOperationException("No active strategy found.");

            string kernelTaskId = await _kernelService.StartOptimizationAsync(optInput, cancellationToken).ConfigureAwait(false);

            var task = new OptimizationTask(
                state.TaskId,
                state.Config,
                _loggerFactory.CreateLogger<OptimizationTask>(),
                this,
                _kernelService,
                kernelTaskId,
                isSteppable: true,
                initialFingerprint: state.CheckpointFingerprint,
                diverged: state.Diverged,
                existingInterventions: state.Interventions);

            _tasks[state.TaskId] = task;
            _ = Task.Run(() => ExecuteTaskAsync(task, cancellationToken), cancellationToken);

            return state.TaskId;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task StopAllTasksAsync(CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            foreach (var task in _tasks.Values)
            {
                await task.CancellationTokenSource.CancelAsync().ConfigureAwait(false);
                task.State = TaskState.Canceled;
                task.Dispose(); // THR‑05: Dispose CTS.
                // Cancel kernel sessions
                if (task is LiveTask lt)
                {
                    await _kernelService.StopLiveAsync(lt.KernelTaskId, cancellationToken).ConfigureAwait(false);
                }
            }

            // Wait for live threads to finish
            foreach (var kv in _liveThreads)
            {
                if (kv.Value.IsAlive)
                {
                    kv.Value.Join(TimeSpan.FromSeconds(5));
                }
            }
            _liveThreads.Clear();
            _tasks.Clear();
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task StopAllUserTasksAsync(CancellationToken cancellationToken)
    {
        var userTypes = new[] { "Live", "Backtest", "Optimization" };
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            foreach (var kv in _tasks.Where(kv => userTypes.Contains(kv.Value.TaskType)).ToList())
            {
                await kv.Value.CancellationTokenSource.CancelAsync().ConfigureAwait(false);
                kv.Value.State = TaskState.Canceled;
                kv.Value.Dispose(); // THR‑05: Dispose CTS.
                if (kv.Value is LiveTask lt)
                {
                    await _kernelService.StopLiveAsync(lt.KernelTaskId, cancellationToken).ConfigureAwait(false);
                }

                _tasks.TryRemove(kv.Key, out _);
                if (_liveThreads.TryRemove(kv.Key, out var thread))
                {
                    if (thread.IsAlive)
                    {
                        thread.Join(TimeSpan.FromSeconds(5));
                    }
                }
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task StopAllLiveTasksAsync(CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var liveTasks = _tasks.Where(kv => kv.Value.TaskType == "Live").ToList();
            foreach (var kv in liveTasks)
            {
                await kv.Value.CancellationTokenSource.CancelAsync().ConfigureAwait(false);
                kv.Value.State = TaskState.Canceled;
                kv.Value.Dispose(); // THR‑05: Dispose CTS.
                if (kv.Value is LiveTask lt)
                {
                    await _kernelService.StopLiveAsync(lt.KernelTaskId, cancellationToken).ConfigureAwait(false);
                }

                _tasks.TryRemove(kv.Key, out _);
                if (_liveThreads.TryRemove(kv.Key, out var thread))
                {
                    if (thread.IsAlive)
                    {
                        thread.Join(TimeSpan.FromSeconds(5));
                    }
                }
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task InjectGenesAsync(string taskId, double[] genes, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_tasks.TryGetValue(taskId, out var task) && task is LiveTask liveTask)
            {
                await liveTask.InjectGenesAsync(genes, cancellationToken).ConfigureAwait(false);
                await _kernelService.InjectGenesAsync(liveTask.KernelTaskId, genes, cancellationToken).ConfigureAwait(false);

                // Persist updated genes – load existing state, update genes, and save
                var currentState = await _stateManager.LoadLiveStateAsync(cancellationToken).ConfigureAwait(false);
                if (currentState != null)
                {
                    var updatedState = currentState with
                    {
                        Genes = genes,
                        LastTickTime = liveTask.LastTickTime
                    };
                    await _stateManager.SaveLiveStateAsync(updatedState, cancellationToken).ConfigureAwait(false);
                }
                else
                {
                    // Fallback: create a minimal state
                    var state = new LiveState
                    {
                        TaskId = liveTask.TaskId,
                        Config = liveTask.Config,
                        Genes = genes,
                        LastTickTime = liveTask.LastTickTime,
                        StartTime = liveTask.StartTime,
                        StrategyName = liveTask.StrategyName,
                        AdapterName = liveTask.AdapterName,
                        AccountCurrency = "USD"
                    };
                    await _stateManager.SaveLiveStateAsync(state, cancellationToken).ConfigureAwait(false);
                }
            }
            else
            {
                throw new EngineException($"Live task {taskId} not found.");
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task<object> GetLiveStateAsync(string taskId, CancellationToken cancellationToken)
    {
        if (_tasks.TryGetValue(taskId, out var task) && task is LiveTask liveTask)
        {
            return await liveTask.GetLiveStateAsync(cancellationToken).ConfigureAwait(false);
        }

        throw new EngineException($"Live task {taskId} not found.");
    }

    /// <summary>Executes a task and handles its lifecycle.</summary>
    private async Task ExecuteTaskAsync(EngineTaskBase task, CancellationToken cancellationToken)
    {
        try
        {
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, task.CancellationTokenSource.Token);
            await task.ExecuteAsync(linked.Token).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            task.State = TaskState.Canceled;
        }
        catch (Exception ex)
        {
            task.State = TaskState.Faulted;
            _logTaskFaulted(_logger, task.TaskId, ex);
        }
        finally
        {
            task.EndTime = DateTime.UtcNow;
            _ = Task.Run(async () =>
            {
                await Task.Delay(TimeSpan.FromMinutes(5), CancellationToken.None).ConfigureAwait(false);
                if (_tasks.TryRemove(task.TaskId, out var removedTask))
                {
                    removedTask.Dispose(); // Ensure cleanup of CTS even if removed later.
                }
                _liveThreads.TryRemove(task.TaskId, out _);
            }, CancellationToken.None);
        }
    }

    /// <inheritdoc/>
    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        foreach (var task in _tasks.Values)
        {
            task.CancellationTokenSource.Cancel();
            task.Dispose();
        }

        foreach (var kv in _liveThreads)
        {
            if (kv.Value.IsAlive)
            {
                kv.Value.Join(TimeSpan.FromSeconds(5));
            }
        }

        _lock.Dispose();
    }
}
