// -----------------------------------------------------------------------------
// <copyright file="KernelService.Live.cs" company="Razor Platform">
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
    public async Task<string> StartLiveAsync(LiveInput input, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(input);
        string taskId = $"live_{Guid.NewGuid():N}";
        _logLiveStarted(_logger, taskId, null);

        var adapter = _extensionManager.ActiveAdapter;
        if (adapter is null)
        {
            string adapterName = !string.IsNullOrWhiteSpace(input.AdapterName) ? input.AdapterName : "PaperBroker";
            adapter = _extensionManager.CreateTransientAdapter(adapterName)
                ?? _extensionManager.CreateTransientAdapter("PaperBroker")
                ?? _extensionManager.CreateTransientAdapter("MockPaperTradingAdapter")
                ?? new Sdk.Slots.Adapter.MockPaperTradingAdapter();
        }

        var strategy = _extensionManager.ActiveStrategy;
        if (strategy is null)
        {
            string strategyName = !string.IsNullOrWhiteSpace(input.StrategyName) ? input.StrategyName : "TrendFollowing";
            #pragma warning disable CA2000
            strategy = _extensionManager.CreateTransientStrategy(strategyName)
                ?? _extensionManager.CreateTransientStrategy("TrendFollowing")
                ?? _extensionManager.CreateTransientStrategy("TrendFollowingStrategy")
                ?? (strategyName.Contains("Mean", StringComparison.OrdinalIgnoreCase) || strategyName.Contains("Pairs", StringComparison.OrdinalIgnoreCase)
                    ? new Sdk.Slots.Strategy.MeanRevertingPairsStrategy()
                    : new Sdk.Slots.Strategy.TrendFollowingStrategy());
#pragma warning restore CA2000
        }

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

            if (input.Genes is { Length: > 0 })
            {
                strategy.InjectGenes(input.Genes);
            }

#pragma warning disable CA2000
            tickWindow = new TickWindow(input.Symbols, new[] { TimeFrame.Tick });
#pragma warning restore CA2000
            var indicatorRegistry = IndicatorRegistryFactory.Create(tickWindow);
#pragma warning disable CA2000
            var pauseGate = new ManualResetEventSlim(true);
#pragma warning restore CA2000
            try
            {
                await strategy.OnStartAsync(indicatorRegistry).ConfigureAwait(false);
                var taskState = new TaskState(cts, Broker: liveBroker, Strategy: strategy, IndicatorRegistry: indicatorRegistry, TickWindow: tickWindow, PauseGate: pauseGate);
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
            }
            catch
            {
                pauseGate.Dispose();
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

            if (input.Genes != null && input.Genes.Length > 0)
            {
                strategy.InjectGenes(input.Genes);
            }

            await liveBroker.ConnectAndNotifyAsync(cancellationToken).ConfigureAwait(false);
            await liveBroker.InitializeLiveStateAsync(cancellationToken).ConfigureAwait(false);

            // Tick handler – checks pause gate before pushing ticks.
            Action<string, Tick> tickHandler = (symbol, tick) =>
            {
                try
                {
                    pauseGate.Wait();
                    tickWindow.PushTick(symbol, tick);
                    liveBroker.OnTickReceived(symbol, tick);
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
            var openPositions = await broker.GetOpenPositionsAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
            var activeOrders = await broker.GetPendingOrdersAsync(cancellationToken).ConfigureAwait(false);

            return new LiveState
            {
                IsLive = true,
                Equity = broker.Equity,
                Balance = broker.Balance,
                Drawdown = broker.MaxDrawdown,
                Positions = openPositions.ToArray(),
                Orders = activeOrders.ToArray()
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
            state.DisposePauseGate();
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
        if (_activeTasks.TryGetValue(taskId, out var state) && state.PauseGate != null)
        {
            state.PauseGate.Reset();
        }
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task ResumeLiveAsync(string taskId, CancellationToken cancellationToken)
    {
        if (_activeTasks.TryGetValue(taskId, out var state) && state.PauseGate != null)
        {
            state.PauseGate.Set();
        }
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
