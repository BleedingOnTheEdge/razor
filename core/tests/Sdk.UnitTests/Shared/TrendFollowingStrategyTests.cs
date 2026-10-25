// -----------------------------------------------------------------------------
// <copyright file="TrendFollowingStrategyTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Sdk.UnitTests.Shared;

using Sdk.Shared;
using Sdk.Slots.Strategy;
using Xunit;

public class TrendFollowingStrategyTests
{
    private sealed class MockBroker : IBroker
    {
        public List<(string Symbol, OrderType Type, double Volume, double Sl, double Tp, string Comment)> Orders { get; } = [];

        public double Balance => 100000;
        public double Equity => 100000;
        public double MarginUsed => 0;
        public double FreeMargin => 100000;
        public double MaxDrawdown => 0;
        public double MaxDailyDrawdown => 0;
        public bool IsWarmup => false;

        public Task InitializeLiveStateAsync(CancellationToken ct) => Task.CompletedTask;
        public Task SyncStateAsync(CancellationToken ct) => Task.CompletedTask;

        public Task<AdapterOrderResponse> ExecuteMarketOrderAsync(string symbol, OrderType type, double volume, double sl, double tp, string comment)
        {
            Orders.Add((symbol, type, volume, sl, tp, comment));
            return Task.FromResult(new AdapterOrderResponse { Success = true, Ticket = 12345 });
        }

        public Task<AdapterOrderResponse> PlacePendingOrderAsync(string symbol, OrderType type, double volume, double price, double sl, double tp, string comment)
            => Task.FromResult(new AdapterOrderResponse { Success = true, Ticket = 12345 });

        public Task<AdapterOrderResponse> ModifyOrderAsync(long ticket, double? sl = null, double? tp = null, double? price = null)
            => Task.FromResult(new AdapterOrderResponse { Success = true, Ticket = ticket });

        public Task<AdapterOrderResponse> CancelOrderAsync(long ticket)
            => Task.FromResult(new AdapterOrderResponse { Success = true, Ticket = ticket });

        public Task<AdapterOrderResponse> ClosePositionAsync(long ticket, double volume)
            => Task.FromResult(new AdapterOrderResponse { Success = true, Ticket = ticket });

        public Task<IReadOnlyList<AdapterOrderResponse>> CloseAllAsync(string symbol, OrderType? type = null)
            => Task.FromResult<IReadOnlyList<AdapterOrderResponse>>([new AdapterOrderResponse { Success = true, Ticket = 12345 }]);

        public Task<bool> HasOpenPositionAsync(string symbol, OrderType? type = null, CancellationToken ct = default)
            => Task.FromResult(false);

        public Task<IReadOnlyList<Position>> GetOpenPositionsAsync(string? symbol = null, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<Position>>([]);

        public Task<IReadOnlyList<Position>> GetHistoryAsync(CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<Position>>([]);

        public Task<IReadOnlyList<Order>> GetPendingOrdersAsync(CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<Order>>([]);
    }

    [Fact]
    public void Constructor_SetsDefaultParameters()
    {
        using var strategy = new TrendFollowingStrategy();

        Assert.Equal(9.0, strategy.FastPeriod);
        Assert.Equal(21.0, strategy.SlowPeriod);
        Assert.Equal(0.02, strategy.StopLossPct);
        Assert.Equal(0.04, strategy.TakeProfitPct);
        Assert.Equal(1.0, strategy.TradeVolume);
        Assert.True(strategy.TotalGeneCount >= 5);
    }

    [Fact]
    public void GeneInjection_UpdatesParametersCorrectly()
    {
        using var strategy = new TrendFollowingStrategy();
        double[] genes = [5.0, 30.0, 0.015, 0.05, 2.5];

        strategy.InjectGenes(genes);

        Assert.Equal(5.0, strategy.FastPeriod);
        Assert.Equal(30.0, strategy.SlowPeriod);
        Assert.Equal(0.015, strategy.StopLossPct);
        Assert.Equal(0.05, strategy.TakeProfitPct);
        Assert.Equal(2.5, strategy.TradeVolume);

        double[] exported = strategy.ExportGenes();
        Assert.Equal(5, exported.Length);
        Assert.Equal(5.0, exported[0]);
        Assert.Equal(30.0, exported[1]);
    }

    [Fact]
    public void OnTick_WithInvalidPriceOrNoBroker_DoesNotThrow()
    {
        using var strategy = new TrendFollowingStrategy();

        // No broker wired up, invalid tick
        strategy.OnTick("BTC-USD", new Tick(0, 0, 0, 0));
        strategy.OnTick("BTC-USD", new Tick(0, -10, -5, 0));

        // Valid tick with no broker should not throw
        strategy.OnTick("BTC-USD", new Tick(0, 100, 100.5, 1));
    }

    [Fact]
    public void OnTick_BullishAndBearishCrossover_ExecutesMarketOrders()
    {
        using var strategy = new TrendFollowingStrategy();
        var broker = new MockBroker();
        strategy.WireUp(broker, null!);

        strategy.FastPeriod = 2.0;
        strategy.SlowPeriod = 5.0;
        strategy.TradeVolume = 2.0;
        strategy.StopLossPct = 0.01;
        strategy.TakeProfitPct = 0.02;

        // Feed descending prices to establish slow EMA > fast EMA
        strategy.OnTick("BTC-USD", new Tick(0, 100, 100.5, 1));
        strategy.OnTick("BTC-USD", new Tick(0, 90, 90.5, 1));
        strategy.OnTick("BTC-USD", new Tick(0, 80, 80.5, 1));

        // Feed sharp upward surge to trigger bullish crossover
        strategy.OnTick("BTC-USD", new Tick(0, 120, 120.5, 1));
        strategy.OnTick("BTC-USD", new Tick(0, 140, 140.5, 1));

        // Verify buy order was generated
        var buyOrder = broker.Orders.FirstOrDefault(o => o.Type == OrderType.Buy);
        Assert.True(buyOrder != default, "A Buy order should have been executed on bullish crossover.");
        Assert.Equal("BTC-USD", buyOrder.Symbol);
        Assert.Equal(2.0, buyOrder.Volume);

        // Feed sharp downward price surge to trigger bearish crossover
        strategy.OnTick("BTC-USD", new Tick(0, 50, 50.5, 1));
        strategy.OnTick("BTC-USD", new Tick(0, 30, 30.5, 1));

        // Verify sell order was generated
        var sellOrder = broker.Orders.FirstOrDefault(o => o.Type == OrderType.Sell);
        Assert.True(sellOrder != default, "A Sell order should have been executed on bearish crossover.");
        Assert.Equal("BTC-USD", sellOrder.Symbol);
    }
}
