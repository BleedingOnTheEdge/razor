---
id: product:razor/contracts/configuration-reference/hook-system
parent: product:razor/contracts/configuration-reference
title: Hook System
level: product
kind: contract
domains: [extensions]
flows: [extension-development]
keywords:
  - hooks
  - filter hooks
  - action hooks
  - hook registration
  - hook catalogue
  - hook contexts
  - priority ordering
  - ihookmanifest
  - ihookregistry
references:
  - product:razor/contracts/configuration-reference/slot-capability-interfaces
code_paths:
  - core/src/Sdk/Hooks/**
---

# Hook System

**Namespace:** `Sdk.Hooks`

Razor uses a priority-based hook system for extensibility. Hook plugins implement `IHookManifest` and
register strongly typed callbacks on named hook points. The engine calls `RegisterHooks` once at
plugin load time, passing the root `IHookRegistry`.

## Hook Types

- **Filter hooks** (`IFilterRegistration<T>`) transform or reject data flowing through a pipeline. Each callback receives the current value and the hook context, and returns a `FilterResult<T>` indicating whether to allow the value (possibly modified) or reject it.
- **Action hooks** (`IActionRegistration<T>` or `IActionRegistration`) observe events without modifying data. Typed variants receive the event data; parameterless variants receive only the context.

Registration order is deterministic: by `priority` (lower first), then by plugin name (ordinal, case-sensitive), then by registration order within the plugin. Filter callbacks run in that order, each receiving the previous callback's result; the first callback that returns `IsAllowed = false` stops the chain and its rejection is returned. Action callbacks run in order and are all invoked; an exception in an action callback is caught and logged and never stops the chain.

## Hook Names

Registration is always typed: a callback is registered on a member of a sub-registry (for example
`registry.Backtest.OnOrderValidation`). There is no string-keyed registration API. Every hook point also
has a runtime name - the string the engine writes to `IHookContext.HookName` when that hook fires. The
table maps each registration member to its runtime name.

| Registration member | Hook name |
|---------------------|-----------|
| `IBacktestHooks.OnStart` | `backtest.started` |
| `IBacktestHooks.OnTickReceived` | `backtest.tick.received` |
| `IBacktestHooks.OnTickStrategyBefore` | `backtest.tick.strategy_before` |
| `IBacktestHooks.OnTickStrategyAfter` | `backtest.tick.strategy_after` |
| `IBacktestHooks.OnTickCompleted` | `backtest.tick.completed` |
| `IBacktestHooks.OnOrderValidation` | `backtest.order.validation` |
| `IBacktestHooks.OnOrderBeforeExecute` | `backtest.order.before_execute` |
| `IBacktestHooks.OnOrderAfterExecute` | `backtest.order.after_execute` |
| `IBacktestHooks.OnPositionOpened` | `backtest.position.opened` |
| `IBacktestHooks.OnPositionClosed` | `backtest.position.closed` |
| `IBacktestHooks.OnPositionStopout` | `backtest.position.stopout` |
| `IBacktestHooks.OnEquityUpdated` | `backtest.equity.updated` |
| `IBacktestHooks.OnCompleted` | `backtest.completed` |
| `ILiveHooks.OnStart` | `live.start` |
| `ILiveHooks.OnTickReceived` | `live.tick.received` |
| `ILiveHooks.OnTickProcessed` | `live.tick.processed` |
| `ILiveHooks.OnOrderValidation` | `live.order.validation` |
| `ILiveHooks.OnOrderBeforeSend` | `live.order.before_send` |
| `ILiveHooks.OnOrderExecuted` | `live.order.executed` |
| `ILiveHooks.OnOrderRejected` | `live.order.rejected` |
| `ILiveHooks.OnPositionOpened` | `live.position.opened` |
| `ILiveHooks.OnPositionClosed` | `live.position.closed` |
| `ILiveHooks.OnPositionStopout` | `live.position.stopout` |
| `ILiveHooks.OnSyncBefore` | `live.sync.before` |
| `ILiveHooks.OnSyncAfter` | `live.sync.after` |
| `ILiveHooks.OnReconnectAttempt` | `live.reconnect.attempt` |
| `ILiveHooks.OnReconnectSuccess` | `live.reconnect.success` |
| `ILiveHooks.OnStop` | `live.stop` |
| `ILiveHooks.OnEquityChanged` | `live.equity.changed` |
| `IOptimizationHooks.OnStart` | `optimization.started` |
| `IOptimizationHooks.OnGenerationStart` | `optimization.generation.start` |
| `IOptimizationHooks.OnChromosomeCreated` | `optimization.chromosome.created` |
| `IOptimizationHooks.OnFitnessEvaluation` | `optimization.fitness.evaluate` |
| `IOptimizationHooks.OnChromosomeEvaluated` | `optimization.chromosome.evaluated` |
| `IOptimizationHooks.OnSelectionApplied` | `optimization.selection` |
| `IOptimizationHooks.OnCrossoverApplied` | `optimization.crossover` |
| `IOptimizationHooks.OnMutationApplied` | `optimization.mutation` |
| `IOptimizationHooks.OnGenerationCompleted` | `optimization.generation.completed` |
| `IOptimizationHooks.OnStagnationDetected` | `optimization.stagnation` |
| `IOptimizationHooks.OnCompleted` | `optimization.completed` |
| `IReportHooks.OnBeforeGenerate` | `report.before_generate` |
| `IReportHooks.OnAfterGenerate` | `report.after_generate` |

## Registration Interfaces

| Interface | Description |
|-----------|-------------|
| `IHookManifest` | Entry point for hook plugins. `void RegisterHooks(IHookRegistry registry)` |
| `IHookRegistry` | Root registry with `Backtest`, `Live`, `Optimization`, `Report` sub-registries. |
| `IFilterRegistration<T>` | Registration point for a filter hook. `void Register(Func<T, IHookContext, FilterResult<T>> callback, int priority = 100)` |
| `IActionRegistration<T>` | Registration point for a typed action hook. `void Register(Action<T, IHookContext> callback, int priority = 100)`. Callbacks must be synchronous; `async void` is prohibited and will cause process crashes. |
| `IActionRegistration` | Registration point for a parameterless action hook. `void Register(Action<IHookContext> callback, int priority = 100)`. Same synchronous requirement. |

## Filter Results

```csharp
public static class FilterResult
{
    public static FilterResult<T> Allow<T>(T data);
    public static FilterResult<T> Reject<T>(string reason);
}

public readonly struct FilterResult<T>
{
    public bool IsAllowed { get; }
    public T? Data { get; }
    public string? RejectionReason { get; }
}
```

## Hook Contexts

| Interface | Pipeline | Key Members |
|-----------|----------|-------------|
| `IHookContext` | Base | `HookName`, `UtcNow`, `CancellationToken` |
| `IBacktestContext` | Backtesting | `CurrentTick`, `TickIndex`, `TotalTicks`, `CurrentEquity`, `CurrentBalance`, `CurrentDrawdown`, `Broker`, `TickWindow`, `OpenPositions` |
| `ILiveContext` | Live Trading | `CurrentTick`, `CurrentEquity`, `CurrentBalance`, `CurrentDrawdown`, `Broker`, `AdapterName`, `IsConnected` |
| `IOptimizationContext` | Optimization | `CurrentGeneration`, `TotalGenerations`, `PopulationSize`, `BestFitness`, `IsHyperMutation` |
| `IReportContext` | Reports | `ReportFormat` |

## Hook Catalog

### Backtest Hooks

| Hook | Type | Description |
|------|------|-------------|
| `OnStart` | Action | Fires when a backtest starts. |
| `OnTickReceived` | Filter\<Tick\> | Filter a tick as it is received from the tick stream. |
| `OnTickStrategyBefore` | Filter\<Tick\> | Filter the tick before it is passed to the strategy. |
| `OnTickStrategyAfter` | Action\<Tick\> | Action after the strategy has processed a tick. |
| `OnTickCompleted` | Action\<Tick\> | Action after all processing for a tick is complete. |
| `OnOrderValidation` | Filter\<AdapterOrderRequest\> | Filter an order request before any validation. |
| `OnOrderBeforeExecute` | Filter\<AdapterOrderRequest\> | Filter an order request just before execution. |
| `OnOrderAfterExecute` | Action\<(AdapterOrderRequest, AdapterOrderResponse)\> | Action after an order is executed or rejected. |
| `OnPositionOpened` | Action\<Position\> | Action when a new position is opened. |
| `OnPositionClosed` | Action\<Position\> | Action when a position is closed. |
| `OnPositionStopout` | Action\<Position\> | Action when a stop-out occurs. |
| `OnEquityUpdated` | Action\<EquitySnapshot\> | Action when equity/drawdown is recalculated. |
| `OnCompleted` | Action | Fires when the backtest completes. |

### Live Hooks

| Hook | Type | Description |
|------|------|-------------|
| `OnStart` | Action | Fires when a live session starts. |
| `OnTickReceived` | Filter\<Tick\> | Filter a tick as received from the adapter. |
| `OnTickProcessed` | Action\<Tick\> | Action after a tick is fully processed. |
| `OnOrderValidation` | Filter\<AdapterOrderRequest\> | Filter an order request before sending to exchange. |
| `OnOrderBeforeSend` | Filter\<AdapterOrderRequest\> | Filter an order immediately before sending. |
| `OnOrderExecuted` | Action\<ExecutionReport\> | Action when an execution report is received. |
| `OnOrderRejected` | Action\<(AdapterOrderRequest, string)\> | Action when an order is rejected. |
| `OnPositionOpened` | Action\<Position\> | Action when a new position is detected. |
| `OnPositionClosed` | Action\<Position\> | Action when a position is closed. |
| `OnPositionStopout` | Action\<Position\> | Action when a stop-out occurs. |
| `OnSyncBefore` | Action | Action before periodic state sync. |
| `OnSyncAfter` | Action | Action after periodic state sync. |
| `OnReconnectAttempt` | Action\<int\> | Action on a reconnection attempt. |
| `OnReconnectSuccess` | Action\<int\> | Action on successful reconnection. |
| `OnStop` | Action | Fires when the live session stops. |
| `OnEquityChanged` | Action\<EquitySnapshot\> | Action when equity changes. |

### Optimization Hooks

| Hook | Type | Description |
|------|------|-------------|
| `OnStart` | Action | Fires when optimization starts. |
| `OnGenerationStart` | Action\<int\> | Action at the start of each generation. |
| `OnChromosomeCreated` | Filter\<Chromosome\> | Filter a chromosome immediately after creation. |
| `OnChromosomeEvaluated` | Action\<(Chromosome, double)\> | Action after a chromosome's fitness is evaluated. |
| `OnSelectionApplied` | Action\<(Chromosome, Chromosome)\> | Action when parents are selected. |
| `OnCrossoverApplied` | Action\<Chromosome\> | Action when a child chromosome is produced. |
| `OnMutationApplied` | Action\<Chromosome\> | Action when a chromosome is mutated. |
| `OnGenerationCompleted` | Action\<(int, double, bool)\> | Action at the end of each generation. |
| `OnStagnationDetected` | Action\<int\> | Action when stagnation is detected. |
| `OnCompleted` | Action\<Chromosome\> | Fires when optimization completes. |
| `OnFitnessEvaluation` | Action\<IFitnessEvaluationContext\> | Hook for calculating fitness; plugins set `context.Fitness`. |

### Report Hooks

| Hook | Type | Description |
|------|------|-------------|
| `OnBeforeGenerate` | Filter\<ReportRequest\> | Filter the report request before generation. |
| `OnAfterGenerate` | Action\<(byte[], string)\> | Action after a report is generated. |
