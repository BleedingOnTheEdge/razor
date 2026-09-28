---
id: product:razor/decisions/live-trading-continues-offline
parent: product:razor/decisions
title: Live Trading Continues While the Cloud Is Unreachable
level: product
kind: decision
domains: [cloud, engine, live-trading, operations]
flows: [live-trading-session]
keywords:
  - offline handling
  - no grace period
  - infinite retry
  - last known configuration
  - cloud outage
  - live priority
references:
  - product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
  - product:razor/blueprint/engine-technical-blueprint/engine-overview
  - product:razor/flows/live-trading-session
---

# Live Trading Continues While the Cloud Is Unreachable

## Context

The Cloud is the source of truth and the only interface for controlling an engine. A client's engine can
lose that connection at any time - a firewall change, a network outage, a Cloud incident - and a live
position may be open when it does.

## Decision

**Live trading continues offline.** When the Cloud connection is lost, the engine keeps trading to the
**last known configuration**. It never stops live tasks and never exits because the Cloud is unavailable;
it retries indefinitely. This behaviour is specified in the engine blueprint.

**Status: live ruling.**

## Consequences

- The engine reconnects with exponential backoff, starting at one second, doubling to sixty, and holding
  there (`product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry`).
- While offline, all user commands continue on the last known configuration, outgoing data is queued in
  memory and in the SQLite `QueuedMessages` table, and the engine accepts no new commands because the
  Cloud queues them (`product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry`,
  `product:razor/blueprint/engine-technical-blueprint/state-persistence`).
- The fallback endpoint exists for the same reason: the primary is always attempted first, and the engine
  switches back to it when it returns
  (`product:razor/blueprint/engine-technical-blueprint/communication-protocol`).
- The trade is explicit in the architecture: losing the Cloud "degrades control, not execution"
  (`product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry`).
- The Cloud side compensates by watching the heartbeat: an instance offline for more than five minutes is
  alerted and shown as **Offline** with the time of last contact
  (`product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry`).
- The live session is the flow this ruling governs
  (`product:razor/flows/live-trading-session`).

## Reasoning the Documents Give

- `product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry` gives the reason
  directly: "This is the deliberate trade of the architecture: the Cloud is the source of truth, but it is
  not in the critical path of a running live strategy. An outage degrades control, not execution."
- `product:razor/blueprint/engine-technical-blueprint/engine-overview` states the same as the engine's
  "infinite resiliency" realisation of the product principles: "Losing the Cloud does not stop live tasks
  or shut the engine down; it queues outgoing data and waits."
- The alternative - a grace period after which the engine stops trading - is ruled out by the engine
  blueprint's "No grace period: infinite retry" heading; no document argues for it.

## Alternatives Considered

Not recorded as a comparison. The engine blueprint states the absence of a grace period as the design
("No grace period: infinite retry"), and no document weighs a stop-after-timeout policy against it.
