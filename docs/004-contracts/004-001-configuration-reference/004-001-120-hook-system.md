---
id: product:razor/contracts/configuration-reference/hook-system
parent: product:razor/contracts/configuration-reference
title: 12. Hook System
level: product
kind: contract
---

# 12. Hook System

**Namespace:** `Razor.Core.Sdk.Hooks`

Razor uses a priority‑based hook system for extensibility. Hook plugins implement `IHookManifest` and register callbacks on named hook points.

## Hook Registration Interfaces

| Interface | Description |
|-----------|-------------|
| `IHookManifest` | Entry point for hook plugins. `void RegisterHooks(IHookRegistry registry)` |
| `IHookRegistry` | Root registry with `Backtest`, `Live`, `Optimization`, `Report` sub‑registries. |
| `IFilterRegistration<T>` | Registration point for a filter hook. `void Register(Func<T, IHookContext, FilterResult<T>>, int priority)` |
| `IActionRegistration<T>` | Registration point for a typed action hook. Callbacks must be synchronous; `async void` is prohibited and will cause process crashes. |
| `IActionRegistration` | Registration point for a parameterless action hook. Same synchronous requirement. |

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
| `IBacktestContext` | Backtesting | `CurrentTick`, `CurrentEquity`, `CurrentDrawdown`, `Broker`, `TickWindow`, `OpenPositions` |
| `ILiveContext` | Live Trading | `CurrentTick`, `CurrentEquity`, `Broker`, `AdapterName`, `IsConnected` |
| `IOptimizationContext` | Optimization | `CurrentGeneration`, `TotalGenerations`, `BestFitness`, `IsHyperMutation` |
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
| `OnPositionStopout` | Action\<Position\> | Action when a stop‑out occurs. |
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
| `OnPositionStopout` | Action\<Position\> | Action when a stop‑out occurs. |
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

---
