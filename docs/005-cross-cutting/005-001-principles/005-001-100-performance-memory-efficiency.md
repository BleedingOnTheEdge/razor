---
id: product:razor/cross-cutting/principles/performance-memory-efficiency
parent: product:razor/cross-cutting/principles
title: 10. Performance & Memory Efficiency
level: product
kind: cross-cutting
---

# 10. Performance & Memory Efficiency
**Razor must be fast and memory‑efficient; resource waste is unacceptable in an institutional engine.**

- Favour stack allocation, `Span<T>`, `ArrayPool`, `GC.AllocateUninitializedArray`, and blittable structs wherever possible.
- The hot tick‑processing path (backtest loop, live tick handler) must minimise allocations. Zero‑allocation merging and indicator calculation are a goal.
- Memory‑mapped files are used for historical data to avoid loading large arrays into managed memory.
- `TickRingBuffer` and `Indicator` base class use pooled arrays; they must return buffers on disposal.
- No lazy allocations in performance‑critical sections; all required buffers are pre‑allocated on strategy start.
- The genetic optimiser evaluates chromosomes in parallel; parallelism must respect a user‑configurable thread limit, not blindly consume all cores.

---
