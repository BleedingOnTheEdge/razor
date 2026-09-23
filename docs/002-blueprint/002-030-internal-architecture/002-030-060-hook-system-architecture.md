---
id: product:razor/blueprint/internal-architecture/hook-system-architecture
parent: product:razor/blueprint/internal-architecture
title: 7. Hook System Architecture
level: product
kind: blueprint
---

# 7. Hook System Architecture

## 7.1 Overview

The hook system is the primary extensibility mechanism. Instead of many typed plugin interfaces (`IRiskManager`, `IFitnessModel`, `INotificationChannel`, etc.), the engine exposes named hook points. Extensions implement `IHookManifest` and register strongly‑typed callbacks on these points.

This replaces the earlier, more rigid plugin interfaces:
- **Risk management** – previously `IRiskManager`, now achieved via filter hooks on order validation (`backtest.order.validation`, `live.order.validation`).
- **Fitness evaluation** – previously `IFitnessModel`, now achieved via the `optimization.fitness.evaluate` action hook.
- **Execution algorithms** – previously `IExecutionAlgorithm`, now achieved via filter hooks on order before execution (`backtest.order.before_execute`, `live.order.before_send`).
- **Simulation friction** – previously `ISimulationFriction`, now handled internally by the adapter's `IMarketCalculator` and order execution logic; slippage and commission are adapter‑owned.

## 7.2 Hook Types

- **Filter hooks** (`IFilterRegistration<T>`): Transform or reject data flowing through the pipeline. Each callback receives the current value and context, returning a `FilterResult<T>` indicating whether to allow (possibly modified) or reject.
- **Action hooks** (`IActionRegistration<T>` or `IActionRegistration`): Observe events without modifying data. Typed variants receive event data; parameterless variants receive only the context. All action callbacks are invoked synchronously; `async void` is forbidden as exceptions would crash the process.

## 7.3 Hook Registry

The engine creates an implementation of `IHookRegistry` at startup. Extension assemblies implementing `IHookManifest` receive this registry and register their callbacks. The registry is organized into four sub‑registries:

| Sub‑Registry | Pipeline |
|--------------|----------|
| `IBacktestHooks` | Backtesting |
| `ILiveHooks` | Live trading |
| `IOptimizationHooks` | Genetic optimisation |
| `IReportHooks` | Report generation |

Each sub‑registry exposes typed registration properties for each hook point (e.g., `IBacktestHooks.OnOrderValidation`, `ILiveHooks.OnTickReceived`).

## 7.4 Hook Invocation

Hook invocations are synchronous and deterministic. For each hook point, the engine:

1. Retrieves the ordered list of registered callbacks.
2. For filter hooks: applies each callback in order, passing the result of the previous callback as input to the next. If any callback returns `IsAllowed = false`, the chain stops and the rejection is returned.
3. For action hooks: invokes each callback in order. Exceptions in action callbacks are caught and logged; they never stop the chain.

## 7.5 Priority Ordering

Callbacks are ordered deterministically:
1. Priority (lower = earlier execution)
2. Plugin name (alphabetical, case‑insensitive ordinal)
3. Registration order within the plugin

This guarantees bit‑identical hook execution order across runs.

---
