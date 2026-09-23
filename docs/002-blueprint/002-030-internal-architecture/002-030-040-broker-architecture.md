---
id: product:razor/blueprint/internal-architecture/broker-architecture
parent: product:razor/blueprint/internal-architecture
title: 5. Broker Architecture
level: product
kind: blueprint
---

# 5. Broker Architecture

Both brokers implement `IBroker` and use the same `IMarketCalculator` for financial math, ensuring live‑backtest parity (Principle 5).

## 5.1 SimulatedBroker

Used exclusively for backtesting and optimisation. Entirely deterministic, single‑threaded per backtest run.

**Key characteristics:**

- **State:** Protected by a `Lock` object; all public methods and `OnTickAsync` lock.
- **Mutable internal positions:** Uses a private `MutablePosition` class to avoid record copying overhead during updates. Immutable `Position` snapshots are returned to callers.
- **Order lifecycle:**
  - Market orders: If `latencyTicks > 0`, enqueued in `_executionQueue` and executed when `TickClock` reaches the scheduled time. Otherwise executed instantly.
  - Pending orders: Stored in `List<Order>`; checked on each tick via `IMarketCalculator.IsPendingOrderTriggered()`. When triggered, converted to a position using the trigger price adjusted by slippage.
- **SL/TP:** Evaluated for the symbol of the just‑arrived tick, using the appropriate bid/ask.
- **Stop‑out:** If `Equity / MarginUsed ≤ _stopOutLevel`, the position with the worst floating PnL is force‑closed.
- **Holding costs:** `ProcessHoldingCosts()` charges daily swap/funding based on `TickClock` time. Resets daily peak equity at UTC day boundaries.
- **Friction:** Slippage and commission are derived from the adapter's `IMarketCalculator` and `SymbolProperties`. There is no separate `ISimulationFriction`; the adapter owns all friction logic.
- **Partial closes:** Supported; adjusts volume and apportions commission/swap.
- **Warm‑up:** `IsWarmup` property is set by the backtest runner. While true, all order methods return a rejection response.

**Determinism:** No `DateTime.UtcNow`, no system clock. All randomisation is external (strategy can be seeded). The execution queue time is purely tick‑driven.

## 5.2 LiveBroker

Wraps an `IAdapterCapability` for real exchange trading. Adds reconciliation, connection handling, and telemetry.

**Key characteristics:**

- **State lock:** `SemaphoreSlim(1,1)` ensures thread‑safe access (ticks, order responses, periodic sync).
- **Tick handling:** `ProcessTickAsync()` updates `_lastPrices`, processes holding costs, recalculates floating PnL for all positions, checks SL/TP, and triggers stop‑out. It also periodically calls `SyncStateAsync()`.
- **State reconciliation:** `ReconcileAsync()` fetches the full account state from the adapter and corrects local positions/orders. Called at startup and after reconnection.
- **In‑flight order guard:** Uses `SystemClock.GetTimestamp()` (monotonic) + configurable timeout to prevent duplicate order submissions.
- **Order execution:** Delegated to adapter methods. Responses are returned immediately; execution reports are handled asynchronously.
- **Execution reports:** The adapter's `OnExecutionUpdate` event is handled in a fire‑and‑forget task with full exception logging to prevent process crashes (Principle 13).
- **Connection management:** `ConnectAndNotifyAsync` and `DisconnectAndNotifyAsync` publish `ConnectionStateEvent` and update telemetry.
- **Telemetry:** Records order latency, rejection count, and tick arrival latency via `CoreMetrics`.
- **Logger:** Uses `ILogger<LiveBroker>` for operational visibility.

**Parity with SimulatedBroker:** Both use the same `IMarketCalculator`, the same stop‑out logic, the same SL/TP evaluation order, and the same daily holding cost calculation. Unit tests verify that identical tick sequences produce identical trade histories.

---
