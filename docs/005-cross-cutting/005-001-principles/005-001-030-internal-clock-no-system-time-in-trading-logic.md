---
id: product:razor/cross-cutting/principles/internal-clock-no-system-time-in-trading-logic
parent: product:razor/cross-cutting/principles
title: 3. Internal Clock – No System Time in Trading Logic
level: product
kind: cross-cutting
---

# 3. Internal Clock – No System Time in Trading Logic
**All market‑time calculations (trade timestamps, holding costs, daily drawdown resets, window completion, order execution time, etc.) must be driven solely by the timestamp of the latest tick.**  
System time may be used **only** for non‑trading concerns: scheduling, health checks, logging, telemetry, and external timeouts.

- Introduce an `IClock` abstraction with two implementations:
  - `TickClock` – returns the timestamp of the last tick processed (monotonic within a backtest or tick stream).
  - `SystemClock` – returns `DateTime.UtcNow` and `TickCount64` for wall‑clock operations.
- Brokers (simulated and live) must receive a clock instance. All PnL updates, holding cost calculations, and daily stats resets must use the `TickClock` time.
- Order timeouts (in‑flight guards) must use a monotonic clock (e.g., `TickCount64` from `SystemClock`) to avoid system time adjustments.
- The live pipeline's tick handler must feed the tick timestamp to the `TickClock` before any processing.
- Any code that calls `DateTime.UtcNow` inside a trading path is a violation.

---
