---
id: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/complete-hook-catalog
parent: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin
title: 6.6 Complete Hook Catalog
level: product
kind: contract
---

# 6.6 Complete Hook Catalog

## Backtest Hooks (via `registry.Backtest`)

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

## Live Hooks (via `registry.Live`)

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

## Optimization Hooks (via `registry.Optimization`)

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

## Report Hooks (via `registry.Report`)

| Hook | Type | Description |
|------|------|-------------|
| `OnBeforeGenerate` | Filter\<ReportRequest\> | Filter the report request before generation. |
| `OnAfterGenerate` | Action\<(byte[], string)\> | Action after a report is generated. |
