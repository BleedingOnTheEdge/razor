---
id: product:razor/contracts/extension-developer-guide/best-practices
parent: product:razor/contracts/extension-developer-guide
title: 8. Best Practices
level: product
kind: contract
---

# 8. Best Practices

## 8.1 Performance

- `OnTick` is called millions of times in a backtest. **Avoid allocations** inside this method.
- Pre‑allocate arrays, use `Span<T>` if possible, and cache indicator references.
- Do not use `async`/`await` inside `OnTick` if your logic is CPU‑bound; keep it synchronous. (The broker's orders return immediately in simulation.)

## 8.2 Thread Safety for Adapters

- The engine may call your adapter methods from multiple threads simultaneously (e.g., a tick event and a periodic state sync). Use `SemaphoreSlim` or `lock` to protect shared state.
- The `OnExecutionUpdate` event handler can be invoked on any thread; ensure your event raising code is thread‑safe.

## 8.3 Determinism for Strategies and Hooks

- Do not use `System.Random` unless it's seeded deterministically and only for non‑trading purposes (e.g., logging).
- Use `CustomizedRandom` if you need a PRNG; seed it from the master seed passed through configuration or genes. **Use only non‑negative seeds** with the `int` constructor — negative seeds are rejected to prevent unpredictable sequences.
- Do not access `DateTime.UtcNow` or system clocks in trading logic.
- Hook callbacks execute deterministically by priority and name ordering. Do not rely on non‑deterministic behavior.

## 8.4 Avoiding Hard‑coded Market Logic

Your strategy should work across multiple asset classes if it does not depend on specific tick sizes or contract details. Let the broker handle those through `SymbolProperties`.

---
