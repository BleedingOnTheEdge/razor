---
id: product:razor/blueprint/engine-technical-blueprint/state-persistence-cloud-as-source-of-truth
parent: product:razor/blueprint/engine-technical-blueprint
title: 13. State Persistence (Cloud as Source of Truth)
level: product
kind: blueprint
---

# 13. State Persistence (Cloud as Source of Truth)

## 13.1 In‑Memory Only

- The Engine holds **no persistent database** for configurations. SQLite is used only for:
  - Engine ID (`Metadata` table)
  - Live state snapshots (`LiveState` table)
  - Optimisation state snapshots (`OptimizationStates` table)
  - Cron jobs (`CronJobs` table)
  - Schedules (`Schedules` table)
  - Queued outgoing messages (`QueuedMessages` table)
  - Extension manifest (`ExtensionManifest` table)

## 13.2 Cloud Synchronisation

- Engine sends `StateUpdate` events for significant changes.
- Cloud may request full state via `GetState`.

---
