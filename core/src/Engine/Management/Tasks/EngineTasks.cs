// -----------------------------------------------------------------------------
// <copyright file="EngineTasks.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Tasks;

using Engine.Kernel;
using global::Kernel.Backtesting;
using global::Kernel.Optimization;
using Microsoft.Extensions.Logging;
using ChromosomeKernel = global::Kernel.Optimization.Chromosome;

/// <summary>Live trading task.</summary>
internal sealed class LiveTask : EngineTaskBase
{
    private readonly ILogger<LiveTask> _logger;
    private readonly ITaskManager _taskManager;
    private readonly IKernelService _kernelService;
    private readonly string _kernelTaskId;
    private double[] _genes = Array.Empty<double>();

    /// <summary>Gets the configuration object used to start this task.</summary>
    public object Config { get; }

    /// <summary>Gets the kernel task identifier.</summary>
    public string KernelTaskId => _kernelTaskId;

    /// <summary>Gets or sets the name of the active strategy.</summary>
    public string StrategyName { get; set; } = string.Empty;

    /// <summary>Gets or sets the name of the active adapter.</summary>
    public string AdapterName { get; set; } = string.Empty;

    /// <summary>Gets or sets the timestamp of the last tick received (UTC).</summary>
    public DateTime? LastTickTime { get; set; }

    private static readonly Action<ILogger, string, Exception?> _logLiveTaskStarted =
        LoggerMessage.Define<string>(LogLevel.Information, 0, "Live task {TaskId} started.");
    private static readonly Action<ILogger, string, Exception?> _logLiveTaskCompleted =
        LoggerMessage.Define<string>(LogLevel.Information, 1, "Live task {TaskId} completed.");
    private static readonly Action<ILogger, string, Exception?> _logLiveTaskCanceled =
        LoggerMessage.Define<string>(LogLevel.Information, 2, "Live task {TaskId} canceled.");
    private static readonly Action<ILogger, string, Exception?> _logLiveTaskFaulted =
        LoggerMessage.Define<string>(LogLevel.Error, 3, "Live task {TaskId} faulted.");
    private static readonly Action<ILogger, int, string, Exception?> _logInjectedGenes =
        LoggerMessage.Define<int, string>(LogLevel.Information, 4, "Injected {Count} genes into live task {TaskId}.");

    public LiveTask(string taskId, object config, ILogger<LiveTask> logger, ITaskManager taskManager,
                    IKernelService kernelService, string kernelTaskId)
    {
        TaskId = taskId;
        TaskType = "Live";
        Config = config;
        _logger = logger;
        _taskManager = taskManager;
        _kernelService = kernelService;
        _kernelTaskId = kernelTaskId;
        StartTime = DateTime.UtcNow;
        State = TaskState.Initializing;
    }

    public override async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        State = TaskState.Running;
        _logLiveTaskStarted(_logger, TaskId, null);
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                // Poll the kernel service for state updates
                var liveState = await _kernelService.GetLiveStateAsync(_kernelTaskId, cancellationToken).ConfigureAwait(false);
                LastTickTime = DateTime.UtcNow;

                // Update our internal state? Not needed; we just keep running.
                await Task.Delay(1000, cancellationToken).ConfigureAwait(false);
            }
            State = TaskState.Completed;
            _logLiveTaskCompleted(_logger, TaskId, null);
        }
        catch (OperationCanceledException)
        {
            State = TaskState.Canceled;
            _logLiveTaskCanceled(_logger, TaskId, null);
        }
        catch (Exception ex)
        {
            State = TaskState.Faulted;
            _logLiveTaskFaulted(_logger, TaskId, ex);
            throw;
        }
        finally
        {
            EndTime = DateTime.UtcNow;
        }
    }

    /// <summary>Injects a gene array into the live strategy.</summary>
    public async Task InjectGenesAsync(double[] genes, CancellationToken cancellationToken)
    {
        _genes = genes ?? Array.Empty<double>();
        _logInjectedGenes(_logger, _genes.Length, TaskId, null);
        await Task.CompletedTask.ConfigureAwait(false);
    }

    /// <summary>Returns the currently active gene array.</summary>
    public Task<double[]> GetGenesAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult(_genes);
    }

    /// <summary>Gets a snapshot of the live trading state.</summary>
    public async Task<object> GetLiveStateAsync(CancellationToken cancellationToken)
    {
        var liveState = await _kernelService.GetLiveStateAsync(_kernelTaskId, cancellationToken).ConfigureAwait(false);
        return new
        {
            IsLive = liveState.IsLive,
            Equity = liveState.Equity,
            Balance = liveState.Balance,
            Drawdown = liveState.Drawdown,
            Positions = liveState.Positions,
            Orders = liveState.Orders
        };
    }
}

/// <summary>Backtest task.</summary>
internal sealed class BacktestTask : EngineTaskBase
{
    private readonly object _input;
    private readonly ILogger<BacktestTask> _logger;
    private readonly ITaskManager _taskManager;
    private readonly IKernelService _kernelService;
    private readonly string _kernelTaskId;
    private BacktestResult? _result;

    private static readonly Action<ILogger, string, Exception?> _logBacktestTaskStarted =
        LoggerMessage.Define<string>(LogLevel.Information, 0, "Backtest task {TaskId} started.");
    private static readonly Action<ILogger, string, Exception?> _logBacktestTaskCompleted =
        LoggerMessage.Define<string>(LogLevel.Information, 1, "Backtest task {TaskId} completed.");
    private static readonly Action<ILogger, string, Exception?> _logBacktestTaskCanceled =
        LoggerMessage.Define<string>(LogLevel.Information, 2, "Backtest task {TaskId} canceled.");
    private static readonly Action<ILogger, string, Exception?> _logBacktestTaskFaulted =
        LoggerMessage.Define<string>(LogLevel.Error, 3, "Backtest task {TaskId} faulted.");

    public BacktestTask(string taskId, object input, ILogger<BacktestTask> logger, ITaskManager taskManager,
                        IKernelService kernelService, string kernelTaskId)
    {
        TaskId = taskId;
        TaskType = "Backtest";
        _input = input;
        _logger = logger;
        _taskManager = taskManager;
        _kernelService = kernelService;
        _kernelTaskId = kernelTaskId;
        StartTime = DateTime.UtcNow;
        State = TaskState.Initializing;
    }

    public override async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        State = TaskState.Running;
        _logBacktestTaskStarted(_logger, TaskId, null);
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                // Null means the kernel has not finished. The previous test for completion was
                // `_result != null && _result.TotalTrades >= 0`, and because a not-yet-finished run
                // returned a zeroed result the condition was true on the very first poll -- so the
                // task reported itself completed while the kernel was still running.
                _result = await _kernelService.GetBacktestResultAsync(_kernelTaskId, cancellationToken).ConfigureAwait(false);
                if (_result != null)
                {
                    break;
                }

                await Task.Delay(500, cancellationToken).ConfigureAwait(false);
            }
            State = TaskState.Completed;
            _logBacktestTaskCompleted(_logger, TaskId, null);
        }
        catch (OperationCanceledException)
        {
            State = TaskState.Canceled;
            _logBacktestTaskCanceled(_logger, TaskId, null);
        }
        catch (Exception ex)
        {
            State = TaskState.Faulted;
            _logBacktestTaskFaulted(_logger, TaskId, ex);
            throw;
        }
        finally
        {
            EndTime = DateTime.UtcNow;
        }
    }

    /// <inheritdoc/>
    public override Task<object?> GetResultAsync(CancellationToken cancellationToken)
    {
        // Null when there is no result yet, rather than an empty BacktestResult: a placeholder is
        // indistinguishable from a real zero-trade run, which is what let a caller treat an
        // unfinished backtest as a completed one.
        return Task.FromResult<object?>(_result);
    }
}

/// <summary>Optimization task supporting continuous execution and step-by-step checkpointing.</summary>
internal sealed class OptimizationTask : EngineTaskBase
{
    private readonly object _config;
    private readonly ILogger<OptimizationTask> _logger;
    private readonly ITaskManager _taskManager;
    private readonly IKernelService _kernelService;
    private readonly string _kernelTaskId;
    private readonly bool _isSteppable;
    private readonly List<InterventionRecord> _interventions = new();
    private ChromosomeKernel? _bestChromosome;
    private string? _lastFingerprint;
    private ComputationCheckpoint? _currentCheckpoint;
    private bool _diverged;

    /// <summary>Gets the configuration object used to start this task.</summary>
    public object Config => _config;

    /// <summary>Gets the kernel task identifier.</summary>
    public string KernelTaskId => _kernelTaskId;

    /// <summary>Gets whether this optimization run has diverged due to interventions.</summary>
    public bool Diverged => _diverged;

    /// <summary>Gets the list of external interventions applied.</summary>
    public IReadOnlyList<InterventionRecord> Interventions => _interventions.AsReadOnly();

    private static readonly Action<ILogger, string, Exception?> _logOptimizationTaskStarted =
        LoggerMessage.Define<string>(LogLevel.Information, 0, "Optimization task {TaskId} started.");
    private static readonly Action<ILogger, string, Exception?> _logOptimizationTaskCompleted =
        LoggerMessage.Define<string>(LogLevel.Information, 1, "Optimization task {TaskId} completed.");
    private static readonly Action<ILogger, string, Exception?> _logOptimizationTaskCanceled =
        LoggerMessage.Define<string>(LogLevel.Information, 2, "Optimization task {TaskId} canceled.");
    private static readonly Action<ILogger, string, Exception?> _logOptimizationTaskFaulted =
        LoggerMessage.Define<string>(LogLevel.Error, 3, "Optimization task {TaskId} faulted.");

    /// <summary>Initialises a new instance of the <see cref="OptimizationTask"/> class.</summary>
    public OptimizationTask(
        string taskId,
        object config,
        ILogger<OptimizationTask> logger,
        ITaskManager taskManager,
        IKernelService kernelService,
        string kernelTaskId,
        bool isSteppable = false,
        string? initialFingerprint = null,
        bool diverged = false,
        IEnumerable<InterventionRecord>? existingInterventions = null)
    {
        TaskId = taskId;
        TaskType = "Optimization";
        _config = config;
        _logger = logger;
        _taskManager = taskManager;
        _kernelService = kernelService;
        _kernelTaskId = kernelTaskId;
        _isSteppable = isSteppable;
        _lastFingerprint = initialFingerprint;
        _diverged = diverged;
        if (existingInterventions != null)
        {
            _interventions.AddRange(existingInterventions);
        }

        StartTime = DateTime.UtcNow;
        State = TaskState.Initializing;
    }

    /// <inheritdoc/>
    public override async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        State = TaskState.Running;
        _logOptimizationTaskStarted(_logger, TaskId, null);
        try
        {
            if (_isSteppable)
            {
                var tcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                using (cancellationToken.Register(() => tcs.TrySetCanceled(cancellationToken)))
                {
                    await tcs.Task.ConfigureAwait(false);
                }
            }
            else
            {
                while (!cancellationToken.IsCancellationRequested)
                {
                    _bestChromosome = await _kernelService.GetOptimizationResultAsync(_kernelTaskId, cancellationToken).ConfigureAwait(false);
                    if (_bestChromosome != null && _bestChromosome.Fitness > ChromosomeKernel.NotEvaluated)
                    {
                        break;
                    }

                    await Task.Delay(500, cancellationToken).ConfigureAwait(false);
                }
                State = TaskState.Completed;
                _logOptimizationTaskCompleted(_logger, TaskId, null);
            }
        }
        catch (OperationCanceledException)
        {
            State = TaskState.Canceled;
            _logOptimizationTaskCanceled(_logger, TaskId, null);
        }
        catch (Exception ex)
        {
            State = TaskState.Faulted;
            _logOptimizationTaskFaulted(_logger, TaskId, ex);
            throw;
        }
        finally
        {
            EndTime = DateTime.UtcNow;
        }
    }

    /// <summary>Advances the optimization run by a given number of generations.</summary>
    public async Task<ComputationCheckpoint> StepAsync(int generations, CancellationToken cancellationToken)
    {
        if (generations <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(generations), "Generations to step must be greater than zero.");
        }

        GeneticOptimizerState? lastState = null;
        for (int i = 0; i < generations; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            lastState = await _kernelService.StepOptimizationAsync(_kernelTaskId, cancellationToken).ConfigureAwait(false);

            var newFingerprint = CheckpointFingerprint.Compute(lastState);
            _currentCheckpoint = new ComputationCheckpoint
            {
                ComputationId = TaskId,
                StepIndex = lastState.CurrentGeneration,
                Fingerprint = newFingerprint,
                ParentFingerprint = _lastFingerprint,
                State = lastState,
                Diverged = _diverged,
                Interventions = _interventions.ToArray()
            };
            _lastFingerprint = newFingerprint;
        }

        if (lastState != null)
        {
            var best = await _kernelService.GetOptimizationResultAsync(_kernelTaskId, cancellationToken).ConfigureAwait(false);
            if (best != null && best.Fitness > ChromosomeKernel.NotEvaluated)
            {
                _bestChromosome = best;
            }
        }

        return _currentCheckpoint!;
    }

    /// <summary>Gets the current computation checkpoint.</summary>
    public async Task<ComputationCheckpoint> GetCheckpointAsync(CancellationToken cancellationToken)
    {
        if (_currentCheckpoint != null)
        {
            return _currentCheckpoint;
        }

        var state = await _kernelService.GetOptimizationCheckpointAsync(_kernelTaskId, cancellationToken).ConfigureAwait(false);
        if (state == null)
        {
            throw new InvalidOperationException($"No checkpoint state available for task {TaskId}.");
        }

        var fingerprint = CheckpointFingerprint.Compute(state);
        _lastFingerprint = fingerprint;
        _currentCheckpoint = new ComputationCheckpoint
        {
            ComputationId = TaskId,
            StepIndex = state.CurrentGeneration,
            Fingerprint = fingerprint,
            ParentFingerprint = null,
            State = state,
            Diverged = _diverged,
            Interventions = _interventions.ToArray()
        };
        return _currentCheckpoint;
    }

    /// <summary>Modifies or restores the computation checkpoint with an audit rationale.</summary>
    public async Task<ComputationCheckpoint> SetCheckpointAsync(ComputationCheckpoint checkpoint, string? reason, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(checkpoint);
        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("An explicit audit reason is mandatory for checkpoint modification or intervention.", nameof(reason));
        }

        await _kernelService.SetOptimizationCheckpointAsync(_kernelTaskId, checkpoint.State, invalidateFitness: true, cancellationToken).ConfigureAwait(false);

        var newFingerprint = CheckpointFingerprint.Compute(checkpoint.State);
        var intervention = new InterventionRecord
        {
            StepIndex = checkpoint.State.CurrentGeneration,
            PreviousFingerprint = _lastFingerprint,
            NewFingerprint = newFingerprint,
            Actor = "User",
            TimestampUtc = DateTime.UtcNow,
            Reason = reason
        };

        _diverged = true;
        _interventions.Add(intervention);

        _currentCheckpoint = new ComputationCheckpoint
        {
            ComputationId = TaskId,
            StepIndex = checkpoint.State.CurrentGeneration,
            Fingerprint = newFingerprint,
            ParentFingerprint = _lastFingerprint,
            State = checkpoint.State,
            Diverged = true,
            Interventions = _interventions.ToArray()
        };
        _lastFingerprint = newFingerprint;

        return _currentCheckpoint;
    }

    /// <inheritdoc/>
    public override Task<object> GetStateAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult<object>(new
        {
            TaskId,
            TaskType,
            State = State.ToString(),
            StartTime,
            EndTime,
            StepIndex = _currentCheckpoint?.StepIndex ?? 0,
            Fingerprint = _lastFingerprint,
            Diverged = _diverged,
            InterventionCount = _interventions.Count
        });
    }

    /// <inheritdoc/>
    public override Task<object?> GetResultAsync(CancellationToken cancellationToken)
    {
        // Null until the optimiser has produced a best chromosome, so "still running" cannot be
        // mistaken for "finished with a placeholder solution".
        return Task.FromResult<object?>(_bestChromosome);
    }
}
