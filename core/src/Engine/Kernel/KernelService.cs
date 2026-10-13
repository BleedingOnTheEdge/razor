// -----------------------------------------------------------------------------
// <copyright file="KernelService.cs" company="Razor Platform">
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
using ChromosomeKernel = global::Kernel.Optimization.Chromosome;

/// <summary>
/// Real implementation of <see cref="IKernelService"/> using the Kernel components.
/// </summary>
internal sealed partial class KernelService : IKernelService, IDisposable
{
    private readonly IExtensionManager _extensionManager;
    private readonly IHookRegistry _hookRegistry;
    private readonly IMessageBus _messageBus;
    private readonly ICoreMetrics _metrics;
    private readonly ILogger<KernelService> _logger;
    private readonly ILoggerFactory _loggerFactory;
    private readonly ConcurrentDictionary<string, TaskState> _activeTasks = new();
    private readonly SemaphoreSlim _taskLock = new(1, 1);
    private bool _disposed;

    // Logger delegates
    private static readonly Action<ILogger, string, Exception?> _logBacktestStarted =
        LoggerMessage.Define<string>(LogLevel.Information, 0, "Backtest {TaskId} started.");
    private static readonly Action<ILogger, string, Exception?> _logBacktestCompleted =
        LoggerMessage.Define<string>(LogLevel.Information, 1, "Backtest {TaskId} completed.");
    private static readonly Action<ILogger, string, Exception?> _logBacktestFailed =
        LoggerMessage.Define<string>(LogLevel.Error, 2, "Backtest {TaskId} failed.");
    private static readonly Action<ILogger, string, Exception?> _logLiveStarted =
        LoggerMessage.Define<string>(LogLevel.Information, 3, "Live {TaskId} started.");
    private static readonly Action<ILogger, string, Exception?> _logLiveStopped =
        LoggerMessage.Define<string>(LogLevel.Information, 4, "Live {TaskId} stopped.");
    private static readonly Action<ILogger, string, Exception?> _logOptimizationStarted =
        LoggerMessage.Define<string>(LogLevel.Information, 5, "Optimization {TaskId} started.");
    private static readonly Action<ILogger, string, Exception?> _logOptimizationCompleted =
        LoggerMessage.Define<string>(LogLevel.Information, 6, "Optimization {TaskId} completed.");
    private static readonly Action<ILogger, string, Exception?> _logBacktestCancelled =
        LoggerMessage.Define<string>(LogLevel.Information, 7, "Backtest {TaskId} cancelled.");
    private static readonly Action<ILogger, string, Exception?> _logOptimizationCancelled =
        LoggerMessage.Define<string>(LogLevel.Information, 8, "Optimization {TaskId} cancelled.");
    private static readonly Action<ILogger, string, Exception?> _logOptimizationFailed =
        LoggerMessage.Define<string>(LogLevel.Error, 9, "Optimization {TaskId} failed.");
    private static readonly Action<ILogger, Exception?> _logPauseLiveNotImplemented =
        LoggerMessage.Define(LogLevel.Warning, 10, "PauseLive not implemented; ignoring.");
    private static readonly Action<ILogger, Exception?> _logResumeLiveNotImplemented =
        LoggerMessage.Define(LogLevel.Warning, 11, "ResumeLive not implemented; ignoring.");
    private static readonly Action<ILogger, string, string, Exception?> _logBacktestDataFetchFailed =
        LoggerMessage.Define<string, string>(LogLevel.Error, 12, "Failed to fetch historical data for symbol {Symbol} in backtest {TaskId}.");
    private static readonly Action<ILogger, string, Exception?> _logLiveTickHandlerError =
        LoggerMessage.Define<string>(LogLevel.Error, 13, "Error in live tick handler for symbol {Symbol}.");
    private static readonly Action<ILogger, string, string, Exception?> _logOptimizationDataFetchFailed =
        LoggerMessage.Define<string, string>(LogLevel.Error, 14, "Failed to fetch historical data for symbol {Symbol} in optimisation {TaskId}.");
    private static readonly Action<ILogger, string, Exception?> _logUnsubscribeError =
        LoggerMessage.Define<string>(LogLevel.Warning, 15, "Failed to unsubscribe from symbol {Symbol} during live stop.");

    private sealed record TaskState(
        CancellationTokenSource Cts,
        IAdapterCapability? Adapter = null,
        string[]? Symbols = null,
        Action<string, Tick>? TickHandler = null,
        object? Result = null,
        LiveBroker? Broker = null,
        IStrategyCapability? Strategy = null,
        OptimizationRunner? Runner = null,
        IIndicatorRegistry? IndicatorRegistry = null,
        TickWindow? TickWindow = null,
        List<MemoryMappedTickList>? MappedTickLists = null,
        Func<ChromosomeKernel, CancellationToken, Task<double>>? Evaluator = null,
        ManualResetEventSlim? PauseGate = null,
        bool IsSteppable = false)
    {
        public void DisposeCts()
        {
            Cts?.Cancel();
            Cts?.Dispose();
        }

        public void DisposePauseGate() => PauseGate?.Dispose();

        public void DisposeIndicatorRegistry()
        {
            if (IndicatorRegistry == null)
            {
                return;
            }

            if (IndicatorRegistry is IDisposable disposable)
            {
                disposable.Dispose();
                return;
            }

            var method = IndicatorRegistry.GetType().GetMethod("DisposeAll", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
            method?.Invoke(IndicatorRegistry, null);
        }

        public void DisposeTickWindow() => TickWindow?.Dispose();

        public void DisposeMappedTickLists()
        {
            if (MappedTickLists == null)
            {
                return;
            }

            foreach (var mm in MappedTickLists)
            {
                mm?.Dispose();
            }

            MappedTickLists.Clear();
        }
    }

    public KernelService(
        IExtensionManager extensionManager,
        IHookRegistry hookRegistry,
        IMessageBus messageBus,
        ICoreMetrics metrics,
        ILogger<KernelService> logger,
        ILoggerFactory loggerFactory)
    {
        _extensionManager = extensionManager ?? throw new ArgumentNullException(nameof(extensionManager));
        _hookRegistry = hookRegistry ?? throw new ArgumentNullException(nameof(hookRegistry));
        _messageBus = messageBus ?? throw new ArgumentNullException(nameof(messageBus));
        _metrics = metrics ?? throw new ArgumentNullException(nameof(metrics));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _loggerFactory = loggerFactory ?? throw new ArgumentNullException(nameof(loggerFactory));
    }

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

    /// <inheritdoc/>
    public async Task<string> StartLiveAsync(LiveInput input, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(input);
        string taskId = $"live_{Guid.NewGuid():N}";
        _logLiveStarted(_logger, taskId, null);

        var adapter = _extensionManager.ActiveAdapter
            ?? throw new InvalidOperationException("No active adapter found.");
        var strategy = _extensionManager.ActiveStrategy
            ?? throw new InvalidOperationException("No active strategy found.");

        var symbolProperties = new Dictionary<string, SymbolProperties>();
        foreach (var sym in input.Symbols)
        {
            var props = await adapter.GetSymbolPropertiesAsync(sym, cancellationToken).ConfigureAwait(false);
            if (props == null)
            {
                throw new InvalidOperationException($"Symbol properties for {sym} not available.");
            }

            symbolProperties[sym] = props;
        }

        var marketClock = new TickClock();
        var wallClock = new SystemClock();

        CancellationTokenSource cts;
#pragma warning disable CA2000
        cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
#pragma warning restore CA2000
        LiveBroker? liveBroker = null;
        TickWindow? tickWindow = null;

        try
        {
            // Get currency converter if supported
            ICurrencyConverter? converter = null;
            if (adapter is IHasCurrencyConverter hasConverter)
            {
                converter = hasConverter.CurrencyConverter;
            }

            var liveBrokerLogger = _loggerFactory.CreateLogger<LiveBroker>();

#pragma warning disable CA2000
            liveBroker = new LiveBroker(
                adapter,
                input.MagicNumber,
                input.Leverage,
                marketClock,
                wallClock,
                _metrics,
                _messageBus,
                _hookRegistry.Live,
                input.OrderGuardTimeoutSeconds,
                input.StopOutLevel,
                syncIntervalTicks: TimeSpan.TicksPerMinute,
                logger: liveBrokerLogger,
                currencyConverter: converter,
                accountCurrency: input.AccountCurrency);
#pragma warning restore CA2000

            foreach (var kv in symbolProperties)
            {
                await liveBroker.SetSymbolSpecsAsync(kv.Key, kv.Value).ConfigureAwait(false);
            }

            var spec = new StrategySpecification
            {
                InitialBalance = input.InitialBalance,
                Leverage = input.Leverage,
                RequestedSymbols = input.Symbols.Select(s => new SymbolRequest(s, ImmutableArray.Create(TimeFrame.Tick))).ToImmutableArray()
            };
            await strategy.OnConfigureAsync(spec).ConfigureAwait(false);

#pragma warning disable CA2000
            tickWindow = new TickWindow(input.Symbols, new[] { TimeFrame.Tick });
#pragma warning restore CA2000
            var indicatorRegistry = IndicatorRegistryFactory.Create(tickWindow);
            try
            {
                await strategy.OnStartAsync(indicatorRegistry).ConfigureAwait(false);
                var taskState = new TaskState(cts, Broker: liveBroker, Strategy: strategy, IndicatorRegistry: indicatorRegistry, TickWindow: tickWindow);
                try
                {
                    _activeTasks[taskId] = taskState;
                }
                catch
                {
                    cts.Dispose();
                    throw;
                }
            }
            catch
            {
                if (indicatorRegistry is IDisposable disposable)
                {
                    disposable.Dispose();
                }
                else
                {
                    var method = indicatorRegistry.GetType().GetMethod("DisposeAll");
                    method?.Invoke(indicatorRegistry, null);
                }
                tickWindow!.Dispose();
                throw;
            }

            strategy.InjectGenes(input.Genes);

            await liveBroker.ConnectAndNotifyAsync(cancellationToken).ConfigureAwait(false);
            await liveBroker.InitializeLiveStateAsync(cancellationToken).ConfigureAwait(false);

            // Tick handler – now uses synchronous enqueue.
            Action<string, Tick> tickHandler = (symbol, tick) =>
            {
                try
                {
                    tickWindow.PushTick(symbol, tick);
                    liveBroker.OnTickReceived(symbol, tick); // FIXED: was liveBroker.OnTickAsync(...).GetAwaiter().GetResult()
                }
                catch (Exception ex)
                {
                    _logLiveTickHandlerError(_logger, symbol, ex);
                }
            };

            adapter.OnTickReceived += tickHandler;

            foreach (var sym in input.Symbols)
            {
                await adapter.SubscribeAsync(sym).ConfigureAwait(false);
            }

            if (_activeTasks.TryGetValue(taskId, out var existingState))
            {
                _activeTasks[taskId] = existingState with { Adapter = adapter, Symbols = input.Symbols, TickHandler = tickHandler };
            }

            return taskId;
        }
        catch
        {
            if (liveBroker != null)
            {
                await liveBroker.DisposeAsync().ConfigureAwait(false);
            }

            cts.Dispose();
#pragma warning disable CA1508
            tickWindow?.Dispose();
#pragma warning restore CA1508
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<LiveState> GetLiveStateAsync(string taskId, CancellationToken cancellationToken)
    {
        if (_activeTasks.TryGetValue(taskId, out var state) && state.Broker is LiveBroker broker)
        {
            await broker.SyncStateAsync(cancellationToken).ConfigureAwait(false);
            return new LiveState
            {
                IsLive = true,
                Equity = broker.Equity,
                Balance = broker.Balance,
                Drawdown = broker.MaxDrawdown,
                Positions = Array.Empty<object>(),
                Orders = Array.Empty<object>()
            };
        }
        return new LiveState { IsLive = false, Equity = 0, Balance = 0 };
    }

    /// <inheritdoc/>
    public async Task StopLiveAsync(string taskId, CancellationToken cancellationToken)
    {
        if (_activeTasks.TryRemove(taskId, out var state) && state.Broker is LiveBroker broker)
        {
            if (state.Adapter != null && state.TickHandler != null)
            {
                state.Adapter.OnTickReceived -= state.TickHandler;
            }

            if (state.Adapter != null && state.Symbols != null)
            {
                foreach (var sym in state.Symbols)
                {
                    try
                    {
                        await state.Adapter.UnsubscribeAsync(sym).ConfigureAwait(false);
                    }
                    catch (Exception ex)
                    {
                        _logUnsubscribeError(_logger, sym, ex);
                    }
                }
            }

            state.DisposeCts();
            state.DisposeIndicatorRegistry();
            state.DisposeTickWindow();

            await broker.DisconnectAndNotifyAsync().ConfigureAwait(false);
            await broker.DisposeAsync().ConfigureAwait(false);

            _logLiveStopped(_logger, taskId, null);
        }
    }

    /// <inheritdoc/>
    public Task PauseLiveAsync(string taskId, CancellationToken cancellationToken)
    {
        _logPauseLiveNotImplemented(_logger, null);
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task ResumeLiveAsync(string taskId, CancellationToken cancellationToken)
    {
        _logResumeLiveNotImplemented(_logger, null);
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async Task InjectGenesAsync(string taskId, double[] genes, CancellationToken cancellationToken)
    {
        if (_activeTasks.TryGetValue(taskId, out var state) && state.Strategy is IStrategyCapability strategy)
        {
            strategy.InjectGenes(genes);
        }

        await Task.CompletedTask.ConfigureAwait(false);
    }
}
