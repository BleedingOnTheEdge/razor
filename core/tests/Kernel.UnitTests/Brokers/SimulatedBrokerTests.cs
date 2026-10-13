// -----------------------------------------------------------------------------
// <copyright file="SimulatedBrokerTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.UnitTests.Brokers;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Kernel.Brokers;
using Kernel.Clock;
using Kernel.Events;
using Kernel.Hooks;
using Kernel.Messaging;
using Microsoft.Extensions.Logging.Abstractions;
using Sdk.Hooks;
using Sdk.Shared;
using Xunit;

internal sealed class TestCalculator : DefaultMarketCalculator
{
    public double FixedSlippage
    {
        get; set;
    }
    public double FixedCommission
    {
        get; set;
    }

    public override double CalculateSlippage(SymbolProperties symbolProps, OrderType type, double volume, double price) =>
        FixedSlippage;

    public override double CalculateCommission(SymbolProperties symbolProps, double price, double volume) =>
        FixedCommission;
}

internal sealed class TestCurrencyConverter : ICurrencyConverter
{
    public double Rate { get; set; } = 1.25;
    public bool ShouldThrow
    {
        get; set;
    }

    public Task<double> GetConversionRateAsync(string fromCurrency, string toCurrency, CancellationToken cancellationToken)
    {
        if (ShouldThrow)
        {
            throw new InvalidOperationException("Conversion service unavailable");
        }
        return Task.FromResult(Rate);
    }
}

public sealed class SimulatedBrokerTests : IDisposable
{
    private readonly TickClock _clock = new();
    private readonly TestCalculator _calculator = new();
    private readonly MessageBus _messageBus = new();

    public void Dispose()
    {
        _messageBus.Dispose();
    }

    private static SymbolProperties CreateSymbolProperties(
        string symbol = "EURUSD",
        double tickSize = 0.0001,
        double minVolume = 0.01,
        double contractSize = 100000,
        double initialMarginRate = 1.0,
        double swapLong = -1.5,
        double swapShort = 0.5,
        long holdingCostIntervalTicks = TimeSpan.TicksPerDay)
    {
        return new SymbolProperties
        {
            AssetClass = AssetClass.Forex,
            MarginMode = MarginMode.Cross,
            PendingTrigger = PendingOrderTriggerMode.UseAskForBuy,
            MarginCurrency = "USD",
            ContractSize = contractSize,
            TickSize = tickSize,
            TickValue = 1.0,
            MinVolume = minVolume,
            MaxLeverage = 100,
            SwapLong = swapLong,
            SwapShort = swapShort,
            SwapRolloverHourUtc = 0,
            TripleSwapDayMultiplier = 1,
            FundingRate = 0,
            HoldingCostIntervalTicks = holdingCostIntervalTicks,
            InitialMarginRate = initialMarginRate,
            MaintenanceMarginRate = 0.5,
            MakerFeeRate = 0.0001,
            TakerFeeRate = 0.0002
        };
    }

    private SimulatedBroker CreateBroker(
        double initialBalance = 10000,
        double leverage = 100,
        long latencyTicks = 0,
        int maxOpenPositions = 100,
        double stopOutLevel = 0.5,
        IBacktestHooks? hooks = null,
        ICurrencyConverter? currencyConverter = null,
        string? accountCurrency = null,
        Dictionary<string, SymbolProperties>? symbolSpecs = null)
    {
        var specs = symbolSpecs ?? new Dictionary<string, SymbolProperties>
        {
            ["EURUSD"] = CreateSymbolProperties("EURUSD")
        };

        return new SimulatedBroker(
            _calculator,
            specs,
            initialBalance,
            leverage,
            _clock,
            latencyTicks,
            maxOpenPositions,
            stopOutLevel,
            _messageBus,
            hooks,
            currencyConverter,
            accountCurrency,
            NullLogger<SimulatedBroker>.Instance);
    }

    private static Tick MakeTick(string symbol, double bid, double ask, long timeTicks = 638000000000000000) =>
        new(timeTicks, bid, ask, 1.0);

    // ─── 1. Construction and Invariants ──────────────────────────────────────────

    [Fact]
    public void Constructor_RejectsNullArguments()
    {
        var specs = new Dictionary<string, SymbolProperties> { ["EURUSD"] = CreateSymbolProperties() };
        Assert.Throws<ArgumentNullException>(() => new SimulatedBroker(null!, specs, 10000, 100, _clock));
        Assert.Throws<ArgumentNullException>(() => new SimulatedBroker(_calculator, null!, 10000, 100, _clock));
        Assert.Throws<ArgumentNullException>(() => new SimulatedBroker(_calculator, specs, 10000, 100, null!));
    }

    [Fact]
    public void Constructor_InitializesFinancialStateCorrectly()
    {
        var broker = CreateBroker(initialBalance: 25000);

        Assert.Equal(25000, broker.Balance);
        Assert.Equal(25000, broker.Equity);
        Assert.Equal(0, broker.MarginUsed);
        Assert.Equal(25000, broker.FreeMargin);
        Assert.Equal(0, broker.MaxDrawdown);
        Assert.Equal(0, broker.MaxDailyDrawdown);
    }

    // ─── 2. Market Orders Execution & Fills ─────────────────────────────────────

    [Fact]
    public async Task ExecuteMarketOrder_FillsBuyInstantlyWithSlippageAndCommission()
    {
        _calculator.FixedSlippage = 0.0002;
        _calculator.FixedCommission = 5.0;
        var broker = CreateBroker();

        // Feed tick so market prices exist
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));

        var response = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 1.0);

        Assert.True(response.Success);
        Assert.True(response.Ticket > 0);
        // Ask 1.1002 + slippage 0.0002 = 1.1004
        Assert.Equal(1.1004, response.ExecutedPrice, 4);
        Assert.Equal(1.0, response.ExecutedVolume);

        var positions = await broker.GetOpenPositionsAsync();
        Assert.Single(positions);
        var pos = positions[0];
        Assert.Equal(OrderType.Buy, pos.Type);
        Assert.Equal(1.1004, pos.OpenPrice, 4);
        Assert.Equal(5.0, pos.Commission);
        Assert.True(broker.MarginUsed > 0);
        Assert.True(broker.FreeMargin < broker.Equity);
    }

    [Fact]
    public async Task ExecuteMarketOrder_FillsSellInstantlyWithSlippage()
    {
        _calculator.FixedSlippage = 0.0001;
        var broker = CreateBroker();

        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));
        var response = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Sell, 0.5);

        Assert.True(response.Success);
        // Bid 1.1000 - slippage 0.0001 = 1.0999
        Assert.Equal(1.0999, response.ExecutedPrice, 4);

        var positions = await broker.GetOpenPositionsAsync();
        Assert.Single(positions);
        Assert.Equal(OrderType.Sell, positions[0].Type);
    }

    [Fact]
    public async Task ExecuteMarketOrder_RejectsWhenNoPriceAvailable()
    {
        var broker = CreateBroker();
        var response = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 1.0);

        Assert.False(response.Success);
        Assert.Equal("Price not available", response.ErrorMessage);
    }

    [Fact]
    public async Task ExecuteMarketOrder_RejectsWhenDuringWarmup()
    {
        var broker = CreateBroker();
        broker.IsWarmup = true;
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));

        var response = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 1.0);

        Assert.False(response.Success);
        Assert.Equal("Orders not allowed during warmup.", response.ErrorMessage);
    }

    [Fact]
    public async Task ExecuteMarketOrder_RejectsWhenMaxOpenPositionsReached()
    {
        var broker = CreateBroker(maxOpenPositions: 1);
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));

        var first = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 0.1);
        Assert.True(first.Success);

        var second = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 0.1);
        Assert.False(second.Success);
        Assert.Equal("Max open positions reached", second.ErrorMessage);
    }

    [Fact]
    public async Task ExecuteMarketOrder_RejectsWhenMarginIsInsufficient()
    {
        // 100 balance, leverage 1:1, buying 100,000 units needs ~110,000 margin
        var broker = CreateBroker(initialBalance: 100, leverage: 1);
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));

        var response = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 1.0);

        Assert.False(response.Success);
        Assert.Equal("Insufficient margin", response.ErrorMessage);
    }

    [Fact]
    public async Task ExecuteMarketOrder_WithLatency_QueuesAndFillsLater()
    {
        long latency = TimeSpan.FromMilliseconds(500).Ticks;
        var broker = CreateBroker(latencyTicks: latency);

        long t0 = 638000000000000000;
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002, t0));

        var response = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 1.0);
        Assert.True(response.Success);

        // Before latency expires, no open positions exist yet
        var openBefore = await broker.GetOpenPositionsAsync();
        Assert.Empty(openBefore);

        // Tick before latency expiry
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1010, 1.1012, t0 + latency - 100));
        var openMiddle = await broker.GetOpenPositionsAsync();
        Assert.Empty(openMiddle);

        // Tick at or past latency expiry -> order executes at current price
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1020, 1.1022, t0 + latency));
        var openAfter = await broker.GetOpenPositionsAsync();
        Assert.Single(openAfter);
        Assert.Equal(1.1022, openAfter[0].OpenPrice, 4);
    }

    // ─── 3. Pending Orders Placement, Margin, and Triggers ─────────────────────

    [Fact]
    public async Task PlacePendingOrder_ReservesMarginAndCancelsProperly()
    {
        var broker = CreateBroker(initialBalance: 10000, leverage: 50);

        var response = await broker.PlacePendingOrderAsync("EURUSD", OrderType.BuyLimit, 1.0, 1.0500, 0, 0);

        Assert.True(response.Success);
        Assert.True(response.Ticket > 0);
        Assert.True(broker.MarginUsed > 0);

        var pending = await broker.GetPendingOrdersAsync();
        Assert.Single(pending);
        Assert.Equal(1.0500, pending[0].Price);

        // Cancel order releases reserved margin
        var cancelResponse = await broker.CancelOrderAsync(response.Ticket);
        Assert.True(cancelResponse.Success);
        Assert.Equal(0, broker.MarginUsed);

        var pendingAfter = await broker.GetPendingOrdersAsync();
        Assert.Empty(pendingAfter);
    }

    [Fact]
    public async Task PlacePendingOrder_RejectsWhenSymbolUnknownOrMarginInsufficient()
    {
        var broker = CreateBroker(initialBalance: 50, leverage: 1);

        var unknownSymbol = await broker.PlacePendingOrderAsync("UNKNOWN", OrderType.BuyLimit, 1.0, 1.05, 0, 0);
        Assert.False(unknownSymbol.Success);
        Assert.Equal("Symbol properties not available", unknownSymbol.ErrorMessage);

        var noMargin = await broker.PlacePendingOrderAsync("EURUSD", OrderType.BuyLimit, 1.0, 1.05, 0, 0);
        Assert.False(noMargin.Success);
        Assert.Equal("Insufficient margin", noMargin.ErrorMessage);
    }

    [Fact]
    public async Task PendingOrder_TriggersOnMatchingTickAndConvertsToPosition()
    {
        var broker = CreateBroker(initialBalance: 10000, leverage: 100);

        // Place BuyLimit at 1.0900 (should trigger when Ask <= 1.0900)
        var placeResponse = await broker.PlacePendingOrderAsync("EURUSD", OrderType.BuyLimit, 1.0, 1.0900, 0, 0);
        Assert.True(placeResponse.Success);

        // Market tick still higher -> pending order does not trigger
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.0950, 1.0952));
        Assert.Empty(await broker.GetOpenPositionsAsync());
        Assert.Single(await broker.GetPendingOrdersAsync());

        // Market tick reaches trigger price (Ask <= 1.0900)
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.0898, 1.0900));

        Assert.Empty(await broker.GetPendingOrdersAsync());
        var positions = await broker.GetOpenPositionsAsync();
        Assert.Single(positions);
        Assert.Equal(OrderType.Buy, positions[0].Type);
        Assert.Equal(1.0900, positions[0].OpenPrice, 4);
    }

    // ─── 4. Modifying Orders ───────────────────────────────────────────────────

    [Fact]
    public async Task ModifyOrder_UpdatesSLAndTPForOpenPosition()
    {
        var broker = CreateBroker();
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));
        var buy = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 1.0);

        // Cannot modify price of open position
        var failPrice = await broker.ModifyOrderAsync(buy.Ticket, price: 1.1200);
        Assert.False(failPrice.Success);
        Assert.Equal("Cannot modify price of an open position", failPrice.ErrorMessage);

        // Can modify SL and TP
        var modifyResp = await broker.ModifyOrderAsync(buy.Ticket, sl: 1.0950, tp: 1.1150);
        Assert.True(modifyResp.Success);

        var pos = (await broker.GetOpenPositionsAsync())[0];
        Assert.Equal(1.0950, pos.SL);
        Assert.Equal(1.1150, pos.TP);
    }

    [Fact]
    public async Task ModifyOrder_UpdatesPriceAndTargetsForPendingOrder()
    {
        var broker = CreateBroker();
        var pending = await broker.PlacePendingOrderAsync("EURUSD", OrderType.BuyLimit, 1.0, 1.0800, 0, 0);

        var modifyResp = await broker.ModifyOrderAsync(pending.Ticket, sl: 1.0700, tp: 1.0950, price: 1.0820);
        Assert.True(modifyResp.Success);

        var orders = await broker.GetPendingOrdersAsync();
        Assert.Equal(1.0820, orders[0].Price);
        Assert.Equal(1.0700, orders[0].SL);
        Assert.Equal(1.0950, orders[0].TP);
    }

    // ─── 5. Closing Positions (Full & Partial) ─────────────────────────────────

    [Fact]
    public async Task ClosePosition_FullClose_CalculatesRealizedPnLAndUpdatesBalance()
    {
        var broker = CreateBroker(initialBalance: 10000);
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));
        var buy = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 1.0);

        // Price rises: Bid becomes 1.1050
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1050, 1.1052));

        var closeResp = await broker.ClosePositionAsync(buy.Ticket);
        Assert.True(closeResp.Success);

        Assert.Empty(await broker.GetOpenPositionsAsync());
        var history = await broker.GetHistoryAsync();
        Assert.Single(history);
        Assert.Equal(1.1002, history[0].OpenPrice, 4);
        Assert.Equal(1.1050, history[0].ClosePrice, 4);
        Assert.True(history[0].Profit > 0);
        Assert.Equal(broker.Balance, 10000 + history[0].Profit);
        Assert.Equal(0, broker.MarginUsed);
    }

    [Fact]
    public async Task ClosePosition_PartialClose_UpdatesRemainingVolumeAndHistory()
    {
        var broker = CreateBroker(initialBalance: 10000);
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));
        var buy = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 1.0);

        // Close 0.4 lot out of 1.0 lot at 1.1030
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1030, 1.1032));
        var closeResp = await broker.ClosePositionAsync(buy.Ticket, volume: 0.4);
        Assert.True(closeResp.Success);

        var openPositions = await broker.GetOpenPositionsAsync();
        Assert.Single(openPositions);
        Assert.Equal(0.6, openPositions[0].Volume, 2);

        var history = await broker.GetHistoryAsync();
        Assert.Single(history);
        Assert.Equal(0.4, history[0].Volume, 2);
    }

    [Fact]
    public async Task CloseAll_ClosesPositionsAndCancelsPendingOrders()
    {
        var broker = CreateBroker();
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));

        await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 0.5);
        await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Sell, 0.5);
        await broker.PlacePendingOrderAsync("EURUSD", OrderType.BuyLimit, 0.5, 1.0500, 0, 0);

        var responses = await broker.CloseAllAsync("EURUSD");
        Assert.Equal(2, responses.Count);

        Assert.Empty(await broker.GetOpenPositionsAsync());
        Assert.Empty(await broker.GetPendingOrdersAsync());
        Assert.Equal(0, broker.MarginUsed);
    }

    // ─── 6. Automated SL / TP Triggers on Ticks ────────────────────────────────

    [Fact]
    public async Task OnTick_AutomaticallyTriggersStopLossForBuyPosition()
    {
        var broker = CreateBroker();
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));
        var buy = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 1.0, sl: 1.0950, tp: 1.1100);

        // Tick drops to SL
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.0950, 1.0952));

        Assert.Empty(await broker.GetOpenPositionsAsync());
        var history = await broker.GetHistoryAsync();
        Assert.Single(history);
        Assert.True(history[0].Profit < 0);
    }

    [Fact]
    public async Task OnTick_AutomaticallyTriggersTakeProfitForSellPosition()
    {
        var broker = CreateBroker();
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));
        var sell = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Sell, 1.0, sl: 1.1050, tp: 1.0900);

        // Price drops to TP (Ask <= 1.0900)
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.0898, 1.0900));

        Assert.Empty(await broker.GetOpenPositionsAsync());
        var history = await broker.GetHistoryAsync();
        Assert.Single(history);
        Assert.True(history[0].Profit > 0);
    }

    // ─── 7. Stop-out Liquidation and Drawdown Tracking ─────────────────────────

    [Fact]
    public async Task StopOut_LiquidatesWorstPositionWhenMarginLevelCrossesThreshold()
    {
        // Leverage 100, StopOutLevel 50%
        var broker = CreateBroker(initialBalance: 1000, leverage: 100, stopOutLevel: 0.50);
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));

        // Buy 0.8 lots -> margin used = 1.1002 * 0.8 * 100,000 / 100 = ~880.16
        await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 0.8);

        // Massive drop in market price: Bid drops to 1.0200 -> floating loss ~ (1.0200 - 1.1002) * 8000 = -641.6
        // Equity = 1000 - 641.6 = 358.4. MarginLevel = 358.4 / 880.16 = 40.7% <= 50% stop-out!
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.0200, 1.0202));

        // Position should be stopped out
        Assert.Empty(await broker.GetOpenPositionsAsync());
        var history = await broker.GetHistoryAsync();
        Assert.Single(history);
        Assert.True(history[0].Profit < 0);
        Assert.True(broker.MaxDrawdown > 50);
    }

    // ─── 8. Multi-currency Conversion ──────────────────────────────────────────

    [Fact]
    public async Task CurrencyConversion_ConvertsProfitAndMarginToAccountCurrency()
    {
        var converter = new TestCurrencyConverter { Rate = 1.5 };
        var broker = CreateBroker(
            initialBalance: 10000,
            currencyConverter: converter,
            accountCurrency: "GBP");

        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));
        var buy = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 1.0);

        // Price rises
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1020, 1.1022));

        // Floating PnL should be multiplied by 1.5
        var pos = (await broker.GetOpenPositionsAsync())[0];
        // rawPnL = (1.1020 - 1.1002) * 1.0 / 0.0001 = 18.0. Converted = 18.0 * 1.5 = 27.0.
        Assert.Equal(27.0, pos.Profit, 1);

        // When converter fails, falls back to 1.0 without crashing
        converter.ShouldThrow = true;
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1020, 1.1022));
        Assert.True(broker.Equity > 0);
    }

    // ─── 9. Hooks and MessageBus Integration ───────────────────────────────────

    [Fact]
    public async Task HooksAndEvents_AreDispatchedOnOrderExecutionAndClose()
    {
        var hooks = new BacktestHooks();
        bool positionOpenedCalled = false;
        bool positionClosedCalled = false;
        bool orderValidated = false;

        hooks.OnOrderValidation.Register((req, ctx) =>
        {
            orderValidated = true;
            return FilterResult.Allow(req);
        });

        hooks.OnPositionOpened.Register((pos, ctx) => positionOpenedCalled = true);
        hooks.OnPositionClosed.Register((pos, ctx) => positionClosedCalled = true);

        var events = new List<OrderExecutedEvent>();
        using var sub = _messageBus.Subscribe<OrderExecutedEvent>(events.Add);

        var broker = CreateBroker(hooks: hooks);
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));

        var buy = await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 0.5);
        Assert.True(orderValidated);
        Assert.True(positionOpenedCalled);
        Assert.Single(events);
        Assert.True(events[0].IsOpen);

        await broker.ClosePositionAsync(buy.Ticket);
        Assert.True(positionClosedCalled);
        Assert.Equal(2, events.Count);
        Assert.False(events[1].IsOpen);
    }

    // ─── 10. Query Methods & Helpers ───────────────────────────────────────────

    [Fact]
    public async Task QueryMethods_ReflectCurrentBrokerState()
    {
        var broker = CreateBroker();
        await broker.OnTickAsync("EURUSD", MakeTick("EURUSD", 1.1000, 1.1002));

        Assert.False(await broker.HasOpenPositionAsync("EURUSD"));
        await broker.ExecuteMarketOrderAsync("EURUSD", OrderType.Buy, 0.2);

        Assert.True(await broker.HasOpenPositionAsync("EURUSD"));
        Assert.True(await broker.HasOpenPositionAsync("EURUSD", OrderType.Buy));
        Assert.False(await broker.HasOpenPositionAsync("EURUSD", OrderType.Sell));

        var positions = await broker.GetOpenPositionsAsync("EURUSD");
        Assert.Single(positions);

        var otherSymbol = await broker.GetOpenPositionsAsync("GBPUSD");
        Assert.Empty(otherSymbol);
    }
}
