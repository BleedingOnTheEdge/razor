// -----------------------------------------------------------------------------
// <copyright file="KernelService.Backtest.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Kernel;

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

internal sealed partial class KernelService
{
    /// <inheritdoc/>
    public async Task<string> StartBacktestAsync(
        IAdapterCapability adapter,
        IStrategyCapability strategy,
        BacktestConfiguration config,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(adapter);
        ArgumentNullException.ThrowIfNull(strategy);
        ArgumentNullException.ThrowIfNull(config);

        string taskId = $"bt_{Guid.NewGuid():N}";
        _logBacktestStarted(_logger, taskId, null);

        CancellationTokenSource cts;
#pragma warning disable CA2000
        cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
#pragma warning restore CA2000
        var mappedLists = new List<MemoryMappedTickList>();
        var taskState = new TaskState(cts, MappedTickLists: mappedLists);

        try
        {
            _activeTasks[taskId] = taskState;
        }
        catch
        {
            cts.Dispose();
            throw;
        }

        _ = Task.Run(async () =>
        {
            try
            {
                var symbolProperties = new Dictionary<string, SymbolProperties>();
                var tickStreams = new List<IReadOnlyList<Tick>>();

                foreach (string symbol in config.Symbols)
                {
                    var props = await adapter.GetSymbolPropertiesAsync(symbol, cts.Token).ConfigureAwait(false);
                    if (props == null)
                    {
                        _logBacktestDataFetchFailed(_logger, symbol, taskId, null);
                        throw new InvalidOperationException($"Symbol properties for {symbol} not available.");
                    }
                    symbolProperties[symbol] = props;

                    var request = new HistoricalDataRequest
                    {
                        Symbol = symbol,
                        StartTime = config.StartDate,
                        EndTime = config.EndDate,
                        RetentionPolicy = DataActionPolicy.DeleteAfterTask
                    };
                    var response = await adapter.FetchHistoryToBinaryFileAsync(request, cts.Token).ConfigureAwait(false);
                    if (!response.Success)
                    {
                        throw new InvalidOperationException($"Failed to fetch history for {symbol}: {response.ErrorMessage}");
                    }

                    var mmList = new MemoryMappedTickList(response.BinaryFilePath);
                    mappedLists.Add(mmList);
                    tickStreams.Add(mmList);
                }

                var timeframeEnums = config.Timeframes
                    .Select(ParseTimeFrame)
                    .Distinct()
                    .ToArray();

                var symbolRequests = config.Symbols.Select(s =>
                    new SymbolRequest(s, ImmutableArray.Create(timeframeEnums)))
                    .ToImmutableArray();

                var strategySpec = new StrategySpecification
                {
                    InitialBalance = config.InitialBalance,
                    Leverage = config.Leverage,
                    RequestedSymbols = symbolRequests
                };
                strategySpec.Validate();

                var execSpec = new ExecutionSpecification
                {
                    StartDate = config.StartDate,
                    EndDate = config.EndDate,
                    MaxParallelThreads = config.MaxParallelThreads,
                    LatencyTicks = config.LatencyTicks,
                    WarmupWindowCount = config.WarmupWindowCount,
                    MaxOpenPositions = config.MaxOpenPositions,
                    StopOutLevel = config.StopOutLevel,
                    GeneInitializationSeed = config.GeneInitializationSeed
                };
                execSpec.Validate();

                INeuralNetworkModel? nnModel = null;
                if (!string.IsNullOrEmpty(config.NeuralNetworkName))
                {
                    nnModel = _extensionManager.ActiveNeuralNetwork;
                    if (nnModel == null)
                    {
                        throw new InvalidOperationException($"Neural network model '{config.NeuralNetworkName}' not active.");
                    }
                }

                // Get currency converter if supported
                ICurrencyConverter? converter = null;
                if (adapter is IHasCurrencyConverter hasConverter)
                {
                    converter = hasConverter.CurrencyConverter;
                }

                var backtestInput = new BacktestInput
                {
                    TickStreams = tickStreams.ToArray(),
                    Symbols = config.Symbols,
                    Strategy = strategy,
                    StrategySpecification = strategySpec,
                    ExecutionSpecification = execSpec,
                    MarketCalculator = adapter.Calculator,
                    SymbolProperties = symbolProperties,
                    Genes = config.Genes.Length > 0 ? config.Genes : null,
                    GeneInitializationSeed = config.GeneInitializationSeed,
                    NeuralNetwork = nnModel,
                    Progress = null,
                    MessageBus = _messageBus,
                    Metrics = _metrics,
                    HookRegistry = _hookRegistry,
                    CurrencyConverter = converter,
                    AccountCurrency = config.AccountCurrency
                };

                var runner = new BacktestRunner();
                var result = await runner.RunAsync(backtestInput, cts.Token).ConfigureAwait(false);

                if (_activeTasks.TryGetValue(taskId, out var state))
                {
                    _activeTasks[taskId] = state with { Result = result };
                }

                _logBacktestCompleted(_logger, taskId, null);
            }
            catch (OperationCanceledException)
            {
                if (_activeTasks.TryRemove(taskId, out var state))
                {
                    state.DisposeCts();
                    state.DisposeMappedTickLists();
                }
                _logBacktestCancelled(_logger, taskId, null);
            }
            catch (Exception ex)
            {
                if (_activeTasks.TryRemove(taskId, out var state))
                {
                    state.DisposeCts();
                    state.DisposeMappedTickLists();
                }
                _logBacktestFailed(_logger, taskId, ex);
            }
            finally
            {
                if (_activeTasks.TryGetValue(taskId, out var state))
                {
                    state.DisposeMappedTickLists();
                }
            }
        }, cts.Token);

        return taskId;
    }

    /// <inheritdoc/>
    public Task<BacktestResult?> GetBacktestResultAsync(string taskId, CancellationToken cancellationToken)
    {
        // Null means "not finished yet", which is a different answer from "finished with nothing".
        // Returning a zeroed result here made the two indistinguishable: the caller polling for
        // completion saw a result on its first poll and reported the task complete while the run
        // was still going.
        if (_activeTasks.TryGetValue(taskId, out var state) && state.Result is BacktestResult result)
        {
            return Task.FromResult<BacktestResult?>(result);
        }

        return Task.FromResult<BacktestResult?>(null);
    }

}
