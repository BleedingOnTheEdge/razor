---
id: product:razor/contracts/extension-developer-guide/developing-an-adapter/example-adapter-skeleton
parent: product:razor/contracts/extension-developer-guide/developing-an-adapter
title: Example Adapter Skeleton
level: product
kind: contract
domains: [sdk, extensions]
flows: [extension-development]
keywords:
  - example adapter
  - adapter skeleton
  - adaptername attribute
references:
  - product:razor/contracts/configuration-reference/slot-capability-interfaces
---

# Example Adapter Skeleton

```csharp
using Sdk.Slots.Adapter;
using Sdk.Shared;

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
