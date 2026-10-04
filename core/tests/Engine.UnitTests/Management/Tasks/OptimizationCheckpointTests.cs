// -----------------------------------------------------------------------------
// <copyright file="OptimizationCheckpointTests.cs" company="Razor Platform">
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
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Sdk.Hooks;
using Sdk.Shared;
using Sdk.Slots.Adapter;
using Sdk.Slots.NeuralNetwork;
using Sdk.Slots.Strategy;
using Xunit;
using ChromosomeKernel = global::Kernel.Optimization.Chromosome;

/// <summary>
/// Triple-path test suite verifying step-by-step optimization execution, checkpoint fingerprinting,
/// state divergence tracking, persistence durability, and fault handling in <see cref="OptimizationTask"/> and <see cref="TaskManager"/>.
/// </summary>
public sealed class OptimizationCheckpointTests : IDisposable
{
    private readonly string _testDatabasePath;

    public OptimizationCheckpointTests()
    {
        _testDatabasePath = Path.Combine(Path.GetTempPath(), $"test_engine_state_{Guid.NewGuid():N}.db");
    }

    public void Dispose()
    {
        if (File.Exists(_testDatabasePath))
        {
            try
            {
                File.Delete(_testDatabasePath);
            }
            catch
            {
                // Ignore cleanup errors on temp files
            }
        }
    }

    private static readonly double[] DefaultGenes = [1.5, 2.5];
    private static readonly double[] ModifiedGenes = [99.0, 88.0];

    private static GeneticOptimizerState CreateState(int generation = 0, double fitness = 10.0)
    {
        var chromo = new ChromosomeKernel(DefaultGenes, fitness: fitness, generation: generation);
        return new GeneticOptimizerState
        {
            CurrentGeneration = generation,
            Evaluated = true,
            Population = [chromo],
            BestOverallFitness = fitness,
            RandomState0 = 123456789UL,
            RandomState1 = 987654321UL
        };
    }

    // ─── 1. Primary Business Path ────────────────────────────────────────────────

    [Fact]
    public async Task Primary_OptimizationTask_StepAsync_AdvancesStepsAndComputesDeterministicCheckpoint()
    {
        var kernel = new FakeKernelOptimizationService();
        var taskManager = new StubTaskManager();
        var logger = NullLogger<OptimizationTask>.Instance;

        using var task = new OptimizationTask(
            taskId: "task-opt-1",
            config: new object(),
            logger: logger,
            taskManager: taskManager,
            kernelService: kernel,
            kernelTaskId: "kernel-opt-1",
            isSteppable: true);

        // Step 1: Advance to generation 1
        var cp1 = await task.StepAsync(1, CancellationToken.None);

        Assert.Equal("task-opt-1", cp1.ComputationId);
        Assert.Equal(1, cp1.StepIndex);
        Assert.NotNull(cp1.Fingerprint);
        Assert.Equal(64, cp1.Fingerprint.Length);
        Assert.Null(cp1.ParentFingerprint);
        Assert.False(cp1.Diverged);
        Assert.Empty(cp1.Interventions);

        // Step 2: Advance by 2 generations (to generation 3)
        var cp2 = await task.StepAsync(2, CancellationToken.None);

        Assert.Equal(3, cp2.StepIndex);
        Assert.NotEqual(cp1.Fingerprint, cp2.Fingerprint);
        Assert.NotNull(cp2.ParentFingerprint);
        Assert.False(cp2.Diverged);

        // Verify task state snapshot
        var rawState = await task.GetStateAsync(CancellationToken.None);
        Assert.NotNull(rawState);
    }

    [Fact]
    public async Task Primary_OptimizationTask_GetCheckpointAsync_ReturnsActiveCheckpoint()
    {
        var kernel = new FakeKernelOptimizationService();
        var taskManager = new StubTaskManager();
        var logger = NullLogger<OptimizationTask>.Instance;

        using var task = new OptimizationTask(
            taskId: "task-opt-2",
            config: new object(),
            logger: logger,
            taskManager: taskManager,
            kernelService: kernel,
            kernelTaskId: "kernel-opt-2",
            isSteppable: true);

        var cp = await task.GetCheckpointAsync(CancellationToken.None);
        var cpCached = await task.GetCheckpointAsync(CancellationToken.None);

        Assert.Equal("task-opt-2", cp.ComputationId);
        Assert.Equal(0, cp.StepIndex);
        Assert.NotNull(cp.Fingerprint);
        Assert.False(cp.Diverged);
        Assert.Same(cp, cpCached);
    }

    [Fact]
    public async Task Primary_TaskManager_StepComputationAsync_PersistsUpdatedState()
    {
        using var stateManager = new StateManager(_testDatabasePath);
        var kernel = new FakeKernelOptimizationService();
        var extensionManager = new FakeExtensionManager();
        var logger = NullLogger<TaskManager>.Instance;
        var loggerFactory = NullLoggerFactory.Instance;

        using var tm = new TaskManager(logger, stateManager, loggerFactory, kernel, extensionManager);

        var config = new Dictionary<string, object>
        {
            ["AdapterName"] = "TestAdapter",
            ["StrategyName"] = "TestStrategy",
            ["IsSteppable"] = true,
            ["Generations"] = 5
        };

        string taskId = await tm.StartOptimizationTaskAsync(config, CancellationToken.None);
        Assert.False(string.IsNullOrWhiteSpace(taskId));

        // Step 1 generation
        var cp = await tm.StepComputationAsync(taskId, 1, CancellationToken.None);

        Assert.Equal(1, cp.StepIndex);
        Assert.NotNull(cp.Fingerprint);

        // Verify persisted state in SQLite StateManager
        var persistedState = await stateManager.LoadOptimizationStateAsync(taskId, CancellationToken.None);
        Assert.NotNull(persistedState);
        Assert.Equal(1, persistedState.CurrentGeneration);
        Assert.Equal(cp.Fingerprint, persistedState.CheckpointFingerprint);
        Assert.NotNull(persistedState.OptimizerState);
    }

    [Fact]
    public async Task Primary_TaskManager_RestoreOptimizationTaskAsync_RestoresStateAndResumesStepping()
    {
        using var stateManager = new StateManager(_testDatabasePath);
        var kernel = new FakeKernelOptimizationService();
        var extensionManager = new FakeExtensionManager();
        var logger = NullLogger<TaskManager>.Instance;
        var loggerFactory = NullLoggerFactory.Instance;

        using var tm = new TaskManager(logger, stateManager, loggerFactory, kernel, extensionManager);

        var config = new Dictionary<string, object>
        {
            ["AdapterName"] = "TestAdapter",
            ["StrategyName"] = "TestStrategy",
            ["IsSteppable"] = true,
            ["Generations"] = 5
        };

        var restoredOptimizerState = CreateState(generation: 2, fitness: 42.0);
        string initialFingerprint = CheckpointFingerprint.Compute(restoredOptimizerState);

        var persistedState = new OptimizationState
        {
            TaskId = "opt_restored_1",
            Config = config,
            OptimizerState = restoredOptimizerState,
            CurrentGeneration = 2,
            BestFitness = 42.0,
            CheckpointFingerprint = initialFingerprint,
            Diverged = false,
            StartTime = DateTime.UtcNow
        };

        string? restoredTaskId = await tm.RestoreOptimizationTaskAsync(persistedState, CancellationToken.None);
        Assert.Equal("opt_restored_1", restoredTaskId);

        // Get checkpoint should reflect restored state at generation 2
        var checkpoint = await tm.GetCheckpointAsync("opt_restored_1", CancellationToken.None);
        Assert.Equal(2, checkpoint.StepIndex);
        Assert.Equal(initialFingerprint, checkpoint.Fingerprint);

        // Step forward from restored checkpoint
        var steppedCheckpoint = await tm.StepComputationAsync("opt_restored_1", 1, CancellationToken.None);
        Assert.Equal(3, steppedCheckpoint.StepIndex);
        Assert.Equal(initialFingerprint, steppedCheckpoint.ParentFingerprint);
    }

    [Fact]
    public async Task Primary_StateManager_OptimizationState_FullRoundTripSerialization()
    {
        using var stateManager = new StateManager(_testDatabasePath);

        var state = CreateState(generation: 3, fitness: 99.5);
        string fp = CheckpointFingerprint.Compute(state);

        var intervention = new InterventionRecord
        {
            StepIndex = 3,
            PreviousFingerprint = "PREV_HASH_123",
            NewFingerprint = fp,
            Actor = "TraderBob",
            TimestampUtc = DateTime.UtcNow,
            Reason = "Manual override for parameter safety"
        };

        var optState = new OptimizationState
        {
            TaskId = "opt-roundtrip-test",
            Config = new Dictionary<string, object> { ["Param1"] = "Val1" },
            OptimizerState = state,
            CurrentGeneration = 3,
            BestFitness = 99.5,
            StartTime = DateTime.UtcNow,
            CheckpointFingerprint = fp,
            ParentCheckpointFingerprint = "PARENT_FP_456",
            Diverged = true,
            Interventions = new[] { intervention }
        };

        await stateManager.SaveOptimizationStateAsync("opt-roundtrip-test", optState, CancellationToken.None);

        var loaded = await stateManager.LoadOptimizationStateAsync("opt-roundtrip-test", CancellationToken.None);

        Assert.NotNull(loaded);
        Assert.Equal("opt-roundtrip-test", loaded.TaskId);
        Assert.Equal(3, loaded.CurrentGeneration);
        Assert.Equal(99.5, loaded.BestFitness);
        Assert.Equal(fp, loaded.CheckpointFingerprint);
        Assert.Equal("PARENT_FP_456", loaded.ParentCheckpointFingerprint);
        Assert.True(loaded.Diverged);
        Assert.Single(loaded.Interventions);
        Assert.Equal("TraderBob", loaded.Interventions[0].Actor);
        Assert.Equal("Manual override for parameter safety", loaded.Interventions[0].Reason);

        Assert.NotNull(loaded.OptimizerState);
        Assert.Equal(3, loaded.OptimizerState.CurrentGeneration);
        Assert.Single(loaded.OptimizerState.Population);
        Assert.Equal(1.5, loaded.OptimizerState.Population[0].Genes[0]);
        Assert.Equal(2.5, loaded.OptimizerState.Population[0].Genes[1]);
        Assert.Equal(123456789UL, loaded.OptimizerState.RandomState0);
    }

    // ─── 2. Boundary & Stress Path ───────────────────────────────────────────────

    [Fact]
    public async Task Boundary_SetCheckpointAsync_WithoutAuditReason_ThrowsArgumentException()
    {
        var kernel = new FakeKernelOptimizationService();
        using var task = new OptimizationTask(
            taskId: "task-opt-div",
            config: new object(),
            logger: NullLogger<OptimizationTask>.Instance,
            taskManager: new StubTaskManager(),
            kernelService: kernel,
            kernelTaskId: "kernel-opt-div",
            isSteppable: true);

        var cp = await task.GetCheckpointAsync(CancellationToken.None);

        // Null reason must throw
        await Assert.ThrowsAsync<ArgumentException>(() =>
            task.SetCheckpointAsync(cp, null, CancellationToken.None));

        // Empty or whitespace reason must throw
        await Assert.ThrowsAsync<ArgumentException>(() =>
            task.SetCheckpointAsync(cp, "   ", CancellationToken.None));
    }

    [Fact]
    public async Task Boundary_SetCheckpointAsync_WithValidReason_MarksDivergedAndAppendsIntervention()
    {
        var kernel = new FakeKernelOptimizationService();
        using var task = new OptimizationTask(
            taskId: "task-opt-div-2",
            config: new object(),
            logger: NullLogger<OptimizationTask>.Instance,
            taskManager: new StubTaskManager(),
            kernelService: kernel,
            kernelTaskId: "kernel-opt-div-2",
            isSteppable: true);

        var initialCp = await task.GetCheckpointAsync(CancellationToken.None);
        string initialFp = initialCp.Fingerprint;

        // Mutate chromosome gene
        var modifiedChromo = new ChromosomeKernel(ModifiedGenes, fitness: 50.0, generation: 0);
        var modifiedState = initialCp.State with
        {
            Population = [modifiedChromo]
        };
        var modifiedCp = initialCp with
        {
            State = modifiedState
        };

        var updatedCp = await task.SetCheckpointAsync(modifiedCp, "Quant intervention: adjust initial parameter vector", CancellationToken.None);

        Assert.True(updatedCp.Diverged);
        Assert.True(task.Diverged);
        Assert.Single(updatedCp.Interventions);
        Assert.Equal("Quant intervention: adjust initial parameter vector", updatedCp.Interventions[0].Reason);
        Assert.Equal("User", updatedCp.Interventions[0].Actor);
        Assert.Equal(initialFp, updatedCp.Interventions[0].PreviousFingerprint);
        Assert.Equal(updatedCp.Fingerprint, updatedCp.Interventions[0].NewFingerprint);

        // Step forward after divergence: divergence flag must persist
        var steppedAfterDiv = await task.StepAsync(1, CancellationToken.None);
        Assert.True(steppedAfterDiv.Diverged);
        Assert.Single(steppedAfterDiv.Interventions);
        Assert.Equal(updatedCp.Fingerprint, steppedAfterDiv.ParentFingerprint);
    }

    // ─── 3. Negative / Fault Path ────────────────────────────────────────────────

    [Fact]
    public async Task Negative_StepAsync_WithZeroOrNegativeGenerations_ThrowsArgumentOutOfRangeException()
    {
        var kernel = new FakeKernelOptimizationService();
        using var task = new OptimizationTask(
            taskId: "task-opt-fault",
            config: new object(),
            logger: NullLogger<OptimizationTask>.Instance,
            taskManager: new StubTaskManager(),
            kernelService: kernel,
            kernelTaskId: "kernel-opt-fault");

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            task.StepAsync(0, CancellationToken.None));

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            task.StepAsync(-3, CancellationToken.None));
    }

    [Fact]
    public async Task Negative_SetCheckpointAsync_WithNullCheckpoint_ThrowsArgumentNullException()
    {
        var kernel = new FakeKernelOptimizationService();
        using var task = new OptimizationTask(
            taskId: "task-opt-fault-2",
            config: new object(),
            logger: NullLogger<OptimizationTask>.Instance,
            taskManager: new StubTaskManager(),
            kernelService: kernel,
            kernelTaskId: "kernel-opt-fault-2");

        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            task.SetCheckpointAsync(null!, "Valid reason", CancellationToken.None));
    }

    [Fact]
    public async Task Negative_TaskManager_Methods_WithNonExistentTask_ThrowEngineException()
    {
        using var stateManager = new StateManager(_testDatabasePath);
        using var tm = new TaskManager(
            NullLogger<TaskManager>.Instance,
            stateManager,
            NullLoggerFactory.Instance,
            new FakeKernelOptimizationService(),
            new FakeExtensionManager());

        await Assert.ThrowsAsync<EngineException>(() =>
            tm.StepComputationAsync("non-existent-task", 1, CancellationToken.None));

        await Assert.ThrowsAsync<EngineException>(() =>
            tm.GetCheckpointAsync("non-existent-task", CancellationToken.None));

        var fakeCp = new ComputationCheckpoint
        {
            ComputationId = "fake",
            StepIndex = 0,
            Fingerprint = "HASH",
            State = CreateState()
        };

        await Assert.ThrowsAsync<EngineException>(() =>
            tm.SetCheckpointAsync("non-existent-task", fakeCp, "Reason", CancellationToken.None));
    }

    [Fact]
    public async Task Negative_OptimizationTask_GetCheckpointAsync_WhenKernelReturnsNull_ThrowsInvalidOperationException()
    {
        var kernel = new FakeKernelOptimizationService();
        using var task = new OptimizationTask(
            taskId: "task-null-cp",
            config: new object(),
            logger: NullLogger<OptimizationTask>.Instance,
            taskManager: new StubTaskManager(),
            kernelService: kernel,
            kernelTaskId: "null-cp",
            isSteppable: true);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            task.GetCheckpointAsync(CancellationToken.None));
    }

    // ─── Test Doubles ────────────────────────────────────────────────────────────

    private sealed class FakeKernelOptimizationService : IKernelService
    {
        private GeneticOptimizerState _state = CreateState(generation: 0, fitness: 10.0);

        public Task<string> StartOptimizationAsync(OptimizationInput input, CancellationToken cancellationToken)
        {
            if (input.InitialState != null)
            {
                _state = input.InitialState;
            }
            return Task.FromResult($"k_opt_{Guid.NewGuid():N}");
        }

        public Task<GeneticOptimizerState> StepOptimizationAsync(string taskId, CancellationToken cancellationToken)
        {
            _state = CreateState(generation: _state.CurrentGeneration + 1, fitness: _state.BestOverallFitness + 1.0);
            return Task.FromResult(_state);
        }

        public Task<GeneticOptimizerState?> GetOptimizationCheckpointAsync(string taskId, CancellationToken cancellationToken)
        {
            if (taskId == "null-cp")
            {
                return Task.FromResult<GeneticOptimizerState?>(null);
            }

            return Task.FromResult<GeneticOptimizerState?>(_state);
        }

        public Task SetOptimizationCheckpointAsync(string taskId, GeneticOptimizerState state, bool invalidateFitness, CancellationToken cancellationToken)
        {
            _state = state;
            return Task.CompletedTask;
        }

        public Task<ChromosomeKernel> GetOptimizationResultAsync(string taskId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_state.Population[0]);
        }

        public Task PauseOptimizationAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task ResumeOptimizationAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task<string> StartLiveAsync(LiveInput input, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<Engine.Kernel.LiveState> GetLiveStateAsync(string taskId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task StopLiveAsync(string taskId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task PauseLiveAsync(string taskId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task ResumeLiveAsync(string taskId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task InjectGenesAsync(string taskId, double[] genes, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<string> StartBacktestAsync(IAdapterCapability adapter, IStrategyCapability strategy, BacktestConfiguration config, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<BacktestResult?> GetBacktestResultAsync(string taskId, CancellationToken cancellationToken) => throw new NotSupportedException();
    }

    private sealed class FakeExtensionManager : IExtensionManager
    {
        public IAdapterCapability? ActiveAdapter => new FakeAdapterCapability();
        public IStrategyCapability? ActiveStrategy => new FakeStrategyCapability();
        public INeuralNetworkModel? ActiveNeuralNetwork => null;
        public IHookRegistry HookRegistry => throw new NotSupportedException();

        public Task DiscoverExtensionsAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ReloadExtensionsAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ActivateExtensionsAsync(string adapterName, string strategyName, string? nnModelName, string[] hookPluginNames, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeployExtensionAsync(string name, byte[] binaryData, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task RemoveExtensionAsync(string name, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> GetManifestAsync(CancellationToken cancellationToken) => Task.FromResult<object>(new());
        public IStrategyCapability? CreateTransientStrategy(string strategyName) => new FakeStrategyCapability();
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

    private sealed class FakeAdapterCapability : IAdapterCapability
    {
        public string Name => "TestAdapter";
        public IMarketCalculator Calculator => null!;
        public bool IsConnected => false;
        public bool SupportsHistoricalData => true;
        public bool SupportsLiveData => false;
        public bool SupportsExecution => false;
        public TimeFrame[]? GetSupportedTimeframes(string symbol) => null;
        public Task<bool> ConnectAsync(CancellationToken ct) => Task.FromResult(false);
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
        public Task<(double, double)> GetAccountInfoAsync(CancellationToken ct) => Task.FromResult((0.0, 0.0));
        public Task<IReadOnlyList<Position>> GetActivePositionsAsync() => Task.FromResult<IReadOnlyList<Position>>([]);
        public Task<IReadOnlyList<Order>> GetPendingOrdersAsync() => Task.FromResult<IReadOnlyList<Order>>([]);
        public Task<SymbolProperties?> GetSymbolPropertiesAsync(string s, CancellationToken ct = default) => Task.FromResult<SymbolProperties?>(null);
    }

    private sealed class FakeStrategyCapability : IStrategyCapability
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
    }

    private sealed class StubTaskManager : ITaskManager
    {
        public IReadOnlyList<EngineTaskBase> RunningTasks => [];
        public IReadOnlyList<EngineTaskBase> AllTasks => [];
        public EngineTaskBase? GetTask(string taskId) => null;
        public DateTime? GetLastLiveTickTimestamp() => null;
        public Task<string> StartLiveTaskAsync(object config, CancellationToken cancellationToken) => Task.FromResult("live-1");
        public Task StopLiveTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string> StartBacktestTaskAsync(object input, CancellationToken cancellationToken) => Task.FromResult("backtest-1");
        public Task CancelBacktestTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string> StartOptimizationTaskAsync(object config, CancellationToken cancellationToken) => Task.FromResult("opt-1");
        public Task CancelOptimizationTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task PauseTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ResumeTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> GetTaskStateAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object>(new());
        public Task<object?> GetTaskResultAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object?>(null);
        public Task<object?> GetOptimizationResultAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object?>(null);
        public Task StopAllTasksAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task StopAllUserTasksAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task InjectGenesAsync(string taskId, double[] genes, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> GetLiveStateAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object>(new());
        public Task StopAllLiveTasksAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string?> RestoreLiveTaskAsync(Engine.Core.LiveState state, CancellationToken cancellationToken) => Task.FromResult<string?>("live-restored");
        public Task<global::Kernel.Optimization.ComputationCheckpoint> StepComputationAsync(string taskId, int generations, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<global::Kernel.Optimization.ComputationCheckpoint> GetCheckpointAsync(string taskId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<global::Kernel.Optimization.ComputationCheckpoint> SetCheckpointAsync(string taskId, global::Kernel.Optimization.ComputationCheckpoint checkpoint, string? reason, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<string?> RestoreOptimizationTaskAsync(OptimizationState state, CancellationToken cancellationToken) => Task.FromResult<string?>("opt-restored");
    }
}
