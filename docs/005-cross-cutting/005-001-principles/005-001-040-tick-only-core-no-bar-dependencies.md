---
id: product:razor/cross-cutting/principles/tick-only-core-no-bar-dependencies
parent: product:razor/cross-cutting/principles
title: 4. Tick‑Only Core — No Bar Dependencies
level: product
kind: cross-cutting
---

# 4. Tick‑Only Core — No Bar Dependencies
**Razor works exclusively with tick data. Bars (OHLCV) are legacy artifacts and must never appear in core processing.**

- The `Tick` struct is the fundamental unit of price information.
- Strategies receive ticks via `OnTick(string symbol, Tick tick)`. There is no `OnBar` in the `IStrategyCapability` interface.
- Aggregated views (OHLC for a timeframe) are provided on‑demand by `TickWindow`, which computes them from raw ticks. Strategies that do not need aggregated data never pay the cost.
- Bar‑to‑tick conversion (`BarsToTicks`) exists solely in the adapter layer for importing legacy data; it must not leak into the core engine.
- All internal indicators, risk models, and trade signals must be designed to consume tick streams directly.

---
