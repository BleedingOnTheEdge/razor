---
id: product:razor/blueprint/engine-technical-blueprint/state-persistence
parent: product:razor/blueprint/engine-technical-blueprint
title: State Persistence
level: product
kind: blueprint
domains: [engine, cloud]
keywords:
  - state persistence
  - sqlite
  - source of truth
  - stateupdate
  - getstate
  - live state snapshot
  - queued messages
references:
  - product:razor/blueprint/engine-technical-blueprint/concurrency-and-task-management
  - product:razor/blueprint/product-model/configuration-management
code_paths:
  - core/src/Engine/Core/StateManager.cs
---

# State Persistence

The Cloud is the source of truth. The engine's local persistence exists only to survive its own
restart, never to hold authority.

## What is persisted locally

The engine holds **no persistent database for configuration**. SQLite is used for a narrow set of
runtime concerns, held in the single database file `state/engine_state.db`:

| Table | Holds |
|---|---|
| `Metadata` | The engine ID |
| `Tasks` | Pending and running tasks |
| `LiveState` | Live state snapshots |
| `OptimizationStates` | Optimisation state snapshots |
| `CronJobs` | Cron jobs |
| `Schedules` | Schedules |
| `QueuedMessages` | Outgoing messages queued while offline |
| `ExtensionManifest` | The extension manifest |

## Synchronisation with the Cloud

- The engine publishes no state-change events of its own; the Cloud reads per-target snapshots on
  demand, through the `GetLiveState`, `GetOptimizationState` and `GetBacktestResult` commands.

Because configuration lives in the Cloud and travels with each command
(`product:razor/blueprint/product-model/configuration-management`), a lost local database costs at
most a restart's progress - never the definition of what the engine is supposed to be doing.
