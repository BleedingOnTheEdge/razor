// -----------------------------------------------------------------------------
// <copyright file="BacktestRunnerTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.UnitTests.Backtesting;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Kernel.Backtesting;
using Kernel.Configuration;
using Kernel.Events;
using Kernel.Hooks;
using Kernel.Messaging;
using Kernel.Telemetry;
using Sdk.Hooks;
using Sdk.Shared;
using Xunit;

internal sealed class BacktestTestCalculator : DefaultMarketCalculator
{
}

internal sealed class SimpleTestStrategy : StrategyBase
{
    public int ConfiguredCount
    {
        get; private set;
    }
    public int StartedCount
    {
        get; private set;
    }
    public int StoppedCount
    {
        get; private set;
    }
    public int TickCount
    {
        get; private set;
    }
    public List<double> RecordedBids { get; } = [];

    public bool ShouldTradeOnFirstTick { get; set; } = true;

    public override Task OnConfigureAsync(StrategySpecification spec)
    {
        ConfiguredCount++;
        return base.OnConfigureAsync(spec);
    }

    public override Task OnStartAsync(IIndicatorRegistry indicators)
    {
        StartedCount++;
        return base.OnStartAsync(indicators);
    }

    public override void OnTick(string symbol, Tick tick)
    {
        TickCount++;
        RecordedBids.Add(tick.Bid);

        if (ShouldTradeOnFirstTick && TickCount == 1)
        {
            // Open a buy order synchronously via broker
            Broker.ExecuteMarketOrderAsync(symbol, OrderType.Buy, 1.0).GetAwaiter().GetResult();
        }
    }

    public override Task OnStopAsync()
    {
        StoppedCount++;
        return base.OnStopAsync();
    }
}

public sealed class BacktestRunnerTests : IDisposable
{
    private readonly CoreMetrics _metrics = new("backtest-runner-tests");
    private readonly MessageBus _messageBus = new();

    public void Dispose()
    {
        _metrics.Dispose();
        _messageBus.Dispose();
    }

    private static SymbolProperties CreateSymbolProperties(string symbol = "EURUSD") =>
        new()
        {
            AssetClass = AssetClass.Forex,
            MarginMode = MarginMode.Cross,
            PendingTrigger = PendingOrderTriggerMode.UseAskForBuy,
            MarginCurrency = "USD",
            ContractSize = 100000,
            TickSize = 0.0001,
            TickValue = 1.0,
            MinVolume = 0.01,
            MaxLeverage = 100,
            SwapLong = -1.0,
            SwapShort = 0.5,
            SwapRolloverHourUtc = 0,
            TripleSwapDayMultiplier = 1,
            FundingRate = 0,
            HoldingCostIntervalTicks = TimeSpan.TicksPerDay,
            InitialMarginRate = 1.0,
            MaintenanceMarginRate = 0.5,
            MakerFeeRate = 0.0001,
            TakerFeeRate = 0.0002
        };

    private static Tick CreateTick(long timeTicks, double bid, double ask) =>
        new(timeTicks, bid, ask, 1.0);

    private BacktestInput CreateInput(
        SimpleTestStrategy strategy,
        IReadOnlyList<Tick>[] streams,
        string[] symbols,
        HookRegistry? hookRegistry = null,
        IProgress<BacktestProgress>? progress = null)
    {
        var symbolSpecs = new Dictionary<string, SymbolProperties>();
        foreach (var sym in symbols)
        {
            symbolSpecs[sym] = CreateSymbolProperties(sym);
        }

        var stratSpec = new StrategySpecification
        {
            InitialBalance = 10000,
            Leverage = 100,
            RequestedSymbols = [new SymbolRequest("EURUSD", [TimeFrame.Tick])]
        };

        var execSpec = new ExecutionSpecification
        {
            StartDate = DateTime.UtcNow.AddDays(-1),
            EndDate = DateTime.UtcNow,
            LatencyTicks = 0,
            MaxOpenPositions = 10,
            StopOutLevel = 0.5,
            WarmupWindowCount = 0
        };

        return new BacktestInput
        {
            Symbols = symbols,
            TickStreams = streams,
            Strategy = strategy,
            StrategySpecification = stratSpec,
            ExecutionSpecification = execSpec,
            MarketCalculator = new BacktestTestCalculator(),
            SymbolProperties = symbolSpecs,
            MessageBus = _messageBus,
            HookRegistry = hookRegistry,
            Metrics = _metrics,
            Progress = progress
        };
    }

    [Fact]
    public async Task RunAsync_RejectsNullInput()
    {
        var runner = new BacktestRunner();
        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            runner.RunAsync(null!, CancellationToken.None));
    }

    [Fact]
    public async Task RunAsync_ThrowsOperationCanceledException_WhenCanceled()
    {
        var runner = new BacktestRunner();
        using var strategy = new SimpleTestStrategy();
        var input = CreateInput(strategy, [[]], ["EURUSD"]);

        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            runner.RunAsync(input, cts.Token));
    }

    [Fact]
    public async Task RunAsync_ExecutesCompleteLifecycleAndProducesValidResult()
    {
        var runner = new BacktestRunner();
        using var strategy = new SimpleTestStrategy { ShouldTradeOnFirstTick = true };

        var ticks = new List<Tick>
        {
            CreateTick(1000, 1.1000, 1.1002),
            CreateTick(2000, 1.1010, 1.1012),
            CreateTick(3000, 1.1020, 1.1022)
        };

        var progressReports = new List<double>();
        var progress = new Progress<BacktestProgress>(p => progressReports.Add(p.PercentComplete));

        var startedEvents = new List<BacktestStartedEvent>();
        var completedEvents = new List<BacktestCompletedEvent>();
        using var subStarted = _messageBus.Subscribe<BacktestStartedEvent>(startedEvents.Add);
        using var subCompleted = _messageBus.Subscribe<BacktestCompletedEvent>(completedEvents.Add);

        var input = CreateInput(strategy, [ticks], ["EURUSD"], progress: progress);

        var result = await runner.RunAsync(input, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(1, strategy.ConfiguredCount);
        Assert.Equal(1, strategy.StartedCount);
        Assert.Equal(1, strategy.StoppedCount);
        Assert.Equal(3, strategy.TickCount);

        // At end of backtest, open positions are closed
        Assert.Single(result.History);
        Assert.Equal(1, result.TotalTrades);
        // Bought at 1.1002, closed at 1.1020 (last tick Bid)
        Assert.True(result.Balance > 10000);

        Assert.Single(startedEvents);
        Assert.Single(completedEvents);
        Assert.True(completedEvents[0].NetProfit > 0);
    }

    [Fact]
    public async Task RunAsync_FiltersTicksThroughHooks()
    {
        var runner = new BacktestRunner();
        using var strategy = new SimpleTestStrategy { ShouldTradeOnFirstTick = false };

        var ticks = new List<Tick>
        {
            CreateTick(1000, 1.1000, 1.1002),
            CreateTick(2000, 1.1010, 1.1012), // Will drop this one via hook
            CreateTick(3000, 1.1020, 1.1022)
        };

        var hookRegistry = new HookRegistry();
        hookRegistry.Backtest.OnTickReceived.Register((tick, ctx) =>
        {
            if (tick.Time == 2000)
            {
                return FilterResult.Reject<Tick>("Skip tick 2000");
            }
            return FilterResult.Allow(tick);
        });

        var input = CreateInput(strategy, [ticks], ["EURUSD"], hookRegistry: hookRegistry);

        var result = await runner.RunAsync(input, CancellationToken.None);

        Assert.NotNull(result);
        // Middle tick was dropped by OnTickReceived filter
        Assert.Equal(2, strategy.TickCount);
        Assert.Equal([1.1000, 1.1020], strategy.RecordedBids);
    }

    [Fact]
    public async Task RunAsync_Determinism_ProducesIdenticalResultsForIdenticalInputs()
    {
        var runner = new BacktestRunner();
        var ticks = new List<Tick>
        {
            CreateTick(1000, 1.1000, 1.1002),
            CreateTick(2000, 1.0990, 1.0992),
            CreateTick(3000, 1.1050, 1.1052)
        };

        using var strat1 = new SimpleTestStrategy();
        using var strat2 = new SimpleTestStrategy();

        var input1 = CreateInput(strat1, [ticks], ["EURUSD"]);
        var input2 = CreateInput(strat2, [ticks], ["EURUSD"]);

        var res1 = await runner.RunAsync(input1, CancellationToken.None);
        var res2 = await runner.RunAsync(input2, CancellationToken.None);

        Assert.Equal(res1.Balance, res2.Balance);
        Assert.Equal(res1.Equity, res2.Equity);
        Assert.Equal(res1.TotalTrades, res2.TotalTrades);
        Assert.Equal(res1.Drawdown, res2.Drawdown);
        Assert.Equal(res1.History.Count, res2.History.Count);
        Assert.Equal(res1.History[0].Profit, res2.History[0].Profit);
    }
}
