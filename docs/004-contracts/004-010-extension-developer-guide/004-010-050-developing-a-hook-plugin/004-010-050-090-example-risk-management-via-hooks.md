---
id: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/example-risk-management-via-hooks
parent: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin
title: 6.8 Example: Risk Management via Hooks
level: product
kind: contract
---

# 6.8 Example: Risk Management via Hooks

Instead of implementing a separate `IRiskManager`, register a filter on `backtest.order.validation`:

```csharp
public class DrawdownGuard : IHookManifest
{
    public void RegisterHooks(IHookRegistry registry)
    {
        registry.Backtest.OnOrderValidation.Register((order, ctx) =>
        {
            if (ctx is IBacktestContext bt && bt.CurrentDrawdown > 20.0)
                return FilterResult.Reject<AdapterOrderRequest>("Max drawdown exceeded");
            return FilterResult.Allow(order);
        }, priority: 10);
    }
}
```
