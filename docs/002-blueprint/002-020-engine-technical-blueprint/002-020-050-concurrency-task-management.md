---
id: product:razor/blueprint/engine-technical-blueprint/concurrency-task-management
parent: product:razor/blueprint/engine-technical-blueprint
title: 6. Concurrency & Task Management
level: product
kind: blueprint
---

# 6. Concurrency & Task Management

## 6.1 Task Types & Resource Reservation

| Task Type | Priority | CPU Reservation | Notes |
|-----------|----------|-----------------|-------|
| LiveTask | High | **1 dedicated core** | Reserved at startup; never pre‑empted |
| BacktestTask | Medium | Shared (remaining) | Configurable by Cloud |
| OptimizationTask | Medium | Shared (remaining) | Configurable |
| Other | Low | Shared | Logs, reports, etc. |

**Live Trading** always has a reserved core (hard affinity) and higher scheduling priority. The `TaskManager` uses dedicated `Thread` with `ThreadPriority.Highest` for live tasks.

## 6.2 Task State Persistence (Minimal)

- Task states are held in memory. Cloud is the source of truth.
- For recovery, the Engine sends `StateUpdate` events. Cloud stores them.
- On restart, the Engine restores live state from SQLite (`state/engine_state.db`) via `StateManager`.

---
