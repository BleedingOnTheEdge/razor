---
id: product:razor/blueprint/engine-technical-blueprint/command-system
parent: product:razor/blueprint/engine-technical-blueprint
title: Command System
level: product
kind: blueprint
domains: [engine]
keywords:
  - command system
  - command id
  - command registry
  - commanddispatcher
  - handlers
  - routing
references:
  - product:razor/blueprint/product-model/appendix-a-supported-commands
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
code_paths:
  - core/src/Engine/Management/Commands/**
---

# Command System

Every command, feature and capability carries a **unique numeric ID**, used for versioning,
compatibility checks and routing.

## Command ID bands

Commands group by category, each category owning a range of IDs. The full per-command registry for
v1.0.0 LTS is the authoritative table in
`product:razor/blueprint/product-model/appendix-a-supported-commands`; the bands are:

| Category | ID range | Contains |
|---|---|---|
| System management | 1000-1099 | Auth, heartbeat, shutdown, restart |
| Live trading | 1100-1199 | `StartLive`, `StopLive`, `InjectGenes`, `PauseLive`, `ResumeLive`, `GetLiveState`, `SyncLive` |
| Backtesting | 1200-1299 | `RunBacktest`, `CancelBacktest`, `GetBacktestResult` |
| Optimisation | 1300-1399 | `StartOptimization`, `CancelOptimization`, `PauseOptimization`, `ResumeOptimization`, `GetOptimizationState`, `GetOptimizationResult`, `StepComputation`, `GetCheckpoint`, `SetCheckpoint` |
| Extensions | 1400-1499 | `ReloadExtensions`, `DeployExtension`, `RemoveExtension`, `ListExtensions`, `ActivateExtensions` |
| Reports | 1500-1599 | `GenerateReport`, `GetReport` |
| Logs and telemetry | 1600-1699 | `GetLogs`, `DeleteLogs*`, `SetLogLevel`, `GetMetrics`, `ExportMetrics` |
| Schedules and cron | 1700-1799 | `SetCronJob`, `DeleteCronJob`, `ListCronJobs`, `SetSchedule`, `DeleteSchedule`, `ListSchedules` |
| Admin and broadcast | 1900-1999 | `BroadcastMessage`, `SetAdminConfig`, `GetEngineCapabilities`, `GetEngineVersion` |
| Kill and emergency | 2000-2099 | `KillSwitch`, `EmergencyStop` |
| Behaviour logging | 2100-2199 | `EnableBehaviorLogging`, `DisableBehaviorLogging`, `GetBehaviorLogs`, `DeleteBehaviorLogs` |

## Handler design

- Each command is a class deriving from `CommandHandlerBase`.
- `CommandDispatcher` routes an inbound message by its `CommandId` to the matching handler.
- Handlers reach core services through dependency injection.
- The dispatcher is constructed in `Program` and wired to the `CloudConnector`, so an arriving
  `Command` message becomes a dispatch without the transport knowing about handlers.

Adding a command means adding a handler and an ID in the owning band - the dispatcher does not change.
