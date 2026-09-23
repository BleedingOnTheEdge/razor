---
id: product:razor/contracts/extension-developer-guide/developing-an-adapter/example-adapter-skeleton
parent: product:razor/contracts/extension-developer-guide/developing-an-adapter
title: 4.8 Example Adapter Skeleton
level: product
kind: contract
---

# 4.8 Example Adapter Skeleton

```csharp
using Razor.Core.Sdk.Slots.Adapter;
using Razor.Core.Sdk.Shared;

[AdapterName("MyExchange")]
public class MyExchangeAdapter : IAdapterCapability
{
    public string Name => "MyExchange";
    public IMarketCalculator Calculator { get; }
    public bool IsConnected { get; private set; }

    public bool SupportsHistoricalData => true;
    public bool SupportsLiveData => true;
    public bool SupportsExecution => true;

    public MyExchangeAdapter()
    {
        Calculator = new MyExchangeCalculator();
    }

    public Task<bool> ConnectAsync(CancellationToken ct) { /* ... */ }
    public Task DisconnectAsync() { /* ... */ }

    // ... implement all other interface members ...
}
```
