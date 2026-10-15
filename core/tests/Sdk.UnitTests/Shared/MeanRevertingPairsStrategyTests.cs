// -----------------------------------------------------------------------------
// <copyright file="MeanRevertingPairsStrategyTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Sdk.UnitTests.Shared;

using Sdk.Shared;
using Sdk.Slots.Strategy;
using Xunit;

public class MeanRevertingPairsStrategyTests
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
        using var strategy = new MeanRevertingPairsStrategy();

        Assert.Equal(20.0, strategy.LookbackPeriod);
        Assert.Equal(2.0, strategy.EntryDeviation);
        Assert.Equal(0.02, strategy.StopLossPct);
        Assert.Equal(0.03, strategy.TakeProfitPct);
        Assert.Equal(1.0, strategy.TradeVolume);
        Assert.True(strategy.TotalGeneCount >= 5);
    }

    [Fact]
    public void GeneInjection_UpdatesParametersCorrectly()
    {
        using var strategy = new MeanRevertingPairsStrategy();
        double[] genes = [10.0, 1.5, 0.015, 0.04, 3.0];

        strategy.InjectGenes(genes);

        Assert.Equal(10.0, strategy.LookbackPeriod);
        Assert.Equal(1.5, strategy.EntryDeviation);
        Assert.Equal(0.015, strategy.StopLossPct);
        Assert.Equal(0.04, strategy.TakeProfitPct);
        Assert.Equal(3.0, strategy.TradeVolume);

        double[] exported = strategy.ExportGenes();
        Assert.Equal(5, exported.Length);
        Assert.Equal(10.0, exported[0]);
        Assert.Equal(1.5, exported[1]);
    }

    [Fact]
    public void OnTick_WithInvalidPriceOrNoBroker_DoesNotThrow()
    {
        using var strategy = new MeanRevertingPairsStrategy();

        strategy.OnTick("BTC-USD", new Tick(0, 0, 0, 0));
        strategy.OnTick("BTC-USD", new Tick(0, -10, -5, 0));
        strategy.OnTick("BTC-USD", new Tick(0, 100, 100.5, 1));
    }

    [Fact]
    public void OnTick_FlatPricesZeroVariance_DoesNotThrowOrOrder()
    {
        using var strategy = new MeanRevertingPairsStrategy();
        var broker = new MockBroker();
        strategy.WireUp(broker, null!);
        strategy.LookbackPeriod = 5.0;

        for (int i = 0; i < 6; i++)
        {
            strategy.OnTick("BTC-USD", new Tick(0, 100, 100, 1));
        }

        Assert.Empty(broker.Orders);
    }

    [Fact]
    public void OnTick_OversoldAndOverboughtDeviations_ExecuteExpectedOrders()
    {
        using var strategy = new MeanRevertingPairsStrategy();
        var broker = new MockBroker();
        strategy.WireUp(broker, null!);

        strategy.LookbackPeriod = 5.0;
        strategy.EntryDeviation = 1.0;
        strategy.TradeVolume = 2.0;

        // Feed baseline prices around 100
        strategy.OnTick("BTC-USD", new Tick(0, 100, 100, 1));
        strategy.OnTick("BTC-USD", new Tick(0, 101, 101, 1));
        strategy.OnTick("BTC-USD", new Tick(0, 99, 99, 1));
        strategy.OnTick("BTC-USD", new Tick(0, 100, 100, 1));
        strategy.OnTick("BTC-USD", new Tick(0, 100, 100, 1));

        // Plunge to 80 (significant oversold deviation) -> Buy order expected
        strategy.OnTick("BTC-USD", new Tick(0, 80, 80, 1));

        var buyOrder = broker.Orders.FirstOrDefault(o => o.Type == OrderType.Buy);
        Assert.True(buyOrder != default, "A Buy order should have been executed on negative z-score deviation.");
        Assert.Equal("BTC-USD", buyOrder.Symbol);
        Assert.Equal(2.0, buyOrder.Volume);

        // Surge to 120 (significant overbought deviation) -> Sell order expected
        strategy.OnTick("BTC-USD", new Tick(0, 120, 120, 1));

        var sellOrder = broker.Orders.FirstOrDefault(o => o.Type == OrderType.Sell);
        Assert.True(sellOrder != default, "A Sell order should have been executed on positive z-score deviation.");
        Assert.Equal("BTC-USD", sellOrder.Symbol);
    }
}
