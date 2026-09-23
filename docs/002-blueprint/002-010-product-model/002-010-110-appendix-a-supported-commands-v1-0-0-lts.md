---
id: product:razor/blueprint/product-model/appendix-a-supported-commands-v1-0-0-lts
parent: product:razor/blueprint/product-model
title: Appendix A: Supported Commands (v1.0.0 LTS)
level: product
kind: blueprint
---

# Appendix A: Supported Commands (v1.0.0 LTS)

| Category | Command | ID |
|----------|---------|----|
| System Management | GetStatus, PauseEngine, ResumeEngine, Shutdown, Restart, SetConfig, GetConfig, GetCapabilities | 1003‑1010 |
| Live Trading | StartLive, StopLive, InjectGenes, PauseLive, ResumeLive, GetLiveState, SyncLive, SetLiveConfig, GetLiveMetrics | 1100‑1108 |
| Backtesting | RunBacktest, CancelBacktest, GetBacktestResult, ListBacktests | 1200‑1203 |
| Optimisation | StartOptimization, CancelOptimization, PauseOptimization, ResumeOptimization, GetOptimizationState, GetOptimizationResult, ListOptimizations | 1300‑1306 |
| Extensions | ReloadExtensions, DeployExtension, RemoveExtension, ListExtensions, ActivateExtensions | 1400‑1404 |
| Reports | GenerateReport, GetReport | 1500‑1501 |
| Logs & Telemetry | GetLogs, DeleteLogsAll, DeleteLogsExpired, SetLogLevel, GetMetrics, ExportMetrics | 1600‑1605 |
| Schedules & Cron | SetCronJob, DeleteCronJob, ListCronJobs, SetSchedule, DeleteSchedule, ListSchedules | 1700‑1705 |
| Admin & Broadcast | BroadcastMessage, SetAdminConfig, GetEngineCapabilities, GetEngineVersion | 1900‑1903 |
| Kill & Emergency | KillSwitch, EmergencyStop | 2000‑2001 |
| Behaviour Logging | EnableBehaviorLogging, DisableBehaviorLogging, GetBehaviorLogs, DeleteBehaviorLogs | 2100‑2103 |

---

*This concludes the Razor Product Model document.*