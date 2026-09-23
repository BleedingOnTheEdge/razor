---
id: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/the-ihookregistry-interface
parent: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin
title: 6.2 The `IHookRegistry` Interface
level: product
kind: contract
---

# 6.2 The `IHookRegistry` Interface

```csharp
public interface IHookRegistry
{
    IBacktestHooks Backtest { get; }
    ILiveHooks Live { get; }
    IOptimizationHooks Optimization { get; }
    IReportHooks Report { get; }
}
```

Each sub‑registry exposes typed hook registration points.
