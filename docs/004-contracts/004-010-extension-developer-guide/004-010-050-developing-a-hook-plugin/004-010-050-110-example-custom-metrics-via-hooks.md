---
id: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/example-custom-metrics-via-hooks
parent: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin
title: 6.10 Example: Custom Metrics via Hooks
level: product
kind: contract
---

# 6.10 Example: Custom Metrics via Hooks

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

---
