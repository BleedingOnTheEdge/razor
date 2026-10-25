// -----------------------------------------------------------------------------
// <copyright file="KernelService.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------
using Engine.Extensions;
using Engine.Management.Tasks;
using global::Kernel.Backtesting;
using global::Kernel.Brokers;
using global::Kernel.Clock;
using global::Kernel.Configuration;
using global::Kernel.Indicators;
using global::Kernel.Messaging;
using global::Kernel.Optimization;
using global::Kernel.Telemetry;
using Sdk.Hooks;
using Sdk.Shared;
using Sdk.Slots.Adapter;
using Sdk.Slots.NeuralNetwork;
using Sdk.Slots.Strategy;
using Shared;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Collections.Immutable;
using ChromosomeKernel = global::Kernel.Optimization.Chromosome;

namespace Engine.Kernel;

internal sealed partial class KernelService
{
    public async Task<string> StartOptimizationAsync(OptimizationInput input, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(input);
        string taskId = $"opt_{Guid.NewGuid():N}";
        _logOptimizationStarted(_logger, taskId, null);

        var adapter = !string.IsNullOrWhiteSpace(input.AdapterName)
            ? (_extensionManager.CreateTransientAdapter(input.AdapterName)
               ?? _extensionManager.CreateTransientAdapter("MockPaperTradingAdapter")
               ?? _extensionManager.ActiveAdapter)
            : (_extensionManager.ActiveAdapter ?? _extensionManager.CreateTransientAdapter("MockPaperTradingAdapter"));
        adapter ??= _extensionManager.CreateTransientAdapter("MockPaperTradingAdapter")
            ?? _extensionManager.CreateTransientAdapter("PaperBroker")
            ?? new Sdk.Slots.Adapter.MockPaperTradingAdapter();

        var strategy = !string.IsNullOrWhiteSpace(input.StrategyName)
            ? (_extensionManager.CreateTransientStrategy(input.StrategyName)
               ?? _extensionManager.CreateTransientStrategy("TrendFollowing")
               ?? _extensionManager.ActiveStrategy)
            : (_extensionManager.ActiveStrategy ?? _extensionManager.CreateTransientStrategy("TrendFollowing"));
#pragma warning disable CA2000
        strategy ??= _extensionManager.CreateTransientStrategy("TrendFollowing")
            ?? _extensionManager.CreateTransientStrategy("TrendFollowingStrategy")
            ?? (input.StrategyName != null && (input.StrategyName.Contains("Mean", StringComparison.OrdinalIgnoreCase) || input.StrategyName.Contains("Pairs", StringComparison.OrdinalIgnoreCase))
                ? new Sdk.Slots.Strategy.MeanRevertingPairsStrategy()
                : new Sdk.Slots.Strategy.TrendFollowingStrategy());
#pragma warning restore CA2000

        var symbolProperties = new Dictionary<string, SymbolProperties>();
        var tickStreams = new List<IReadOnlyList<Tick>>();
        var mappedLists = new List<MemoryMappedTickList>();

        try
        {
            foreach (string symbol in input.Symbols)
            {
                var props = await adapter.GetSymbolPropertiesAsync(symbol, cancellationToken).ConfigureAwait(false);
                if (props == null)
                {
                    _logOptimizationDataFetchFailed(_logger, symbol, taskId, null);
                    throw new InvalidOperationException($"Symbol properties for {symbol} not available.");
                }
                symbolProperties[symbol] = props;

                var request = new HistoricalDataRequest
                {
                    Symbol = symbol,
                    StartTime = input.StartDate,
                    EndTime = input.EndDate,
                    RetentionPolicy = DataActionPolicy.DeleteAfterTask
                };
                var response = await adapter.FetchHistoryToBinaryFileAsync(request, cancellationToken).ConfigureAwait(false);
                if (!response.Success)
                {
                    throw new InvalidOperationException($"Failed to fetch history for {symbol}: {response.ErrorMessage}");
                }

                var mmList = new MemoryMappedTickList(response.BinaryFilePath);
                mappedLists.Add(mmList);
                tickStreams.Add(mmList);
            }

            var timeframeEnums = input.Timeframes
                .Select(ParseTimeFrame)
                .Distinct()
                .ToArray();

            var symbolRequests = input.Symbols.Select(s =>
                new SymbolRequest(s, ImmutableArray.Create(timeframeEnums)))
                .ToImmutableArray();

            var strategySpec = new StrategySpecification
            {
                InitialBalance = input.InitialBalance,
                Leverage = input.Leverage,
                RequestedSymbols = symbolRequests
            };
            strategySpec.Validate();

            var execSpec = new ExecutionSpecification
            {
                StartDate = input.StartDate,
                EndDate = input.EndDate,
                MaxParallelThreads = input.MaxParallelThreads,
                LatencyTicks = 0,
                WarmupWindowCount = 0,
                MaxOpenPositions = 5,
                StopOutLevel = 0.5,
                GeneInitializationSeed = null
            };
            execSpec.Validate();

            INeuralNetworkModel? nnModel = null;
            if (!string.IsNullOrEmpty(input.NeuralNetworkName))
            {
                nnModel = _extensionManager.ActiveNeuralNetwork;
                if (nnModel == null)
                {
                    throw new InvalidOperationException($"Neural network model '{input.NeuralNetworkName}' not active.");
                }
            }

            // Get currency converter
            ICurrencyConverter? converter = null;
            if (adapter is IHasCurrencyConverter hasConverter)
            {
                converter = hasConverter.CurrencyConverter;
            }

            var optSpec = new OptimizationSpecification
            {
                MasterSeed = input.MasterSeed,
                Generations = input.Generations,
                PopulationSize = input.PopulationSize,
                MutationRate = input.MutationRate,
                CrossoverRate = input.CrossoverRate,
                ElitismPct = input.ElitismPct,
                TournamentSize = input.TournamentSize,
                StagnationGenerationsBeforeHyper = input.StagnationGenerationsBeforeHyper,
                MaxParallelThreads = input.MaxParallelThreads
            };

            var schema = GeneInjector.ExtractSchema(strategy.GetType());

            var runner = new OptimizationRunner(
                optSpec,
                schema,
                (CoreMetrics)_metrics,
                _hookRegistry.Optimization,
                nnModel,
                _messageBus,
                _hookRegistry);

            async Task<double> EvaluateChromosome(ChromosomeKernel chromo, CancellationToken ct)
            {
                string evalStratName = !string.IsNullOrWhiteSpace(input.StrategyName) ? input.StrategyName : "TrendFollowing";
                var transientStrategy = _extensionManager.CreateTransientStrategy(evalStratName)
                    ?? _extensionManager.CreateTransientStrategy("TrendFollowing")
                    ?? strategy;

                try
                {
                    transientStrategy.InjectGenes(chromo.Genes);

                    var backtestInput = new BacktestInput
                    {
                        TickStreams = tickStreams.ToArray(),
                        Symbols = input.Symbols,
                        Strategy = transientStrategy,
                        StrategySpecification = strategySpec,
                        ExecutionSpecification = execSpec,
                        MarketCalculator = adapter.Calculator,
                        SymbolProperties = symbolProperties,
                        Genes = chromo.Genes,
                        GeneInitializationSeed = null,
                        NeuralNetwork = nnModel,
                        Progress = null,
                        MessageBus = _messageBus,
                        Metrics = _metrics,
                        HookRegistry = _hookRegistry,
                        CurrencyConverter = converter,
                        AccountCurrency = input.AccountCurrency
                    };

                    var runnerBt = new BacktestRunner();
                    var result = await runnerBt.RunAsync(backtestInput, ct).ConfigureAwait(false);
                    return result.Balance - input.InitialBalance;
                }
                finally
                {
                    (transientStrategy as IDisposable)?.Dispose();
                }
            }

            if (input.InitialState != null)
            {
                runner.LoadState(input.InitialState);
            }

            CancellationTokenSource cts;
#pragma warning disable CA2000
            cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            var pauseGate = new ManualResetEventSlim(!input.IsSteppable);
#pragma warning restore CA2000
            var taskState = new TaskState(
                cts,
                Runner: runner,
                MappedTickLists: mappedLists,
                Evaluator: EvaluateChromosome,
                PauseGate: pauseGate,
                IsSteppable: input.IsSteppable);

            try
            {
                _activeTasks[taskId] = taskState;
            }
            catch
            {
                cts.Dispose();
                pauseGate.Dispose();
                throw;
            }

            if (!input.IsSteppable)
            {
                _ = Task.Run(async () =>
            {
                try
                {
                    var best = await runner.RunAsync(EvaluateChromosome, cts.Token).ConfigureAwait(false);
                    _activeTasks[taskId] = _activeTasks[taskId] with { Result = best };
                    _logOptimizationCompleted(_logger, taskId, null);
                }
                catch (OperationCanceledException)
                {
                    if (_activeTasks.TryRemove(taskId, out var state))
                    {
                        state.DisposeCts();
                        state.DisposePauseGate();
                        state.DisposeMappedTickLists();
                    }
                    _logOptimizationCancelled(_logger, taskId, null);
                }
                catch (Exception ex)
                {
                    if (_activeTasks.TryRemove(taskId, out var state))
                    {
                        state.DisposeCts();
                        state.DisposePauseGate();
                        state.DisposeMappedTickLists();
                    }
                    _logOptimizationFailed(_logger, taskId, ex);
                }
                finally
                {
                    if (_activeTasks.TryGetValue(taskId, out var state))
                    {
                        state.DisposeMappedTickLists();
                    }
                }
            }, cts.Token);
            }

            return taskId;
        }
        catch
        {
            foreach (var mm in mappedLists)
            {
                mm?.Dispose();
            }

            throw;
        }
    }

    /// <inheritdoc/>
    public Task<ChromosomeKernel> GetOptimizationResultAsync(string taskId, CancellationToken cancellationToken)
    {
        if (_activeTasks.TryGetValue(taskId, out var state) && state.Result is ChromosomeKernel best)
        {
            return Task.FromResult(best);
        }

        var dummy = new ChromosomeKernel(1);
        dummy.Genes[0] = 0;
        dummy.Fitness = ChromosomeKernel.NotEvaluated;
        dummy.Generation = 0;
        dummy.IndividualIndex = 0;
        dummy.Seed = 0;
        return Task.FromResult(dummy);
    }

    /// <inheritdoc/>
    public async Task<GeneticOptimizerState> StepOptimizationAsync(string taskId, CancellationToken cancellationToken)
    {
        if (!_activeTasks.TryGetValue(taskId, out var state) || state.Runner == null || state.Evaluator == null)
        {
            throw new KeyNotFoundException($"Active optimization task '{taskId}' not found.");
        }

        var nextState = await state.Runner.StepAsync(state.Evaluator, cancellationToken).ConfigureAwait(false);
        if (state.Runner.BestSolution != null)
        {
            _activeTasks[taskId] = state with { Result = state.Runner.BestSolution };
        }

        return nextState;
    }

    /// <inheritdoc/>
    public Task<GeneticOptimizerState?> GetOptimizationCheckpointAsync(string taskId, CancellationToken cancellationToken)
    {
        if (_activeTasks.TryGetValue(taskId, out var state) && state.Runner != null)
        {
            return Task.FromResult<GeneticOptimizerState?>(state.Runner.SaveState());
        }

        return Task.FromResult<GeneticOptimizerState?>(null);
    }

    /// <inheritdoc/>
    public Task SetOptimizationCheckpointAsync(string taskId, GeneticOptimizerState state, bool invalidateFitness, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(state);
        if (!_activeTasks.TryGetValue(taskId, out var taskState) || taskState.Runner == null)
        {
            throw new KeyNotFoundException($"Active optimization task '{taskId}' not found.");
        }

        taskState.Runner.LoadState(state);
        if (invalidateFitness)
        {
            taskState.Runner.InvalidateFitness();
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task PauseOptimizationAsync(string taskId, CancellationToken cancellationToken)
    {
        if (_activeTasks.TryGetValue(taskId, out var state))
        {
            state.PauseGate?.Reset();
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task ResumeOptimizationAsync(string taskId, CancellationToken cancellationToken)
    {
        if (_activeTasks.TryGetValue(taskId, out var state) && state.Runner != null)
        {
            state.PauseGate?.Set();
            if (state.IsSteppable && state.Result == null)
            {
                // Transition to continuous execution
                _activeTasks[taskId] = state with { IsSteppable = false };
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var best = await state.Runner.RunAsync(state.Evaluator!, state.Cts.Token).ConfigureAwait(false);
                        _activeTasks[taskId] = _activeTasks[taskId] with { Result = best };
                        _logOptimizationCompleted(_logger, taskId, null);
                    }
                    catch (OperationCanceledException)
                    {
                        if (_activeTasks.TryRemove(taskId, out var s))
                        {
                            s.DisposeCts();
                            s.DisposePauseGate();
                            s.DisposeMappedTickLists();
                        }
                        _logOptimizationCancelled(_logger, taskId, null);
                    }
                    catch (Exception ex)
                    {
                        if (_activeTasks.TryRemove(taskId, out var s))
                        {
                            s.DisposeCts();
                            s.DisposePauseGate();
                            s.DisposeMappedTickLists();
                        }
                        _logOptimizationFailed(_logger, taskId, ex);
                    }
                }, state.Cts.Token);
            }
        }

        return Task.CompletedTask;
    }

    private static TimeFrame ParseTimeFrame(string tf)
    {
        return tf.ToUpperInvariant() switch
        {
            "TICK" => TimeFrame.Tick,
            "M1" => TimeFrame.M1,
            "M5" => TimeFrame.M5,
            "M15" => TimeFrame.M15,
            "M30" => TimeFrame.M30,
            "H1" => TimeFrame.H1,
            "H2" => TimeFrame.H2,
            "H3" => TimeFrame.H3,
            "H4" => TimeFrame.H4,
            "H6" => TimeFrame.H6,
            "H12" => TimeFrame.H12,
            "D1" => TimeFrame.D1,
            "D2" => TimeFrame.D2,
            "D3" => TimeFrame.D3,
            "W1" => TimeFrame.W1,
            "MN1" => TimeFrame.MN1,
            _ => TimeFrame.Tick
        };
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _taskLock.Dispose();
        foreach (var kv in _activeTasks)
        {
            kv.Value.DisposeCts();
            kv.Value.DisposePauseGate();
            kv.Value.DisposeIndicatorRegistry();
            kv.Value.DisposeTickWindow();
            kv.Value.DisposeMappedTickLists();
        }
        _activeTasks.Clear();
    }
}
