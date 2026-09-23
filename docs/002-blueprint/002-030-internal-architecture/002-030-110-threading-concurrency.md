---
id: product:razor/blueprint/internal-architecture/threading-concurrency
parent: product:razor/blueprint/internal-architecture
title: 12. Threading & Concurrency
level: product
kind: blueprint
---

# 12. Threading & Concurrency

| Component | Threading Model | Notes |
|-----------|-----------------|-------|
| `BacktestRunner` | Single‑threaded | Sync‑over‑async; no concurrency. |
| `SimulatedBroker` | Lock‑protected | All public methods and `OnTickAsync` use `_stateLock`. |
| `LiveBroker` | `SemaphoreSlim(1,1)` | Protects all state. Dedicated tick processor thread. |
| `GeneticOptimizer.EvaluateAsync` | Parallel | Uses `Parallel.ForEachAsync` with configurable max DOP. |
| `MessageBus` | Lock‑free for publish | Uses snapshot of handlers; subscriptions locked briefly. |
| `HookInvoker` | Single‑threaded per pipeline | Filters and actions execute synchronously within the pipeline's thread. |
| Adapter implementations | Must be thread‑safe (Principle 13) | The engine may call adapter methods from multiple threads. |
| `TickWindow` | Not thread‑safe | Designed for single‑threaded tick processing only. |

---
