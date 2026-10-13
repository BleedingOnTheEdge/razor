---
id: product:razor/blueprint/internal-architecture/hook-system-architecture
parent: product:razor/blueprint/internal-architecture
title: Hook System Architecture
level: product
kind: blueprint
domains: [extensions]
flows: [extension-development]
keywords:
  - hooks
  - filter hooks
  - action hooks
  - hook registry
  - hook invocation
  - priority ordering
code_paths:
  - core/src/Kernel/Hooks/**
---

# Hook System Architecture

## Overview

The hook system is the primary extensibility mechanism. Instead of many typed plugin interfaces (`IRiskManager`, `IFitnessModel`, `INotificationChannel`, etc.), the engine exposes named hook points. Extensions implement `IHookManifest` and register strongly‑typed callbacks on these points.

This replaces the earlier, more rigid plugin interfaces:
- **Risk management** – previously `IRiskManager`, now achieved via filter hooks on order validation (`OnOrderValidation` on `IBacktestHooks` and `ILiveHooks`).
- **Fitness evaluation** – previously `IFitnessModel`, now achieved via the `OnFitnessEvaluation` action hook.
- **Execution algorithms** – previously `IExecutionAlgorithm`, now achieved via filter hooks on order before execution (`OnOrderBeforeExecute` on `IBacktestHooks`, `OnOrderBeforeSend` on `ILiveHooks`).
- **Simulation friction** – previously `ISimulationFriction`, now handled internally by the adapter's `IMarketCalculator` and order execution logic; slippage and commission are adapter‑owned.

## Hook Types

- **Filter hooks** (`IFilterRegistration<T>`): Transform or reject data flowing through the pipeline. Each callback receives the current value and context, returning a `FilterResult<T>` indicating whether to allow (possibly modified) or reject.
- **Action hooks** (`IActionRegistration<T>` or `IActionRegistration`): Observe events without modifying data. Typed variants receive event data; parameterless variants receive only the context. All action callbacks are invoked synchronously; `async void` is forbidden as exceptions would crash the process.

## Hook Registry

The engine creates an implementation of `IHookRegistry` at startup. Extension assemblies implementing `IHookManifest` receive this registry and register their callbacks. The registry is organized into four sub‑registries:

| Sub‑Registry | Pipeline |
|--------------|----------|
| `IBacktestHooks` | Backtesting |
| `ILiveHooks` | Live trading |
| `IOptimizationHooks` | Genetic optimisation |
| `IReportHooks` | Report generation |

Each sub‑registry exposes typed registration properties for each hook point (e.g., `IBacktestHooks.OnOrderValidation`, `ILiveHooks.OnTickReceived`). Callbacks are registered on these properties only; there is no string-keyed registration path.

## Hook Invocation

Hook invocations are synchronous and deterministic. For each hook point, the engine:

1. Retrieves the ordered list of registered callbacks.
2. For filter hooks: applies each callback in order, passing the result of the previous callback as input to the next. If any callback returns `IsAllowed = false`, the chain stops and the rejection is returned.
3. For action hooks: invokes each callback in order. Exceptions in action callbacks are caught and logged; they never stop the chain.

## Priority Ordering

Callbacks are ordered deterministically:
1. Priority (lower = earlier execution)
2. Plugin name (alphabetical, case‑sensitive ordinal)
3. Registration order within the plugin

This guarantees bit‑identical hook execution order across runs.

---
