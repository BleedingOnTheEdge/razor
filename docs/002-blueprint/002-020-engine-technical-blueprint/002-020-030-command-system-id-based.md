---
id: product:razor/blueprint/engine-technical-blueprint/command-system-id-based
parent: product:razor/blueprint/engine-technical-blueprint
title: 4. Command System (ID‑Based)
level: product
kind: blueprint
---

# 4. Command System (ID‑Based)

Every command, feature, and capability in the system is assigned a **unique numeric ID**. This ID is used for versioning, compatibility checks, and efficient routing.

## 4.1 Command ID Registry

Commands are grouped by category, each with a range of IDs. **All 60+ commands are implemented** in `Razor.Core.Engine.Management.Commands.Handlers`.

| Category | ID Range | Description |
|----------|----------|-------------|
| System Management | 1000‑1099 | Auth, heartbeat, shutdown, restart |
| Live Trading | 1100‑1199 | StartLive, StopLive, InjectGenes, PauseLive, ResumeLive, GetLiveState, SyncLive |
| Backtesting | 1200‑1299 | RunBacktest, CancelBacktest, GetBacktestResult |
| Optimisation | 1300‑1399 | StartOptimization, CancelOptimization, PauseOptimization, ResumeOptimization, GetOptimizationState, GetOptimizationResult |
| Extensions | 1400‑1499 | ReloadExtensions, DeployExtension, RemoveExtension, ListExtensions, ActivateExtensions |
| Reports | 1500‑1599 | GenerateReport, GetReport |
| Logs & Telemetry | 1600‑1699 | GetLogs, DeleteLogsAll, DeleteLogsExpired, SetLogLevel, GetMetrics, ExportMetrics |
| Schedules & Cron | 1700‑1799 | SetCronJob, DeleteCronJob, ListCronJobs, SetSchedule, DeleteSchedule, ListSchedules |
| Admin & Broadcast | 1900‑1999 | BroadcastMessage, SetAdminConfig, GetEngineCapabilities, GetEngineVersion |
| Kill & Emergency | 2000‑2099 | KillSwitch, EmergencyStop |
| Behaviour Logging | 2100‑2199 | EnableBehaviorLogging, DisableBehaviorLogging, GetBehaviorLogs, DeleteBehaviorLogs |

## 4.2 Command Handler Design

- Each command implemented as a class inheriting from `CommandHandlerBase`.
- `CommandDispatcher` routes incoming messages based on `CommandId` to the appropriate handler.
- Handlers have access to all core services via dependency injection.
- The dispatcher is initialised in `Program.cs` and wired to the `CloudConnector`.

---
