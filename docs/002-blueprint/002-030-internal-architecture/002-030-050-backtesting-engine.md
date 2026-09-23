---
id: product:razor/blueprint/internal-architecture/backtesting-engine
parent: product:razor/blueprint/internal-architecture
title: 6. Backtesting Engine
level: product
kind: blueprint
---

# 6. Backtesting Engine

## 6.1 Components

- **`BacktestInput`** – Immutable record containing all necessary data: tick streams, symbols, strategy, specs, calculator, optional genes and neural network, progress reporter, message bus.
- **`BacktestRunner`** – The orchestrator implementing `IBacktestRunner`.
- **`BacktestProgress` / `BacktestResult`** – Data transfer records.
- **`MergedTickTimeline`** – Merges multiple tick streams into one chronological enumerator.

## 6.2 Execution Flow

1. **Setup:**
   - Creates a `TickClock`.
   - Instantiates `SimulatedBroker` with `IMarketCalculator`, symbol properties, etc.
   - Creates `TickWindow` for the requested timeframes (excluding `Tick`).
   - Wires broker and tick window to the strategy via `StrategyBase.WireUp()`.

2. **Gene injection:**
   - If `input.Genes` is provided, uses them directly.
   - Otherwise calls `GeneInjector.ExtractAndInitializeGenes()` to produce a deterministic gene set using the `GeneInitializationSeed` from `ExecutionSpecification`. The seed is nullable; if `null`, no explicit seed was provided and genes are taken from the strategy's defaults.

3. **Strategy lifecycle:**
   - Calls `OnConfigureAsync()` then `OnStartAsync()`. Both are sync‑over‑async because the loop must remain synchronous for determinism (no real I/O inside strategy for backtest).

4. **Main loop:**
   - Iterates over the merged enumerator.
   - For each event:
     - Sets `TickClock` to the tick's time.
     - Invokes the `backtest.tick.received` filter hook chain.
     - Calls `broker.OnTickAsync(symbol, tick)` (synchronous, lock‑protected).
     - Invokes the `backtest.tick.strategy_before` filter hook chain.
     - Pushes tick into `TickWindow`.
     - Calls `strategy.OnTick(symbol, tick)`.
     - Invokes the `backtest.tick.strategy_after` action hook.
     - Invokes the `backtest.tick.completed` action hook.

5. **Teardown:**
   - Closes all open positions per symbol.
   - Disposes indicators.
   - Calls `OnStopAsync()`.

6. **Result assembly:**
   - Collects trade history from broker.
   - Calculates metrics via `MetricsCalculator`.
   - Publishes `BacktestCompletedEvent` with full statistics.
   - Invokes the `backtest.completed` action hook.
   - Records throughput telemetry.

**Determinism:** The entire loop uses no wall‑clock time, no `Random`, and no mutable external state. All gene seeds are derived from the master seed. Given identical tick streams and seeds, the output is bit‑identical.

---
