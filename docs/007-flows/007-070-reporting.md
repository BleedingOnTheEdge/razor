---
id: product:razor/flows/reporting
parent: product:razor/flows
title: Reporting
level: product
kind: contract
domains: [cloud, engine, reporting]
flows: [reporting]
keywords:
  - reporting
  - report
  - GenerateReport
  - GetReport
  - equity curve
  - trade history
  - metrics export
  - log streaming
references:
  - product:razor/blueprint/internal-architecture/report-generation-engine-role
  - product:razor/blueprint/internal-architecture/messaging-events
  - product:razor/blueprint/internal-architecture/telemetry-observability
  - product:razor/blueprint/internal-architecture/cloud-control-plane
  - product:razor/blueprint/engine-technical-blueprint/logging-and-telemetry
  - product:razor/blueprint/engine-technical-blueprint/behavior-recorder
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
  - product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry
  - product:razor/blueprint/product-model/control-monitoring
  - product:razor/blueprint/product-model/appendix-a-supported-commands
  - product:razor/blueprint/engine-technical-blueprint/command-system
  - product:razor/contracts/configuration-reference/hook-system
implements: [reporting]
---

# Reporting

## Purpose

Make every run's outcome visible to the user. The engine produces raw result, progress and telemetry data
and streams it to the Cloud; the Cloud stores it and renders the user-facing report. The engine never
renders a formatted report, and that split is deliberate.

## Participants

| Component | Role in this flow |
|---|---|
| Cloud | Stores runs, results, progress, reports and provenance; renders reports on demand or on a schedule. |
| Engine | Streams raw result, progress, log, metric and behaviour data; invokes the report hooks. |
| Hook plugins (extensions) | Capture or modify raw data around report generation, and log custom output. |
| User | Requests a report, or configures periodic generation. |

## Steps

| # | Step | Owner | Specified by |
|---|---|---|---|
| 1 | During and after a run, the engine emits result and progress events: `BacktestStartedEvent`, `BacktestCompletedEvent`, `OptimizationGenerationEvent`, `OptimizationCycleCompletedEvent`, `OrderExecutedEvent`, `LiveSessionEndedEvent`, `StateUpdate` and command progress. | Engine | `product:razor/blueprint/internal-architecture/messaging-events`, `product:razor/blueprint/engine-technical-blueprint/communication-protocol` |
| 2 | The raw events travel over the encrypted WebSocket; large payloads - result files, tick data, logs, extension DLLs - use chunked binary transfer on the same socket. | Engine, Cloud | `product:razor/blueprint/engine-technical-blueprint/communication-protocol` |
| 3 | The Cloud stores all product data: runs, results, progress, reports and provenance. | Cloud | `product:razor/blueprint/internal-architecture/cloud-control-plane` |
| 4 | The engine's only report-side role: `ReportGenerator` invokes the report hooks, `OnBeforeGenerate` (filter) and `OnAfterGenerate` (action), so plugins can capture or modify the raw data or log it. | Engine, plugins | `product:razor/blueprint/internal-architecture/report-generation-engine-role`, `product:razor/contracts/configuration-reference/hook-system` |
| 5 | The command registry also exposes `GenerateReport` and `GetReport` (reports band 1500-1501); rendering itself remains Cloud-side. | Cloud, Engine | `product:razor/blueprint/product-model/appendix-a-supported-commands`, `product:razor/blueprint/engine-technical-blueprint/command-system` |
| 6 | The user generates a report on demand, or configures periodic generation; supported result formats include Excel, JSON and PDF. | Cloud, user | `product:razor/blueprint/product-model/control-monitoring` |
| 7 | Logs are pushed on demand: the Cloud sends `GetLogs` with filters and the engine replies with a binary transfer of the matching files. | Cloud, Engine | `product:razor/blueprint/engine-technical-blueprint/logging-and-telemetry` |
| 8 | Metrics are exposed through OpenTelemetry and can be queried or exported; the dashboard turns them into health and progress views. | Engine, Cloud | `product:razor/blueprint/internal-architecture/telemetry-observability`, `product:razor/blueprint/product-model/control-monitoring` |
| 9 | Behaviour logs, when recording is enabled, are uploaded periodically and deleted locally after a successful upload. | Engine, Cloud | `product:razor/blueprint/engine-technical-blueprint/behavior-recorder` |

## Persisted and Reported

- The Cloud is the store for everything a user can report on; the engine keeps no long-term result state
  (`product:razor/blueprint/internal-architecture/cloud-control-plane`,
  `product:razor/blueprint/engine-technical-blueprint/state-persistence`).
- On the engine, only rotating logs, the local SQLite runtime tables and the behaviour-log files exist;
  behaviour-log files are removed once uploaded
  (`product:razor/blueprint/engine-technical-blueprint/logging-and-telemetry`,
  `product:razor/blueprint/engine-technical-blueprint/behavior-recorder`).
- Progress is reportable while a run is in flight, not only at the end: percent complete for a backtest,
  generation and best fitness for an optimisation, equity and drawdown for live
  (`product:razor/blueprint/product-model/control-monitoring`).

## Failure Modes

| Failure | What happens | Specified by |
|---|---|---|
| The Cloud connection is lost while results are produced | Outgoing data is queued in memory and in the SQLite `QueuedMessages` table until the connection returns; nothing is dropped silently by the engine. | `product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry` |
| A report hook callback throws | Action-hook exceptions are caught and logged and never stop the chain; an `async void` callback would crash the process and is prohibited. | `product:razor/contracts/configuration-reference/hook-system` |
| An extension expects the engine to render a report | It cannot: rendering is the Cloud's responsibility and the engine streams raw data only. | `product:razor/blueprint/internal-architecture/report-generation-engine-role` |
| A behaviour-log upload fails | The local file is only deleted after a successful upload, so an unuploaded log remains on disk. | `product:razor/blueprint/engine-technical-blueprint/behavior-recorder` |
| Logs consume disk | Rotation bounds them: daily files with a 10 MB size limit and 31-day retention, and `DeleteLogs*` commands exist. | `product:razor/blueprint/engine-technical-blueprint/logging-and-telemetry`, `product:razor/blueprint/product-model/appendix-a-supported-commands` |

## Domain References

- `reporting`: `product:razor/blueprint/internal-architecture/report-generation-engine-role` - the engine's
  contribution, and the reason it does not render.
- `cloud`: `product:razor/blueprint/internal-architecture/cloud-control-plane`,
  `product:razor/blueprint/product-model/control-monitoring` - storage and rendering.
- `engine`: `product:razor/blueprint/internal-architecture/messaging-events`,
  `product:razor/blueprint/engine-technical-blueprint/behavior-recorder` - the events and files this flow
  carries.

## Change Entry Point

Start impact discovery here for anything that changes what a run reports, how progress becomes visible, or
how results are stored and rendered.
