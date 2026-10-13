// -----------------------------------------------------------------------------
// <copyright file="MockPaperTradingAdapterTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Sdk.UnitTests.Shared;

using Sdk.Shared;
using Sdk.Slots.Adapter;
using Xunit;

public sealed class MockPaperTradingAdapterTests
{
    [Fact]
    public async Task ConnectAndSubscribe_EmitsSyntheticTicks()
    {
        var adapter = new MockPaperTradingAdapter();
        Assert.False(adapter.IsConnected);

        bool connected = await adapter.ConnectAsync(CancellationToken.None);
        Assert.True(connected);
        Assert.True(adapter.IsConnected);

        Tick? receivedTick = null;
        string? receivedSymbol = null;
        adapter.OnTickReceived += (sym, t) =>
        {
            receivedSymbol = sym;
            receivedTick = t;
        };

        await adapter.SubscribeAsync("BTC-USD");
        Assert.NotNull(receivedTick);
        Assert.Equal("BTC-USD", receivedSymbol);
        Assert.True(receivedTick.Value.Bid > 0);
        Assert.True(receivedTick.Value.Ask >= receivedTick.Value.Bid);

        adapter.EmitTick("BTC-USD");
        Assert.NotNull(receivedTick);

        await adapter.UnsubscribeAsync("BTC-USD");
        await adapter.DisconnectAsync();
        Assert.False(adapter.IsConnected);
    }

    [Fact]
    public async Task ExecuteAndCloseOrder_UpdatesBalanceAndEquity()
    {
        var adapter = new MockPaperTradingAdapter();
        await adapter.ConnectAsync(CancellationToken.None);

        (double initialBalance, double initialEquity) = await adapter.GetAccountInfoAsync();
        Assert.Equal(100000.0, initialBalance);
        Assert.Equal(100000.0, initialEquity);

        var request = new AdapterOrderRequest
        {
            Symbol = "BTC-USD",
            Type = OrderType.Buy,
            Volume = 1.0,
            Price = 65000.0,
            StopLoss = 64000.0,
            TakeProfit = 67000.0
        };

        AdapterOrderResponse response = await adapter.ExecuteOrderAsync(request);
        Assert.True(response.Success);
        Assert.True(response.Ticket > 0);
        Assert.True(response.ExecutedPrice > 0);
        Assert.Equal(1.0, response.ExecutedVolume);

        IReadOnlyList<Position> positions = await adapter.GetActivePositionsAsync();
        Assert.Single(positions);
        Assert.Equal(response.Ticket, positions[0].Ticket);

        AdapterOrderResponse modify = await adapter.ModifyOrderAsync(response.Ticket, sl: 64500.0, tp: 68000.0);
        Assert.True(modify.Success);

        AdapterOrderResponse close = await adapter.ClosePositionAsync(response.Ticket);
        Assert.True(close.Success);

        IReadOnlyList<Position> remaining = await adapter.GetActivePositionsAsync();
        Assert.Empty(remaining);
    }

    [Fact]
    public async Task FetchHistoryToBinaryFile_GeneratesValidTickFile()
    {
        var adapter = new MockPaperTradingAdapter();
        var request = new HistoricalDataRequest
        {
            Symbol = "ETH-USD",
            StartTime = DateTime.UtcNow.AddHours(-2),
            EndTime = DateTime.UtcNow,
            RetentionPolicy = DataActionPolicy.DeleteAfterTask
        };

        HistoricalDataResponse response = await adapter.FetchHistoryToBinaryFileAsync(request, CancellationToken.None);
        Assert.True(response.Success);
        Assert.Equal("ETH-USD", response.Symbol);
        Assert.Equal(500, response.TotalRecords);
        Assert.True(File.Exists(response.BinaryFilePath));

        await adapter.NotifyFileSafeToDeleteAsync(response.BinaryFilePath);
        Assert.False(File.Exists(response.BinaryFilePath));
    }

    [Fact]
    public async Task GetSymbolProperties_ReturnsCorrectDefaults()
    {
        var adapter = new MockPaperTradingAdapter();
        SymbolProperties? btcProps = await adapter.GetSymbolPropertiesAsync("BTC-USD");
        Assert.NotNull(btcProps);
        Assert.Equal("USD", btcProps.MarginCurrency);
        Assert.Equal(0.001, btcProps.MinVolume);
        Assert.NotNull(adapter.GetSupportedTimeframes("BTC-USD"));
    }
}
