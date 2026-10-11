// -----------------------------------------------------------------------------
// <copyright file="TaskManagerTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.UnitTests.Management.Tasks;

using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Engine.Core;
using Engine.Core.Exceptions;
using Engine.Extensions;
using Engine.Kernel;
using Engine.Management.Tasks;
using global::Kernel.Backtesting;
using global::Kernel.Optimization;
using Microsoft.Extensions.Logging.Abstractions;
using Sdk.Hooks;
using Sdk.Shared;
using Sdk.Slots.Adapter;
using Sdk.Slots.NeuralNetwork;
using Sdk.Slots.Strategy;
using Xunit;
using ChromosomeKernel = global::Kernel.Optimization.Chromosome;
using EngineCoreLiveState = Engine.Core.LiveState;
using KernelLiveState = Engine.Kernel.LiveState;

public sealed class TaskManagerTests : IDisposable
{
    private readonly string _tempDbPath;
    private readonly StateManager _stateManager;
    private readonly FakeKernelService _kernelService = new();
    private readonly FakeExtensionManager _extensionManager = new();
    private readonly TaskManager _taskManager;

    private static readonly double[] SampleGenes = [1.0, 2.0];
    private static readonly ChromosomeKernel[] SamplePopulation = [new([1.0, 2.0], fitness: 50.0)];

    public TaskManagerTests()
    {
        _tempDbPath = Path.Combine(Path.GetTempPath(), $"task_mgr_test_{Guid.NewGuid():N}.db");
        _stateManager = new StateManager(_tempDbPath);
        _taskManager = new TaskManager(
            NullLogger<TaskManager>.Instance,
            _stateManager,
            NullLoggerFactory.Instance,
            _kernelService,
            _extensionManager);
    }

    public void Dispose()
    {
        _taskManager.Dispose();
        _stateManager.Dispose();
        if (File.Exists(_tempDbPath))
        {
            try
            {
                File.Delete(_tempDbPath);
            }
            catch
            {
                // Ignore cleanup error on temp test db
            }
        }
    }

    private static Dictionary<string, object> CreateLiveConfig() => new(StringComparer.Ordinal)
    {
        ["AdapterName"] = "TestAdapter",
        ["StrategyName"] = "TestStrategy",
        ["MagicNumber"] = 123456,
        ["Leverage"] = 100.0,
        ["InitialBalance"] = 10000.0,
        ["Symbols"] = new object[] { "EURUSD" },
        ["OrderGuardTimeoutSeconds"] = 5,
        ["StopOutLevel"] = 0.2,
        ["MaxOpenPositions"] = 10,
        ["Genes"] = new object[] { 1.0, 2.0 },
        ["AccountCurrency"] = "USD"
    };

    private static Dictionary<string, object> CreateBacktestConfig() => new(StringComparer.Ordinal)
    {
        ["AdapterName"] = "TestAdapter",
        ["StrategyName"] = "TestStrategy",
        ["Symbols"] = new object[] { "EURUSD" },
        ["StartDate"] = DateTime.UtcNow.AddDays(-30).ToString("o", System.Globalization.CultureInfo.InvariantCulture),
        ["EndDate"] = DateTime.UtcNow.ToString("o", System.Globalization.CultureInfo.InvariantCulture),
        ["InitialBalance"] = 10000.0,
        ["Leverage"] = 100.0,
        ["MaxOpenPositions"] = 10,
        ["StopOutLevel"] = 0.2,
        ["MaxParallelThreads"] = 2,
        ["LatencyTicks"] = 0L,
        ["WarmupWindowCount"] = 0,
        ["Genes"] = new object[] { 1.0, 2.0 },
        ["Timeframes"] = new object[] { "M1" },
        ["AccountCurrency"] = "USD"
    };

    private static Dictionary<string, object> CreateOptimizationConfig(bool steppable = true, GeneticOptimizerState? initialState = null)
    {
        var dict = new Dictionary<string, object>(StringComparer.Ordinal)
        {
            ["AdapterName"] = "TestAdapter",
            ["StrategyName"] = "TestStrategy",
            ["IsSteppable"] = steppable,
            ["Generations"] = 10,
            ["PopulationSize"] = 20,
            ["Leverage"] = 100.0,
            ["InitialBalance"] = 10000.0,
            ["Symbols"] = new object[] { "EURUSD" },
            ["MasterSeed"] = 42,
            ["MutationRate"] = 0.1,
            ["CrossoverRate"] = 0.5,
            ["ElitismPct"] = 0.05,
            ["TournamentSize"] = 3,
            ["AccountCurrency"] = "USD"
        };
        if (initialState != null)
        {
            dict["InitialState"] = initialState;
        }
        return dict;
    }

    // ─── 1. Live Task Execution Tests ──────────────────────────────────────────

    [Fact]
    public async Task StartLiveTaskAsync_CreatesHighestPriorityThread_AndPersistsState()
    {
        var config = CreateLiveConfig();

        string taskId = await _taskManager.StartLiveTaskAsync(config, CancellationToken.None);

        Assert.NotNull(taskId);
        Assert.StartsWith("live_", taskId, StringComparison.Ordinal);

        var task = _taskManager.GetTask(taskId);
        Assert.NotNull(task);
        Assert.Equal("Live", task.TaskType);
        Assert.Contains(task, _taskManager.AllTasks);

        Assert.Equal(1, _kernelService.StartLiveCallCount);

        var persisted = await _stateManager.LoadLiveStateAsync(CancellationToken.None);
        Assert.NotNull(persisted);
        Assert.Equal(taskId, persisted.TaskId);
        Assert.Equal("TestStrategy", persisted.StrategyName);
        Assert.Equal("TestAdapter", persisted.AdapterName);
        Assert.Equal(10000.0, persisted.InitialBalance);

        await _taskManager.StopLiveTaskAsync(taskId, CancellationToken.None);
    }

    [Fact]
    public async Task RestoreLiveTaskAsync_WhenLiveAlreadyRunning_ReturnsNull()
    {
        var config = CreateLiveConfig();
        string taskId = await _taskManager.StartLiveTaskAsync(config, CancellationToken.None);

        var stateToRestore = new EngineCoreLiveState
        {
            TaskId = "live_restore_attempt",
            Config = config,
            AdapterName = "TestAdapter",
            StrategyName = "TestStrategy",
            InitialBalance = 5000.0,
            Symbols = ["EURUSD"],
            Genes = [1.0]
        };

        string? restoredId = await _taskManager.RestoreLiveTaskAsync(stateToRestore, CancellationToken.None);

        Assert.Null(restoredId);

        await _taskManager.StopLiveTaskAsync(taskId, CancellationToken.None);
    }

    [Fact]
    public async Task RestoreLiveTaskAsync_WhenStateIsNull_ReturnsNull()
    {
        string? result = await _taskManager.RestoreLiveTaskAsync(null!, CancellationToken.None);
        Assert.Null(result);
    }

    [Fact]
    public async Task RestoreLiveTaskAsync_WhenNoLiveRunning_RestoresAndStartsSession()
    {
        var config = CreateLiveConfig();
        var stateToRestore = new EngineCoreLiveState
        {
            TaskId = "live_restored_1",
            Config = config,
            AdapterName = "TestAdapter",
            StrategyName = "TestStrategy",
            InitialBalance = 7500.0,
            Symbols = ["EURUSD"],
            Genes = [1.0, 2.0]
        };

        string? restoredId = await _taskManager.RestoreLiveTaskAsync(stateToRestore, CancellationToken.None);

        Assert.Equal("live_restored_1", restoredId);
        Assert.NotNull(_taskManager.GetTask("live_restored_1"));
        Assert.Equal(1, _kernelService.StartLiveCallCount);

        await _taskManager.StopLiveTaskAsync("live_restored_1", CancellationToken.None);
    }

    [Fact]
    public async Task StopLiveTaskAsync_CancelsTask_StopsKernel_AndDeletesPersistedState()
    {
        var config = CreateLiveConfig();
        string taskId = await _taskManager.StartLiveTaskAsync(config, CancellationToken.None);

        Assert.NotNull(await _stateManager.LoadLiveStateAsync(CancellationToken.None));

        await _taskManager.StopLiveTaskAsync(taskId, CancellationToken.None);

        Assert.Null(_taskManager.GetTask(taskId));
        Assert.Equal(1, _kernelService.StopLiveCallCount);
        Assert.Null(await _stateManager.LoadLiveStateAsync(CancellationToken.None));
    }

    [Fact]
    public async Task GetLastLiveTickTimestamp_ReturnsLastTickOrNull()
    {
        Assert.Null(_taskManager.GetLastLiveTickTimestamp());

        var config = CreateLiveConfig();
        string taskId = await _taskManager.StartLiveTaskAsync(config, CancellationToken.None);

        var task = _taskManager.GetTask(taskId) as LiveTask;
        Assert.NotNull(task);
        var tickTime = DateTime.UtcNow;
        task.LastTickTime = tickTime;

        Assert.Equal(tickTime, _taskManager.GetLastLiveTickTimestamp());

        await _taskManager.StopLiveTaskAsync(taskId, CancellationToken.None);
    }

    [Fact]
    public async Task InjectGenesAsync_UpdatesTaskAndPersistedState()
    {
        var config = CreateLiveConfig();
        string taskId = await _taskManager.StartLiveTaskAsync(config, CancellationToken.None);

        double[] newGenes = [42.0, 84.0, 126.0];
        await _taskManager.InjectGenesAsync(taskId, newGenes, CancellationToken.None);

        Assert.Equal(1, _kernelService.InjectGenesCallCount);
        Assert.Equal(newGenes, _kernelService.LastInjectedGenes);

        var persisted = await _stateManager.LoadLiveStateAsync(CancellationToken.None);
        Assert.NotNull(persisted);
        Assert.Equal(newGenes, persisted.Genes);

        await _taskManager.StopLiveTaskAsync(taskId, CancellationToken.None);
    }

    [Fact]
    public async Task InjectGenesAsync_UnknownTaskId_ThrowsEngineException()
    {
        await Assert.ThrowsAsync<EngineException>(() =>
            _taskManager.InjectGenesAsync("unknown_live", [1.0], CancellationToken.None));
    }

    [Fact]
    public async Task GetLiveStateAsync_ReturnsState_OrThrowsWhenNotFound()
    {
        var config = CreateLiveConfig();
        string taskId = await _taskManager.StartLiveTaskAsync(config, CancellationToken.None);

        var state = await _taskManager.GetLiveStateAsync(taskId, CancellationToken.None);
        Assert.NotNull(state);

        await _taskManager.StopLiveTaskAsync(taskId, CancellationToken.None);

        await Assert.ThrowsAsync<EngineException>(() =>
            _taskManager.GetLiveStateAsync("missing_task", CancellationToken.None));
    }

    [Fact]
    public async Task StopAllLiveTasksAsync_CancelsAllActiveLiveSessions()
    {
        var config = CreateLiveConfig();
        string taskId = await _taskManager.StartLiveTaskAsync(config, CancellationToken.None);

        await _taskManager.StopAllLiveTasksAsync(CancellationToken.None);

        Assert.Null(_taskManager.GetTask(taskId));
        Assert.Equal(1, _kernelService.StopLiveCallCount);
    }

    // ─── 2. Backtest Task Execution Tests ──────────────────────────────────────

    [Fact]
    public async Task StartBacktestTaskAsync_ValidConfig_InvokesKernelAndTracksTask()
    {
        using var adapter = new DummyAdapter();
        using var strategy = new DummyStrategy();
        _extensionManager.ActiveAdapter = adapter;
        _extensionManager.ActiveStrategy = strategy;

        var config = CreateBacktestConfig();
        string taskId = await _taskManager.StartBacktestTaskAsync(config, CancellationToken.None);

        Assert.NotNull(taskId);
        Assert.StartsWith("bt_", taskId, StringComparison.Ordinal);

        var task = _taskManager.GetTask(taskId);
        Assert.NotNull(task);
        Assert.Equal("Backtest", task.TaskType);
        Assert.Equal(1, _kernelService.StartBacktestCallCount);

        await _taskManager.CancelBacktestTaskAsync(taskId, CancellationToken.None);
    }

    [Fact]
    public async Task StartBacktestTaskAsync_WhenNoActiveAdapter_ThrowsInvalidOperationException()
    {
        using var strategy = new DummyStrategy();
        _extensionManager.ActiveAdapter = null;
        _extensionManager.ActiveStrategy = strategy;

        var config = CreateBacktestConfig();
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _taskManager.StartBacktestTaskAsync(config, CancellationToken.None));
    }

    [Fact]
    public async Task StartBacktestTaskAsync_WhenNoActiveStrategy_ThrowsInvalidOperationException()
    {
        using var adapter = new DummyAdapter();
        _extensionManager.ActiveAdapter = adapter;
        _extensionManager.ActiveStrategy = null;

        var config = CreateBacktestConfig();
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _taskManager.StartBacktestTaskAsync(config, CancellationToken.None));
    }

    [Fact]
    public async Task CancelBacktestTaskAsync_CancelsAndRemovesTask()
    {
        using var adapter = new DummyAdapter();
        using var strategy = new DummyStrategy();
        _extensionManager.ActiveAdapter = adapter;
        _extensionManager.ActiveStrategy = strategy;

        var config = CreateBacktestConfig();
        string taskId = await _taskManager.StartBacktestTaskAsync(config, CancellationToken.None);

        await _taskManager.CancelBacktestTaskAsync(taskId, CancellationToken.None);

        Assert.Null(_taskManager.GetTask(taskId));
    }

    // ─── 3. Optimization Task Execution Tests ──────────────────────────────────

    [Fact]
    public async Task StartOptimizationTaskAsync_ValidConfig_SavesInitialState()
    {
        using var adapter = new DummyAdapter();
        using var strategy = new DummyStrategy();
        _extensionManager.ActiveAdapter = adapter;
        _extensionManager.ActiveStrategy = strategy;

        var initState = new GeneticOptimizerState
        {
            CurrentGeneration = 0,
            Population = SamplePopulation,
            Evaluated = true
        };
        var config = CreateOptimizationConfig(steppable: true, initialState: initState);

        string taskId = await _taskManager.StartOptimizationTaskAsync(config, CancellationToken.None);

        Assert.NotNull(taskId);
        Assert.StartsWith("opt_", taskId, StringComparison.Ordinal);

        var savedState = await _stateManager.LoadOptimizationStateAsync(taskId, CancellationToken.None);
        Assert.NotNull(savedState);
        Assert.Equal(taskId, savedState.TaskId);
        Assert.Equal(0, savedState.CurrentGeneration);
        Assert.NotNull(savedState.CheckpointFingerprint);

        await _taskManager.CancelOptimizationTaskAsync(taskId, CancellationToken.None);
    }

    [Fact]
    public async Task StartOptimizationTaskAsync_NonDictionaryConfig_ThrowsArgumentException()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _taskManager.StartOptimizationTaskAsync("invalid_config_string", CancellationToken.None));
    }

    [Fact]
    public async Task StepComputationAsync_AdvancesGenerationsAndPersistsState()
    {
        using var adapter = new DummyAdapter();
        using var strategy = new DummyStrategy();
        _extensionManager.ActiveAdapter = adapter;
        _extensionManager.ActiveStrategy = strategy;

        var initState = new GeneticOptimizerState
        {
            CurrentGeneration = 0,
            Population = SamplePopulation,
            Evaluated = true
        };
        var config = CreateOptimizationConfig(steppable: true, initialState: initState);
        string taskId = await _taskManager.StartOptimizationTaskAsync(config, CancellationToken.None);

        var cp = await _taskManager.StepComputationAsync(taskId, 3, CancellationToken.None);

        Assert.NotNull(cp);
        Assert.Equal(3, cp.StepIndex);
        Assert.NotNull(cp.Fingerprint);

        var persisted = await _stateManager.LoadOptimizationStateAsync(taskId, CancellationToken.None);
        Assert.NotNull(persisted);
        Assert.Equal(3, persisted.CurrentGeneration);
        Assert.Equal(cp.Fingerprint, persisted.CheckpointFingerprint);

        await _taskManager.CancelOptimizationTaskAsync(taskId, CancellationToken.None);
    }

    [Fact]
    public async Task StepComputationAsync_UnknownTaskId_ThrowsEngineException()
    {
        await Assert.ThrowsAsync<EngineException>(() =>
            _taskManager.StepComputationAsync("unknown_opt", 1, CancellationToken.None));
    }

    [Fact]
    public async Task GetCheckpointAsync_FromRunningTask_AndPersistedFallback()
    {
        using var adapter = new DummyAdapter();
        using var strategy = new DummyStrategy();
        _extensionManager.ActiveAdapter = adapter;
        _extensionManager.ActiveStrategy = strategy;

        var initState = new GeneticOptimizerState
        {
            CurrentGeneration = 0,
            Population = SamplePopulation,
            Evaluated = true
        };
        var config = CreateOptimizationConfig(steppable: true, initialState: initState);
        string taskId = await _taskManager.StartOptimizationTaskAsync(config, CancellationToken.None);

        var cp = await _taskManager.GetCheckpointAsync(taskId, CancellationToken.None);
        Assert.NotNull(cp);
        Assert.Equal(taskId, cp.ComputationId);

        // Fallback when task not in memory but saved in DB
        var persistedState = new OptimizationState
        {
            TaskId = "opt_persisted_only",
            Config = config,
            OptimizerState = initState,
            CurrentGeneration = 7,
            CheckpointFingerprint = "fp_abc123"
        };
        await _stateManager.SaveOptimizationStateAsync("opt_persisted_only", persistedState, CancellationToken.None);

        var loadedCp = await _taskManager.GetCheckpointAsync("opt_persisted_only", CancellationToken.None);
        Assert.NotNull(loadedCp);
        Assert.Equal("opt_persisted_only", loadedCp.ComputationId);
        Assert.Equal(7, loadedCp.StepIndex);
        Assert.Equal("fp_abc123", loadedCp.Fingerprint);

        // Missing everywhere
        await Assert.ThrowsAsync<EngineException>(() =>
            _taskManager.GetCheckpointAsync("completely_missing", CancellationToken.None));

        await _taskManager.CancelOptimizationTaskAsync(taskId, CancellationToken.None);
    }

    [Fact]
    public async Task SetCheckpointAsync_UpdatesTaskAndPersistsIntervention()
    {
        using var adapter = new DummyAdapter();
        using var strategy = new DummyStrategy();
        _extensionManager.ActiveAdapter = adapter;
        _extensionManager.ActiveStrategy = strategy;

        var initState = new GeneticOptimizerState
        {
            CurrentGeneration = 0,
            Population = SamplePopulation,
            Evaluated = true
        };
        var config = CreateOptimizationConfig(steppable: true, initialState: initState);
        string taskId = await _taskManager.StartOptimizationTaskAsync(config, CancellationToken.None);

        var modifiedState = new GeneticOptimizerState
        {
            CurrentGeneration = 5,
            Population = [new([99.0, 99.0], fitness: 99.0)],
            Evaluated = true
        };
        var newCp = new ComputationCheckpoint
        {
            ComputationId = taskId,
            StepIndex = 5,
            Fingerprint = CheckpointFingerprint.Compute(modifiedState),
            State = modifiedState
        };

        var updatedCp = await _taskManager.SetCheckpointAsync(taskId, newCp, "Operator intervention", CancellationToken.None);

        Assert.NotNull(updatedCp);
        Assert.True(updatedCp.Diverged);
        Assert.Single(updatedCp.Interventions);
        Assert.Equal("Operator intervention", updatedCp.Interventions[0].Reason);

        var persisted = await _stateManager.LoadOptimizationStateAsync(taskId, CancellationToken.None);
        Assert.NotNull(persisted);
        Assert.True(persisted.Diverged);
        Assert.Single(persisted.Interventions);

        await _taskManager.CancelOptimizationTaskAsync(taskId, CancellationToken.None);
    }

    [Fact]
    public async Task RestoreOptimizationTaskAsync_RestoresFromState()
    {
        using var adapter = new DummyAdapter();
        using var strategy = new DummyStrategy();
        _extensionManager.ActiveAdapter = adapter;
        _extensionManager.ActiveStrategy = strategy;

        var initState = new GeneticOptimizerState
        {
            CurrentGeneration = 2,
            Population = SamplePopulation,
            Evaluated = true
        };
        var config = CreateOptimizationConfig(steppable: true, initialState: initState);
        var state = new OptimizationState
        {
            TaskId = "opt_to_restore",
            Config = config,
            OptimizerState = initState,
            CurrentGeneration = 2,
            CheckpointFingerprint = CheckpointFingerprint.Compute(initState)
        };

        string? restoredId = await _taskManager.RestoreOptimizationTaskAsync(state, CancellationToken.None);

        Assert.Equal("opt_to_restore", restoredId);
        Assert.NotNull(_taskManager.GetTask("opt_to_restore"));

        // Null state returns null
        Assert.Null(await _taskManager.RestoreOptimizationTaskAsync(null!, CancellationToken.None));

        // Restoring already existing task returns existing ID
        string? secondRestore = await _taskManager.RestoreOptimizationTaskAsync(state, CancellationToken.None);
        Assert.Equal("opt_to_restore", secondRestore);

        await _taskManager.CancelOptimizationTaskAsync("opt_to_restore", CancellationToken.None);
    }

    // ─── 4. Pause, Resume, StopAll, and General Lifecycle Tests ────────────────

    [Fact]
    public async Task PauseAndResume_RoutesToKernel()
    {
        using var adapter = new DummyAdapter();
        using var strategy = new DummyStrategy();
        _extensionManager.ActiveAdapter = adapter;
        _extensionManager.ActiveStrategy = strategy;

        // Test Live pause / resume
        var liveConfig = CreateLiveConfig();
        string liveId = await _taskManager.StartLiveTaskAsync(liveConfig, CancellationToken.None);

        await _taskManager.PauseTaskAsync(liveId, CancellationToken.None);
        Assert.Equal(1, _kernelService.PauseLiveCallCount);

        await _taskManager.ResumeTaskAsync(liveId, CancellationToken.None);
        Assert.Equal(1, _kernelService.ResumeLiveCallCount);

        await _taskManager.StopLiveTaskAsync(liveId, CancellationToken.None);

        // Test Optimization pause / resume
        var optConfig = CreateOptimizationConfig(steppable: true);
        string optId = await _taskManager.StartOptimizationTaskAsync(optConfig, CancellationToken.None);

        await _taskManager.PauseTaskAsync(optId, CancellationToken.None);
        Assert.Equal(1, _kernelService.PauseOptimizationCallCount);

        await _taskManager.ResumeTaskAsync(optId, CancellationToken.None);
        Assert.Equal(1, _kernelService.ResumeOptimizationCallCount);

        await _taskManager.CancelOptimizationTaskAsync(optId, CancellationToken.None);
    }

    [Fact]
    public async Task StopAllUserTasksAsync_CancelsAllLiveBacktestAndOptTasks()
    {
        using var adapter = new DummyAdapter();
        using var strategy = new DummyStrategy();
        _extensionManager.ActiveAdapter = adapter;
        _extensionManager.ActiveStrategy = strategy;

        string liveId = await _taskManager.StartLiveTaskAsync(CreateLiveConfig(), CancellationToken.None);
        string btId = await _taskManager.StartBacktestTaskAsync(CreateBacktestConfig(), CancellationToken.None);
        string optId = await _taskManager.StartOptimizationTaskAsync(CreateOptimizationConfig(), CancellationToken.None);

        Assert.Equal(3, _taskManager.AllTasks.Count);

        await _taskManager.StopAllUserTasksAsync(CancellationToken.None);

        Assert.Empty(_taskManager.AllTasks);
        Assert.Equal(1, _kernelService.StopLiveCallCount);
    }

    [Fact]
    public async Task StopAllTasksAsync_ClearsAllTasksAndWaitsForThreads()
    {
        using var adapter = new DummyAdapter();
        using var strategy = new DummyStrategy();
        _extensionManager.ActiveAdapter = adapter;
        _extensionManager.ActiveStrategy = strategy;

        string liveId = await _taskManager.StartLiveTaskAsync(CreateLiveConfig(), CancellationToken.None);
        string btId = await _taskManager.StartBacktestTaskAsync(CreateBacktestConfig(), CancellationToken.None);

        await _taskManager.StopAllTasksAsync(CancellationToken.None);

        Assert.Empty(_taskManager.AllTasks);
        Assert.Empty(_taskManager.RunningTasks);
    }

    [Fact]
    public async Task GetTaskStateAsync_And_GetTaskResultAsync_Handling()
    {
        var config = CreateLiveConfig();
        string taskId = await _taskManager.StartLiveTaskAsync(config, CancellationToken.None);

        var state = await _taskManager.GetTaskStateAsync(taskId, CancellationToken.None);
        Assert.NotNull(state);

        // Running task returns null for GetTaskResultAsync
        var result = await _taskManager.GetTaskResultAsync(taskId, CancellationToken.None);
        Assert.Null(result);

        await _taskManager.StopLiveTaskAsync(taskId, CancellationToken.None);

        // Missing task throws
        await Assert.ThrowsAsync<EngineException>(() =>
            _taskManager.GetTaskStateAsync("nonexistent", CancellationToken.None));
        await Assert.ThrowsAsync<EngineException>(() =>
            _taskManager.GetTaskResultAsync("nonexistent", CancellationToken.None));
    }

    // ─── Test Doubles ────────────────────────────────────────────────────────────

    private sealed class FakeKernelService : IKernelService
    {
        public int StartLiveCallCount
        {
            get; private set;
        }
        public int StopLiveCallCount
        {
            get; private set;
        }
        public int PauseLiveCallCount
        {
            get; private set;
        }
        public int ResumeLiveCallCount
        {
            get; private set;
        }
        public int InjectGenesCallCount
        {
            get; private set;
        }
        public double[]? LastInjectedGenes
        {
            get; private set;
        }

        public int StartBacktestCallCount
        {
            get; private set;
        }
        public int StartOptimizationCallCount
        {
            get; private set;
        }
        public int PauseOptimizationCallCount
        {
            get; private set;
        }
        public int ResumeOptimizationCallCount
        {
            get; private set;
        }

        public Task<string> StartLiveAsync(LiveInput input, CancellationToken cancellationToken)
        {
            StartLiveCallCount++;
            return Task.FromResult($"kernel_live_{Guid.NewGuid():N}");
        }

        public Task StopLiveAsync(string taskId, CancellationToken cancellationToken)
        {
            StopLiveCallCount++;
            return Task.CompletedTask;
        }

        public Task PauseLiveAsync(string taskId, CancellationToken cancellationToken)
        {
            PauseLiveCallCount++;
            return Task.CompletedTask;
        }

        public Task ResumeLiveAsync(string taskId, CancellationToken cancellationToken)
        {
            ResumeLiveCallCount++;
            return Task.CompletedTask;
        }

        public Task InjectGenesAsync(string taskId, double[] genes, CancellationToken cancellationToken)
        {
            InjectGenesCallCount++;
            LastInjectedGenes = genes;
            return Task.CompletedTask;
        }

        public Task<KernelLiveState> GetLiveStateAsync(string taskId, CancellationToken cancellationToken)
        {
            return Task.FromResult(new KernelLiveState
            {
                IsLive = true,
                Balance = 10000.0,
                Equity = 10000.0,
                Drawdown = 0.0,
                Positions = [],
                Orders = []
            });
        }

        public Task<string> StartBacktestAsync(IAdapterCapability adapter, IStrategyCapability strategy, BacktestConfiguration config, CancellationToken cancellationToken)
        {
            StartBacktestCallCount++;
            return Task.FromResult($"kernel_bt_{Guid.NewGuid():N}");
        }

        public Task<BacktestResult?> GetBacktestResultAsync(string taskId, CancellationToken cancellationToken) =>
            Task.FromResult<BacktestResult?>(new BacktestResult { Balance = 10000.0, TotalTrades = 0 });

        public Task<string> StartOptimizationAsync(OptimizationInput input, CancellationToken cancellationToken)
        {
            StartOptimizationCallCount++;
            return Task.FromResult($"kernel_opt_{Guid.NewGuid():N}");
        }

        public Task<ChromosomeKernel> GetOptimizationResultAsync(string taskId, CancellationToken cancellationToken) =>
            Task.FromResult(new ChromosomeKernel(SampleGenes, fitness: 100.0));

        private int _currentGeneration;
        public Task<GeneticOptimizerState> StepOptimizationAsync(string taskId, CancellationToken cancellationToken)
        {
            _currentGeneration++;
            return Task.FromResult(new GeneticOptimizerState
            {
                CurrentGeneration = _currentGeneration,
                Population = SamplePopulation,
                Evaluated = true,
                BestOverallFitness = 50.0
            });
        }

        public Task<GeneticOptimizerState?> GetOptimizationCheckpointAsync(string taskId, CancellationToken cancellationToken) =>
            Task.FromResult<GeneticOptimizerState?>(new GeneticOptimizerState
            {
                CurrentGeneration = 0,
                Population = SamplePopulation,
                Evaluated = true
            });

        public Task SetOptimizationCheckpointAsync(string taskId, GeneticOptimizerState state, bool invalidateFitness, CancellationToken cancellationToken) =>
            Task.CompletedTask;

        public Task PauseOptimizationAsync(string taskId, CancellationToken cancellationToken)
        {
            PauseOptimizationCallCount++;
            return Task.CompletedTask;
        }

        public Task ResumeOptimizationAsync(string taskId, CancellationToken cancellationToken)
        {
            ResumeOptimizationCallCount++;
            return Task.CompletedTask;
        }
    }

    private sealed class FakeExtensionManager : IExtensionManager
    {
        public IAdapterCapability? ActiveAdapter
        {
            get; set;
        }
        public IStrategyCapability? ActiveStrategy
        {
            get; set;
        }
        public INeuralNetworkModel? ActiveNeuralNetwork
        {
            get; set;
        }
        public IHookRegistry HookRegistry { get; } = new global::Kernel.Hooks.HookRegistry();

        public Task DiscoverExtensionsAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ReloadExtensionsAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ActivateExtensionsAsync(string adapterName, string strategyName, string? nnModelName, string[] hookPluginNames, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeployExtensionAsync(string name, byte[] packageBytes, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task RemoveExtensionAsync(string name, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> GetManifestAsync(CancellationToken cancellationToken) => Task.FromResult<object>(new object());
        public IStrategyCapability? CreateTransientStrategy(string strategyName) => null;
        public void EnableBehaviorLoggingOnStrategy(string sessionId, int snapshotIntervalSeconds = 10)
        {
        }
        public void DisableBehaviorLoggingOnStrategy()
        {
        }
        public void RecordSnapshotOnStrategy()
        {
        }
    }

    private sealed class DummyAdapter : IAdapterCapability, IDisposable
    {
        public string Name => "TestAdapter";
        public IMarketCalculator Calculator => null!;
        public bool IsConnected => true;
        public bool SupportsHistoricalData => true;
        public bool SupportsLiveData => false;
        public bool SupportsExecution => false;
        public TimeFrame[]? GetSupportedTimeframes(string symbol) => null;
        public Task<bool> ConnectAsync(CancellationToken ct) => Task.FromResult(true);
        public Task DisconnectAsync() => Task.CompletedTask;
        public Task<HistoricalDataResponse> FetchHistoryToBinaryFileAsync(HistoricalDataRequest r, CancellationToken ct) => Task.FromResult(new HistoricalDataResponse());
        public Task DeleteHistoryFileAsync(string path) => Task.CompletedTask;
        public Task NotifyFileSafeToDeleteAsync(string path) => Task.CompletedTask;
        public Task SubscribeAsync(string symbol) => Task.CompletedTask;
        public Task UnsubscribeAsync(string symbol) => Task.CompletedTask;
#pragma warning disable CS0067
        public event Action<string, Sdk.Shared.Tick>? OnTickReceived;
        public event Action<ExecutionReport>? OnExecutionUpdate;
#pragma warning restore CS0067
        public Task<AdapterOrderResponse> ExecuteOrderAsync(AdapterOrderRequest r) => Task.FromResult(new AdapterOrderResponse());
        public Task<AdapterOrderResponse> ModifyOrderAsync(long t, double? sl, double? tp, double? price) => Task.FromResult(new AdapterOrderResponse());
        public Task<AdapterOrderResponse> ClosePositionAsync(long t, double? v) => Task.FromResult(new AdapterOrderResponse());
        public Task<AdapterOrderResponse> CancelAsync(long t) => Task.FromResult(new AdapterOrderResponse());
        public Task<(double Balance, double Equity)> GetAccountInfoAsync(CancellationToken ct) => Task.FromResult((10000.0, 10000.0));
        public Task<IReadOnlyList<Position>> GetActivePositionsAsync() => Task.FromResult<IReadOnlyList<Position>>([]);
        public Task<IReadOnlyList<Order>> GetPendingOrdersAsync() => Task.FromResult<IReadOnlyList<Order>>([]);
        public Task<SymbolProperties?> GetSymbolPropertiesAsync(string s, CancellationToken ct = default) => Task.FromResult<SymbolProperties?>(null);
        public void Dispose()
        {
        }
    }

    private sealed class DummyStrategy : IStrategyCapability, IDisposable
    {
        public string Name => "TestStrategy";
        public Sdk.Shared.StrategySpecification Specification => new()
        {
            InitialBalance = 10000,
            Leverage = 100,
            RequestedSymbols = [new Sdk.Shared.SymbolRequest { Symbol = "EURUSD", TimeFrames = [Sdk.Shared.TimeFrame.M1] }]
        };
        public int TotalGeneCount => 2;
        public bool RequiresNeuralNetwork => false;
        public INeuralNetworkModel? NeuralNetwork
        {
            get; set;
        }

        public void InjectGenes(double[] genes)
        {
        }
        public double[] ExportGenes() => Array.Empty<double>();
        public Task OnConfigureAsync(Sdk.Shared.StrategySpecification spec) => Task.CompletedTask;
        public Task OnStartAsync(IIndicatorRegistry indicators) => Task.CompletedTask;
        public void OnTick(string symbol, Sdk.Shared.Tick tick)
        {
        }
        public Task OnStopAsync() => Task.CompletedTask;
        public void Dispose()
        {
        }
    }
}
