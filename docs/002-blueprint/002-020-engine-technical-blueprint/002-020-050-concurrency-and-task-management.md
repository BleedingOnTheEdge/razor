---
id: product:razor/blueprint/engine-technical-blueprint/concurrency-and-task-management
parent: product:razor/blueprint/engine-technical-blueprint
title: Concurrency and Task Management
level: product
kind: blueprint
domains: [engine, live-trading]
flows: [live-trading-session]
keywords:
  - concurrency
  - task manager
  - live first
  - resource reservation
  - dedicated core
  - thread priority
  - task state
references:
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
  - product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry
code_paths:
  - core/src/Engine/Management/Tasks/**
---

# Concurrency and Task Management

## Task types and resource reservation

| Task type | Priority | CPU reservation | Notes |
|---|---|---|---|
| Live task | High | **One dedicated core** | Reserved at startup; never pre-empted |
| Backtest task | Medium | Shared (remaining) | Configurable from the Cloud |
| Optimisation task | Medium | Shared (remaining) | Configurable from the Cloud |
| Other | Low | Shared | Logs, reports, and similar |

Live trading always holds a reserved core with hard affinity and the higher scheduling priority; the
task manager runs live work on a dedicated thread at the highest thread priority. Everything else
shares what remains.

## Task state

- Task state is held **in memory**. The Cloud is the source of truth.
- For recovery the engine emits `StateUpdate` events, which the Cloud stores. The Cloud may also ask
  for the full state with `GetState`.
- On restart the engine restores live state from SQLite, as described in `state-persistence`.

Task state is deliberately thin. The engine never treats its own memory as authoritative; if the
Cloud and the engine disagree, the Cloud wins and the engine is corrected.
