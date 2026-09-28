---
id: product:razor/blueprint/internal-architecture/clock-system
parent: product:razor/blueprint/internal-architecture
title: Clock System
level: product
kind: blueprint
domains: [engine]
keywords:
  - clock
  - tickclock
  - systemclock
  - market time
  - wall clock
references:
  - product:razor/cross-cutting/principles/internal-clock-no-system-time-in-trading-logic
code_paths:
  - core/src/Kernel/Clock/**
---

# Clock System

Two implementations of `IClock` enforce the separation of market time and wall‑clock time (Principle 3, `product:razor/cross-cutting/principles/internal-clock-no-system-time-in-trading-logic`).

## TickClock

- **Location:** `Kernel.Clock.TickClock`
- **Purpose:** All trading calculations (PnL, daily drawdown reset, holding cost timing, order execution timing in simulated broker).
- **Operation:** `SetTickTime(long timestamp)` is called at the very start of every tick processing. `GetTimestamp()` returns the last set value. `GetUtcNow()` converts it to a `DateTime`.
- **Used by:** `SimulatedBroker`, `LiveBroker` (for market operations), `BacktestRunner` (to advance the clock before each tick batch). Never by telemetry or scheduling.

## SystemClock

- **Location:** `Kernel.Clock.SystemClock`
- **Purpose:** Wall‑clock time for non‑trading concerns: in‑flight order guards, telemetry timestamps, health checks.
- **Operation:** `GetTimestamp()` returns `Environment.TickCount64` (monotonic, unaffected by system time adjustments). `GetUtcNow()` returns `DateTime.UtcNow` (only used for logging/events).
- **Used by:** `LiveBroker` (order guard timeouts, telemetry), `CoreMetrics` (recording latencies), and scheduling logic.

**Enforcement:** Any call to `DateTime.UtcNow` inside `Kernel` trading paths is a build‑breaking violation per static analysis CI.

---
