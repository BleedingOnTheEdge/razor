---
id: product:razor/blueprint/internal-architecture/messaging-events
parent: product:razor/blueprint/internal-architecture
title: 11. Messaging & Events
level: product
kind: blueprint
---

# 11. Messaging & Events

## 11.1 In‑Process Message Bus

`Kernel.Messaging.MessageBus` implements `IMessageBus`:

- **Typed subscriptions:** Handlers are stored per message type.
- **Deduplication:** If `message.EventId` is non‑null and has been published within the last 60 seconds, the message is suppressed.
- **Thread safety:** Subscriptions are locked; publishing iterates a snapshot of handlers.

## 11.2 Event Catalog

All event records reside in `Razor.Core.Kernel.Events`. They are internal infrastructure and not part of the public SDK.

| Event | Publisher | Payload |
|-------|-----------|---------|
| `BacktestStartedEvent` | BacktestRunner | (timestamp only) |
| `BacktestCompletedEvent` | BacktestRunner | NetProfit, ReturnPct, MaxDrawdown, Sharpe, Sortino, etc. |
| `OrderExecutedEvent` | SimulatedBroker, LiveBroker | Symbol, OrderType, Volume, Price, IsOpen |
| `ConnectionStateEvent` | LiveBroker | IsConnected, AdapterName |
| `LiveReconnectEvent` | LiveBroker | Success, AttemptCount, AdapterName |
| `LiveSessionEndedEvent` | LiveBroker | FinalBalance, FinalEquity, MaxDrawdown, TotalTrades |
| `OptimizationGenerationEvent` | OptimizationRunner | Generation, BestFitness, IsHyperMutation |
| `OptimizationCycleCompletedEvent` | OptimizationRunner | CycleIndex, BestFitness, GenerationCount |

---
