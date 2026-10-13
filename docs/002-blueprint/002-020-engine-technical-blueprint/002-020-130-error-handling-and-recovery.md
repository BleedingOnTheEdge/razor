---
id: product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery
parent: product:razor/blueprint/engine-technical-blueprint
title: Error Handling and Recovery
level: product
kind: blueprint
domains: [engine]
keywords:
  - error handling
  - recovery
  - global exception handler
  - faulted task
  - adapter failure
  - kill switch
  - emergency stop
references:
  - product:razor/blueprint/engine-technical-blueprint/concurrency-and-task-management
  - product:razor/blueprint/product-model/control-monitoring
---

# Error Handling and Recovery

Failure handling is specified at four levels, from the process down to the adapter.

## Global exception handler

Unhandled exceptions are caught, logged, and lead to a graceful shutdown - with a **final status sent
to the Cloud before exit**, so the Cloud is never left believing an engine is healthy when it has
gone.

## Task-level handling

- Each task is guarded; on fault it is marked `Faulted` and the engine notifies the Cloud.
- A faulted **live** task is restarted if the configuration allows it, otherwise stopped. A live task
  is never silently abandoned.

## Adapter failures

- The engine logs and attempts to reconnect.
- If the adapter stays unreachable, the live task is stopped rather than left in a state where orders
  cannot reach the market.

## Kill switch

`KillSwitch` is the emergency path: it closes all positions, stops all tasks, sends a final status,
and exits. It exists so that a trader has one command that stops everything, whatever state the
engine is in.
