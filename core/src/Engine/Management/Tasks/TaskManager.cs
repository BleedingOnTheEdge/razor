// -----------------------------------------------------------------------------
// <copyright file="TaskManager.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Tasks;

using Engine.Core;
using Engine.Core.Exceptions;
using Engine.Extensions;
using Engine.Kernel;
using global::Kernel.Optimization;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Text.Json;
using LiveState = Engine.Core.LiveState;

/// <summary>Default implementation of <see cref="ITaskManager"/>.</summary>
internal sealed partial class TaskManager : ITaskManager, IDisposable
{
    private readonly ConcurrentDictionary<string, EngineTaskBase> _tasks = new();
    private readonly ConcurrentDictionary<string, Thread> _liveThreads = new();
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly ILogger<TaskManager> _logger;
    private readonly IStateManager _stateManager;
    private readonly ILoggerFactory _loggerFactory;
    private readonly IKernelService _kernelService;
    private readonly IExtensionManager _extensionManager;
    private bool _disposed;

    private static readonly Action<ILogger, string, Exception?> _logTaskFaulted =
        LoggerMessage.Define<string>(LogLevel.Error, 0, "Task {TaskId} faulted.");

    private static readonly Action<ILogger, string, Exception?> _logLiveThreadDidNotExit =
        LoggerMessage.Define<string>(LogLevel.Warning, 16, "Live thread {TaskId} did not exit within 5 seconds.");

    private static readonly Action<ILogger, string, Exception?> _logRestoringLiveTask =
        LoggerMessage.Define<string>(LogLevel.Information, 17, "Restoring live task from persisted state: {TaskId}");

    private static readonly Action<ILogger, string, Exception?> _logLiveTaskRestored =
        LoggerMessage.Define<string>(LogLevel.Information, 18, "Live task {TaskId} restored successfully.");

    private static readonly Action<ILogger, Exception?> _logLiveTaskAlreadyRunning =
        LoggerMessage.Define(LogLevel.Warning, 19, "A live task is already running; skipping restoration.");

    private static readonly Action<ILogger, string, Exception?> _logLiveTaskRestoreFailed =
        LoggerMessage.Define<string>(LogLevel.Error, 20, "Failed to restore live task {TaskId}.");

    /// <summary>Initialises a new instance of the <see cref="TaskManager"/> class.</summary>
    public TaskManager(
        ILogger<TaskManager> logger,
        IStateManager stateManager,
        ILoggerFactory loggerFactory,
        IKernelService kernelService,
        IExtensionManager extensionManager)
    {
        _logger = logger;
        _stateManager = stateManager;
        _loggerFactory = loggerFactory;
        _kernelService = kernelService;
        _extensionManager = extensionManager;
    }

    /// <inheritdoc/>
    public IReadOnlyList<EngineTaskBase> RunningTasks => _tasks.Values.Where(t => t.State == TaskState.Running).ToList().AsReadOnly();

    /// <inheritdoc/>
    public IReadOnlyList<EngineTaskBase> AllTasks => _tasks.Values.ToList().AsReadOnly();

    /// <inheritdoc/>
    public EngineTaskBase? GetTask(string taskId) => _tasks.TryGetValue(taskId, out var task) ? task : null;

    /// <inheritdoc/>
    public DateTime? GetLastLiveTickTimestamp()
    {
        var liveTask = _tasks.Values.OfType<LiveTask>().FirstOrDefault();
        return liveTask?.LastTickTime;
    }

    /// <inheritdoc/>
    public async Task<string?> RestoreLiveTaskAsync(LiveState state, CancellationToken cancellationToken)
    {
        if (state == null)
        {
            return null;
        }

        // Check if there is already a live task running (should not happen during startup)
        if (_tasks.Values.Any(t => t.TaskType == "Live" && t.State != TaskState.Completed && t.State != TaskState.Canceled))
        {
            _logLiveTaskAlreadyRunning(_logger, null);
            return null;
        }

        _logRestoringLiveTask(_logger, state.TaskId, null);

        try
        {
            // Build LiveInput from persisted state
            var liveInput = new LiveInput
            {
                AdapterName = state.AdapterName,
                StrategyName = state.StrategyName,
                StrategyConfig = state.Config, // use the stored config object
                MagicNumber = state.MagicNumber,
                Leverage = state.Leverage,
                InitialBalance = state.InitialBalance,
                Symbols = state.Symbols,
                OrderGuardTimeoutSeconds = state.OrderGuardTimeoutSeconds,
                StopOutLevel = state.StopOutLevel,
                MaxOpenPositions = state.MaxOpenPositions,
                Genes = state.Genes,
                NeuralNetworkName = state.NeuralNetworkName ?? string.Empty,
                AccountCurrency = state.AccountCurrency
            };

            // Start a new live session via kernel service
            string kernelTaskId = await _kernelService.StartLiveAsync(liveInput, cancellationToken).ConfigureAwait(false);

            // Create a new LiveTask with the restored configuration
            var task = new LiveTask(state.TaskId, state.Config, _loggerFactory.CreateLogger<LiveTask>(), this, _kernelService, kernelTaskId)
            {
                StrategyName = state.StrategyName,
                AdapterName = state.AdapterName,
                LastTickTime = state.LastTickTime,
                StartTime = state.StartTime
            };

            _tasks[state.TaskId] = task;

            // Start the live thread
            var thread = new Thread(() =>
            {
                try
                {
                    ExecuteTaskAsync(task, cancellationToken).GetAwaiter().GetResult();
                }
                catch (Exception ex)
                {
                    _logTaskFaulted(_logger, task.TaskId, ex);
                }
            })
            {
                Priority = ThreadPriority.Highest,
                IsBackground = true,
                Name = $"LiveThread-{state.TaskId}"
            };

            _liveThreads[state.TaskId] = thread;
            thread.Start();

            _logLiveTaskRestored(_logger, state.TaskId, null);
            return state.TaskId;
        }
        catch (Exception ex)
        {
            _logLiveTaskRestoreFailed(_logger, state.TaskId, ex);
            return null;
        }
    }

    /// <inheritdoc/>
    public async Task<string> StartLiveTaskAsync(object config, CancellationToken cancellationToken)
    {
        var taskId = $"live_{Guid.NewGuid():N}";
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            // Parse configuration
            var liveConfig = LiveConfiguration.Parse(config);

            // Build LiveInput
            var liveInput = new LiveInput
            {
                AdapterName = liveConfig.AdapterName,
                StrategyName = liveConfig.StrategyName,
                StrategyConfig = config,
                MagicNumber = liveConfig.MagicNumber,
                Leverage = liveConfig.Leverage,
                InitialBalance = liveConfig.InitialBalance,
                Symbols = liveConfig.Symbols,
                OrderGuardTimeoutSeconds = liveConfig.OrderGuardTimeoutSeconds,
                StopOutLevel = liveConfig.StopOutLevel,
                MaxOpenPositions = liveConfig.MaxOpenPositions,
                Genes = liveConfig.Genes,
                NeuralNetworkName = liveConfig.NeuralNetworkName ?? string.Empty,
                AccountCurrency = liveConfig.AccountCurrency
            };

            // Start via kernel service
            string kernelTaskId = await _kernelService.StartLiveAsync(liveInput, cancellationToken).ConfigureAwait(false);

            var task = new LiveTask(taskId, config ?? new object(), _loggerFactory.CreateLogger<LiveTask>(), this, _kernelService, kernelTaskId)
            {
                StrategyName = liveConfig.StrategyName,
                AdapterName = liveConfig.AdapterName
            };
            _tasks[taskId] = task;

            // Create a dedicated thread for live trading with high priority
            var thread = new Thread(() =>
            {
                try
                {
                    ExecuteTaskAsync(task, cancellationToken).GetAwaiter().GetResult();
                }
                catch (Exception ex)
                {
                    _logTaskFaulted(_logger, task.TaskId, ex);
                }
            })
            {
                Priority = ThreadPriority.Highest,
                IsBackground = true,
                Name = $"LiveThread-{taskId}"
            };

            _liveThreads[taskId] = thread;
            thread.Start();

            // Persist complete state
            var state = new LiveState
            {
                TaskId = taskId,
                Config = config ?? new object(),
                AdapterName = liveConfig.AdapterName,
                StrategyName = liveConfig.StrategyName,
                MagicNumber = liveConfig.MagicNumber,
                Leverage = liveConfig.Leverage,
                InitialBalance = liveConfig.InitialBalance,
                Symbols = liveConfig.Symbols,
                OrderGuardTimeoutSeconds = liveConfig.OrderGuardTimeoutSeconds,
                StopOutLevel = liveConfig.StopOutLevel,
                MaxOpenPositions = liveConfig.MaxOpenPositions,
                NeuralNetworkName = liveConfig.NeuralNetworkName ?? string.Empty,
                Genes = liveConfig.Genes,
                AccountCurrency = liveConfig.AccountCurrency,
                LastTickTime = null,
                StartTime = task.StartTime
            };
            await _stateManager.SaveLiveStateAsync(state, cancellationToken).ConfigureAwait(false);
            return taskId;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task StopLiveTaskAsync(string taskId, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_tasks.TryRemove(taskId, out var task))
            {
                await task.CancellationTokenSource.CancelAsync().ConfigureAwait(false);

                // Wait for the live thread to finish
                if (_liveThreads.TryRemove(taskId, out var thread))
                {
                    if (thread.IsAlive)
                    {
                        if (!thread.Join(TimeSpan.FromSeconds(5)))
                        {
                            _logLiveThreadDidNotExit(_logger, taskId, null);
                        }
                    }
                }

                task.State = TaskState.Canceled;
                task.Dispose(); // THR‑05: Dispose CTS.

                // If it's a live task, stop the kernel session
                if (task is LiveTask liveTask)
                {
                    await _kernelService.StopLiveAsync(liveTask.KernelTaskId, cancellationToken).ConfigureAwait(false);
                }

                // Delete persisted state
                await _stateManager.DeleteLiveStateAsync(cancellationToken).ConfigureAwait(false);
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task<string> StartBacktestTaskAsync(object config, CancellationToken cancellationToken)
    {
        var taskId = $"bt_{Guid.NewGuid():N}";
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            // Parse configuration
            var btConfig = BacktestConfiguration.Parse(config);

            // Get active adapter and strategy
            var adapter = _extensionManager.ActiveAdapter;
            if (adapter is null)
            {
                string adapterName = !string.IsNullOrWhiteSpace(btConfig.AdapterName) ? btConfig.AdapterName : "PaperBroker";
                adapter = _extensionManager.CreateTransientAdapter(adapterName)
                    ?? _extensionManager.CreateTransientAdapter("PaperBroker")
                    ?? throw new InvalidOperationException("No active adapter found.");
            }

            var strategy = _extensionManager.ActiveStrategy;
            if (strategy is null)
            {
                string strategyName = !string.IsNullOrWhiteSpace(btConfig.StrategyName) ? btConfig.StrategyName : "TrendFollowing";
                strategy = _extensionManager.CreateTransientStrategy(strategyName)
                    ?? _extensionManager.CreateTransientStrategy("TrendFollowing")
                    ?? throw new InvalidOperationException("No active strategy found.");
            }

            // Start via kernel service
            string kernelTaskId = await _kernelService.StartBacktestAsync(
                adapter,
                strategy,
                btConfig,
                cancellationToken).ConfigureAwait(false);

            var task = new BacktestTask(taskId, config ?? new object(), _loggerFactory.CreateLogger<BacktestTask>(), this, _kernelService, kernelTaskId);
            _tasks[taskId] = task;
            _ = Task.Run(() => ExecuteTaskAsync(task, cancellationToken), cancellationToken);
            return taskId;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task CancelBacktestTaskAsync(string taskId, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_tasks.TryRemove(taskId, out var task))
            {
                await task.CancellationTokenSource.CancelAsync().ConfigureAwait(false);
                task.State = TaskState.Canceled;
                task.Dispose(); // THR‑05: Dispose CTS.
                // No explicit kernel cancel for backtest (stub)
            }
        }
        finally
        {
            _lock.Release();
        }
    }
}
