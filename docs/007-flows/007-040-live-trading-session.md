---
id: product:razor/flows/live-trading-session
parent: product:razor/flows
title: Live Trading Session
level: product
kind: contract
domains: [backtesting, cloud, data, engine, extensions, live-trading, operations, sdk, security]
flows: [live-trading-session]
keywords:
  - live trading
  - live session
  - StartLive
  - StopLive
  - kill switch
  - offline trading
  - continuous optimisation
  - reconnection
  - reconciliation
references:
  - product:razor/blueprint/engine-technical-blueprint/concurrency-and-task-management
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry
  - product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery
  - product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs
  - product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
  - product:razor/blueprint/engine-technical-blueprint/logging-and-telemetry
  - product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering
  - product:razor/blueprint/internal-architecture/broker-architecture
  - product:razor/blueprint/internal-architecture/data-flow-architecture
  - product:razor/blueprint/internal-architecture/cloud-control-plane
  - product:razor/blueprint/internal-architecture/telemetry-observability
  - product:razor/blueprint/internal-architecture/report-generation-engine-role
  - product:razor/blueprint/product-model/control-monitoring
  - product:razor/blueprint/product-model/user-workflows
  - product:razor/blueprint/product-model/appendix-a-supported-commands
  - product:razor/blueprint/product-model/licensing-subscriptions
  - product:razor/contracts/configuration-reference/live-specification
  - product:razor/contracts/configuration-reference/market-data-types
  - product:razor/contracts/configuration-reference/hook-system
  - product:razor/cross-cutting/principles/live-trading-robustness
  - product:razor/operational/installation-and-deployment/logs-and-troubleshooting
implements: [live-trading-session]
---

# Live Trading Session

## Purpose

Run a strategy against a real broker through an adapter, on the client's engine, while the Cloud watches
and controls it. The engine holds one reserved core for the session and keeps trading on the last known
configuration even when the Cloud connection is lost.

## Participants

| Component | Role in this flow |
|---|---|
| Cloud | Configures the session, starts and stops it, monitors it, and pushes new genes when it approves an optimisation. |
| Engine | Owns execution: the live task, the broker, reconciliation, reporting and offline behaviour. |
| Adapter (extension) | Connects to the exchange, streams ticks and executes orders. |
| Strategy (extension) | Reacts to ticks and places orders. |
| Hook plugins (extensions) | Observe and filter order and tick flow on the live pipeline. |

## Steps

| # | Step | Owner | Specified by |
|---|---|---|---|
| 1 | Prerequisites are in place: the engine is authenticated, and the profile's adapter and strategy are active. | Engine, Cloud | `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management`, `product:razor/blueprint/internal-architecture/cloud-control-plane` |
| 2 | The Cloud sends `StartLive` (live band 1100-1108) with the full configuration in the payload: `LiveSpecification`, strategy specification, symbols and timeframes. | Cloud | `product:razor/blueprint/product-model/appendix-a-supported-commands`, `product:razor/blueprint/product-model/configuration-management` |
| 3 | The engine admits a live task at High priority with one dedicated, reserved core; live work is never pre-empted. | Engine | `product:razor/blueprint/engine-technical-blueprint/concurrency-and-task-management` |
| 4 | The strategy starts: wiring, `OnConfigureAsync`, `OnStartAsync`; hooks are registered before the strategy starts. | Engine, Strategy | `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management` |
| 5 | Live data path per tick: adapter raises `OnTickReceived`, the live broker enqueues it, sets the tick clock, updates prices, PnL, holding costs and stop-out, periodically syncs account state, and forwards the tick to `strategy.OnTick`. | Engine | `product:razor/blueprint/internal-architecture/data-flow-architecture`, `product:razor/blueprint/internal-architecture/broker-architecture` |
| 6 | Orders go out through the broker and the adapter; execution reports are handled asynchronously, and an in-flight order guard rejects duplicates using monotonic time plus the configured order-guard timeout. | Engine, Adapter | `product:razor/blueprint/internal-architecture/broker-architecture`, `product:razor/contracts/configuration-reference/live-specification` |
| 7 | State is reconciled with the exchange at startup and after every reconnection, before further ticks are processed. | Engine, Adapter | `product:razor/blueprint/internal-architecture/broker-architecture`, `product:razor/cross-cutting/principles/live-trading-robustness` |
| 8 | The live hook pipeline runs: tick filters, order validation and before-send filters, and the action hooks that observe executions, positions and equity. | Engine, plugins | `product:razor/contracts/configuration-reference/hook-system` |
| 9 | Monitoring: equity, balance, drawdown, margin, open positions and pending orders are pushed to the Cloud, which shows engine health and operation progress on the dashboard. | Engine, then Cloud | `product:razor/blueprint/product-model/control-monitoring`, `product:razor/blueprint/engine-technical-blueprint/state-persistence` |
| 10 | Continuous optimisation: the Cloud schedules an optimisation run from the user's profile, and on approval or automatic timeout pushes the winning genes to the running engine with `InjectGenes`. | Cloud, Engine | `product:razor/contracts/configuration-reference/live-specification`, `product:razor/blueprint/product-model/user-workflows` |
| 11 | The session ends on `StopLive`, `PauseLive` or `KillSwitch`: extensions deactivate in reverse order, the strategy runs `OnStopAsync`, and a final status is sent to the Cloud. | Engine, Cloud | `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management`, `product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery` |

## Persisted and Reported

- Live state snapshots are persisted in SQLite so a restart can restore them; the Cloud remains the
  source of truth and may request the full state (`product:razor/blueprint/engine-technical-blueprint/state-persistence`).
- While offline, outgoing data is queued in memory and in the SQLite `QueuedMessages` table
  (`product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry`).
- Health, order latency, rejections and tick latency are recorded as metrics; logs stream to the Cloud on
  demand (`product:razor/blueprint/internal-architecture/telemetry-observability`,
  `product:razor/blueprint/engine-technical-blueprint/logging-and-telemetry`).
- Result data is streamed raw to the Cloud, which stores the session's outcome and renders any report
  (`product:razor/blueprint/internal-architecture/report-generation-engine-role`).
- Behaviour recording, when enabled, captures sparse decision records and uploads them, deleting the local
  file after a successful upload (`product:razor/blueprint/engine-technical-blueprint/behavior-recorder`).

## Failure Modes

| Failure | What happens | Specified by |
|---|---|---|
| Cloud connection lost | Live tasks keep running on the last known configuration; the engine retries forever, queues outgoing data, and accepts no new commands. | `product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry` |
| Credentials no longer valid (`AuthValid` false) | The engine stops all user tasks - live, backtest and optimisation - and refuses new ones until re-authentication succeeds. | `product:razor/blueprint/engine-technical-blueprint/communication-protocol` |
| The adapter becomes unreachable | The engine logs, retries, and if the adapter stays unreachable stops the live task rather than leaving orders unable to reach the market. | `product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery` |
| A live task faults | It is restarted if the configuration allows it, otherwise stopped; a live task is never silently abandoned. | `product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery` |
| A duplicate order is attempted | The in-flight order guard rejects it within the guard timeout, using monotonic time. | `product:razor/blueprint/internal-architecture/broker-architecture`, `product:razor/cross-cutting/principles/live-trading-robustness` |
| The exchange and the engine disagree | State reconciliation corrects the engine's positions and orders from the adapter. | `product:razor/blueprint/internal-architecture/broker-architecture` |
| Stop-out level is breached | The position with the worst floating PnL is force-closed. | `product:razor/blueprint/internal-architecture/broker-architecture` |
| The trader needs one command that stops everything | `KillSwitch` closes all positions, stops all tasks, sends a final status and exits. | `product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery` |
| The process dies unexpectedly | A global exception handler shuts down gracefully after sending a final status, so the Cloud is never left believing a dead engine is healthy. | `product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery` |
| The instance is offline for more than five minutes | The Cloud raises alerts and shows the instance as Offline with the time of last contact. | `product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry` |

## Domain References

- `live-trading`, `engine`: `product:razor/blueprint/internal-architecture/broker-architecture`,
  `product:razor/blueprint/engine-technical-blueprint/concurrency-and-task-management`.
- `cloud`: `product:razor/blueprint/internal-architecture/cloud-control-plane`,
  `product:razor/blueprint/product-model/control-monitoring`.
- `data`, `sdk`: `product:razor/blueprint/internal-architecture/data-flow-architecture`,
  `product:razor/contracts/configuration-reference/market-data-types`.
- `extensions`: `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management`.
- `backtesting`: `product:razor/blueprint/internal-architecture/broker-architecture` - the live broker is
  the other half of the live/backtest parity pair.
- `operations`, `security`: `product:razor/operational/installation-and-deployment/logs-and-troubleshooting`,
  `product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering`.

## Change Entry Point

Start impact discovery here for anything that changes how a live session is started, ticked, ordered,
monitored, kept alive offline, reconciled or stopped.
