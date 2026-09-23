---
id: product:razor/blueprint/product-model/hook-system-extensibility
parent: product:razor/blueprint/product-model
title: 9. Hook System (Extensibility)
level: product
kind: blueprint
---

# 9. Hook System (Extensibility)

The hook system is the primary extensibility mechanism for customising engine behaviour without modifying the core. Hook plugins implement `IHookManifest` and register callbacks on named hook points with priorities.

**Hook types:**
- **Filter hooks** – Transform or reject data flowing through the pipeline (e.g., order validation, tick filtering). Registered via `IFilterRegistration<T>`.
- **Action hooks** – Observe events without modifying data (e.g., send notifications, log metrics). Registered via `IActionRegistration<T>` or `IActionRegistration`.

**Hook pipelines:**

| Pipeline | Sub‑Registry | Hook Points |
|----------|--------------|-------------|
| Backtesting | `IBacktestHooks` | Tick filtering, order validation, position events, equity updates, completion |
| Live Trading | `ILiveHooks` | Tick processing, order validation, execution reports, position events, sync, reconnection |
| Optimisation | `IOptimizationHooks` | Generation lifecycle, chromosome creation/evaluation, selection, crossover, mutation, stagnation |
| Reports | `IReportHooks` | Pre‑generation filtering, post‑generation actions |

**Hook contexts** provide additional data:
- `IBacktestContext` – Current tick, equity, balance, drawdown, broker, tick window, open positions.
- `ILiveContext` – Current tick, equity, balance, drawdown, broker, adapter name, connection state.
- `IOptimizationContext` – Current generation, total generations, best fitness, hyper‑mutation status.
- `IReportContext` – Report format.

**Priorities:** Hook callbacks execute in deterministic order: priority (lower = earlier), then plugin name alphabetically, then registration order.

---
