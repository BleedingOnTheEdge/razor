---
id: product:razor/blueprint/product-model/appendix-a-supported-commands
parent: product:razor/blueprint/product-model
title: "Appendix A: Supported Commands (v1.0.0 LTS)"
level: product
kind: blueprint
domains: [engine]
keywords:
  - commands
  - command ids
  - command registry
  - supported commands
  - appendix a
  - kill switch
  - emergency stop
references:
  - product:razor/blueprint/product-model/control-monitoring
  - product:razor/blueprint/engine-technical-blueprint
code_paths:
  - core/src/Engine/Management/Commands/CommandIds.cs
---

# Appendix A: Supported Commands (v1.0.0 LTS)

The complete command surface the engine exposes in v1.0.0 LTS, grouped by ID band. The engine routes
an inbound command by its `CommandId`.

| Category | Commands | ID band |
|---|---|---|
| System management | `GetStatus`, `PauseEngine`, `ResumeEngine`, `Shutdown`, `Restart`, `SetConfig`, `GetConfig`, `GetCapabilities` | 1003-1010 |
| Live trading | `StartLive`, `StopLive`, `InjectGenes`, `PauseLive`, `ResumeLive`, `GetLiveState`, `SyncLive`, `SetLiveConfig`, `GetLiveMetrics` | 1100-1108 |
| Backtesting | `RunBacktest`, `CancelBacktest`, `GetBacktestResult`, `ListBacktests` | 1200-1203 |
| Optimisation | `StartOptimization`, `CancelOptimization`, `PauseOptimization`, `ResumeOptimization`, `GetOptimizationState`, `GetOptimizationResult`, `ListOptimizations`, `StepComputation`, `GetCheckpoint`, `SetCheckpoint` | 1300-1309 |
| Extensions | `ReloadExtensions`, `DeployExtension`, `RemoveExtension`, `ListExtensions`, `ActivateExtensions` | 1400-1404 |
| Reports | `GenerateReport`, `GetReport` | 1500-1501 |
| Logs and telemetry | `GetLogs`, `DeleteLogsAll`, `DeleteLogsExpired`, `SetLogLevel`, `GetMetrics`, `ExportMetrics` | 1600-1605 |
| Schedules and cron | `SetCronJob`, `DeleteCronJob`, `ListCronJobs`, `SetSchedule`, `DeleteSchedule`, `ListSchedules` | 1700-1705 |
| Admin and broadcast | `BroadcastMessage`, `SetAdminConfig`, `GetEngineCapabilities`, `GetEngineVersion` | 1900-1903 |
| Kill and emergency | `KillSwitch`, `EmergencyStop` | 2000-2001 |
| Behaviour logging | `EnableBehaviorLogging`, `DisableBehaviorLogging`, `GetBehaviorLogs`, `DeleteBehaviorLogs` | 2100-2103 |
