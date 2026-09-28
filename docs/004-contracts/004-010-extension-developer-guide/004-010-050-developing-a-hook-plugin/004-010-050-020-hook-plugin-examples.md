---
id: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/hook-plugin-examples
parent: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin
title: Hook Plugin Examples
level: product
kind: contract
domains: [extensions]
flows: [extension-development]
keywords:
  - hook examples
  - risk management
  - drawdown guard
  - iriskmanager
  - custom metrics
  - ulcer index
references:
  - product:razor/contracts/configuration-reference/hook-system
  - product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/safe-fire-and-forget-async-patterns
---

# Hook Plugin Examples

## Risk Management

Instead of implementing a separate `IRiskManager`, register a filter on `OnOrderValidation`:

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

## Custom Notifications

An action hook is the place to push an event outward - a webhook, a chat message, an email. Because action callbacks must be synchronous, these are always fire-and-forget; the complete `TelegramNotifier` example is in `product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/safe-fire-and-forget-async-patterns`.

## Custom Metrics

```csharp
public class UlcerIndexMetric : IHookManifest
{
    private readonly List<double> _drawdowns = new();

    public void RegisterHooks(IHookRegistry registry)
    {
        registry.Backtest.OnEquityUpdated.Register((snapshot, ctx) =>
        {
            _drawdowns.Add(snapshot.Drawdown);
        }, priority: 100);

        registry.Backtest.OnCompleted.Register(ctx =>
        {
            double ulcer = Math.Sqrt(_drawdowns.Average(d => d * d));
            // The engine collects metrics from all registered hooks
        });
    }
}
```
