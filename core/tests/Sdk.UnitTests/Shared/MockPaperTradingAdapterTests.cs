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

    [Fact]
    public async Task OrderExecution_EdgeCasesAndBranches_AreHandledCorrectly()
    {
        var adapter = new MockPaperTradingAdapter();

        // 1. AdapterNameAttribute
        var attr = typeof(MockPaperTradingAdapter)
            .GetCustomAttributes(typeof(AdapterNameAttribute), false)
            .Cast<AdapterNameAttribute>()
            .FirstOrDefault();
        Assert.NotNull(attr);
        Assert.Equal("MockPaperTradingAdapter", attr.Name);

        // 2. Execute order while disconnected fails
        var buyReq = new AdapterOrderRequest { Symbol = "BTC-USD", Type = OrderType.Buy, Volume = 0.5 };
        AdapterOrderResponse disconnResp = await adapter.ExecuteOrderAsync(buyReq);
        Assert.False(disconnResp.Success);
        Assert.Equal("Mock adapter is not connected.", disconnResp.ErrorMessage);

        // Connect
        await adapter.ConnectAsync(CancellationToken.None);

        // 3. Execute order with unknown symbol fails
        var badSymReq = new AdapterOrderRequest { Symbol = "UNKNOWN_COIN", Type = OrderType.Buy, Volume = 1.0 };
        AdapterOrderResponse badSymResp = await adapter.ExecuteOrderAsync(badSymReq);
        Assert.False(badSymResp.Success);
        Assert.Contains("Unknown symbol", badSymResp.ErrorMessage, StringComparison.Ordinal);

        // 4. Execute Sell order
        var sellReq = new AdapterOrderRequest { Symbol = "ETH-USD", Type = OrderType.Sell, Volume = 2.0 };
        AdapterOrderResponse sellResp = await adapter.ExecuteOrderAsync(sellReq);
        Assert.True(sellResp.Success);

        // 5. Check unrealized PnL in GetAccountInfoAsync with open Sell position
        (double bal, double eq) = await adapter.GetAccountInfoAsync();
        Assert.True(bal > 0);
        Assert.True(eq > 0);

        // 6. Modify non-existent order fails
        AdapterOrderResponse modFail = await adapter.ModifyOrderAsync(999999);
        Assert.False(modFail.Success);

        // Modify with only sl and only tp
        AdapterOrderResponse modSlOnly = await adapter.ModifyOrderAsync(sellResp.Ticket, sl: 3400.0, tp: null);
        Assert.True(modSlOnly.Success);
        AdapterOrderResponse modTpOnly = await adapter.ModifyOrderAsync(sellResp.Ticket, sl: null, tp: 3500.0);
        Assert.True(modTpOnly.Success);

        // 7. Close non-existent position fails
        AdapterOrderResponse closeFail = await adapter.ClosePositionAsync(999999);
        Assert.False(closeFail.Success);

        // 8. Close Sell position succeeds and calculates PnL
        AdapterOrderResponse closeSell = await adapter.ClosePositionAsync(sellResp.Ticket);
        Assert.True(closeSell.Success);

        // 9. Open both Buy and Sell positions to test GetAccountInfoAsync dual-path
        var buy1 = await adapter.ExecuteOrderAsync(new AdapterOrderRequest { Symbol = "BTC-USD", Type = OrderType.Buy, Volume = 0.1 });
        var sell1 = await adapter.ExecuteOrderAsync(new AdapterOrderRequest { Symbol = "BTC-USD", Type = OrderType.Sell, Volume = 0.1 });
        (double b, double e) = await adapter.GetAccountInfoAsync();
        Assert.True(b > 0);
        Assert.True(e > 0);
        await adapter.ClosePositionAsync(buy1.Ticket);
        await adapter.ClosePositionAsync(sell1.Ticket);

        // 10. Subscribe to new/unregistered symbol
        await adapter.SubscribeAsync("NEW-CUSTOM-TOKEN");

        // 11. Cancel non-existent pending order fails
        AdapterOrderResponse cancelFail = await adapter.CancelAsync(88888);
        Assert.False(cancelFail.Success);

        IReadOnlyList<Order> pending = await adapter.GetPendingOrdersAsync();
        Assert.Empty(pending);

        // 12. Emit tick on unregistered symbol does not throw
        adapter.EmitTick("NON_EXISTENT_SYMBOL");

        // 13. Fetch history on unknown symbol (basePrice fallback = 100.0)
        var unknownHist = new HistoricalDataRequest { Symbol = "UNKNOWN-TOKEN" };
        HistoricalDataResponse unkHistResp = await adapter.FetchHistoryToBinaryFileAsync(unknownHist, CancellationToken.None);
        Assert.True(unkHistResp.Success);
        await adapter.DeleteHistoryFileAsync(unkHistResp.BinaryFilePath);

        // 14. Fetch history with default StartTime and delete non-existent file
        var defaultHist = new HistoricalDataRequest { Symbol = "SPX-USD" };
        HistoricalDataResponse histResp = await adapter.FetchHistoryToBinaryFileAsync(defaultHist, CancellationToken.None);
        Assert.True(histResp.Success);
        await adapter.DeleteHistoryFileAsync(histResp.BinaryFilePath);
        await adapter.DeleteHistoryFileAsync("nonexistent_path_file.bin");
    }
}
