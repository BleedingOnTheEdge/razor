---
id: product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry
parent: product:razor/blueprint/engine-technical-blueprint
title: Offline Handling and Retry
level: product
kind: blueprint
domains: [engine, cloud]
keywords:
  - offline
  - reconnection
  - exponential backoff
  - infinite retry
  - no grace period
  - queued messages
  - offline alert
references:
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
---

# Offline Handling and Retry

## Connection monitoring

The engine keeps a persistent WebSocket. If the connection drops it reconnects with exponential
backoff: a one-second base multiplied by 1.5 on each attempt, so the first delay is 1.5 seconds and
the delay is capped at sixty seconds and held there.

## No grace period: infinite retry

The engine **never** stops live tasks and never exits because the Cloud is unavailable. It retries
until the connection returns.

While offline:

- all user commands continue running on the **last known configuration**;
- outgoing data is queued in memory and persisted to the SQLite `QueuedMessages` table;
- the engine accepts **no new commands**, because the Cloud queues them until the engine is reachable
  again.

This is the deliberate trade of the architecture: the Cloud is the source of truth, but it is not in
the critical path of a running live strategy. An outage degrades control, not execution.

## User notification

The Cloud watches the engine's heartbeat. If the engine has been offline for more than five minutes
the Cloud raises alerts, and the dashboard shows the instance as **Offline** with the time of last
contact.
