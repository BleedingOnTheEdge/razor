---
id: product:razor/contracts/extension-developer-guide/developing-an-adapter/the-iadaptercapability-interface
parent: product:razor/contracts/extension-developer-guide/developing-an-adapter
title: 4.1 The `IAdapterCapability` Interface
level: product
kind: contract
---

# 4.1 The `IAdapterCapability` Interface

The interface is in `Razor.Core.Sdk.Slots.Adapter`.

```csharp
public interface IAdapterCapability
{
    // Identity
    string Name { get; }
    IMarketCalculator Calculator { get; }
    bool IsConnected { get; }

    // Capability flags
    bool SupportsHistoricalData { get; }
    bool SupportsLiveData { get; }
    bool SupportsExecution { get; }

    // Connection
    Task<bool> ConnectAsync(CancellationToken cancellationToken);
    Task DisconnectAsync();

    // Historical data
    Task<HistoricalDataResponse> FetchHistoryToBinaryFileAsync(HistoricalDataRequest request, CancellationToken ct);
    Task DeleteHistoryFileAsync(string filePath);
    Task NotifyFileSafeToDeleteAsync(string filePath);

    // Live data
    Task SubscribeAsync(string symbol);
    Task UnsubscribeAsync(string symbol);
    event Action<string, Tick> OnTickReceived;

    // Execution
    Task<AdapterOrderResponse> ExecuteOrderAsync(AdapterOrderRequest request);
    Task<AdapterOrderResponse> ModifyOrderAsync(long ticket, double? sl = null, double? tp = null, double? price = null);
    Task<AdapterOrderResponse> ClosePositionAsync(long ticket, double? volume = null);
    Task<AdapterOrderResponse> CancelAsync(long ticket);
    Task<(double Balance, double Equity)> GetAccountInfoAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Position>> GetActivePositionsAsync();
    Task<IReadOnlyList<Order>> GetPendingOrdersAsync();
    Task<SymbolProperties?> GetSymbolPropertiesAsync(string symbol, CancellationToken ct = default);
    event Action<ExecutionReport> OnExecutionUpdate;

    // Symbol support
    TimeFrame[]? GetSupportedTimeframes(string symbol);
}
```
