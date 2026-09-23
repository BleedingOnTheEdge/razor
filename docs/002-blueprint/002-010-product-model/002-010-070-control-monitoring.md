---
id: product:razor/blueprint/product-model/control-monitoring
parent: product:razor/blueprint/product-model
title: 8. Control & Monitoring
level: product
kind: blueprint
---

# 8. Control & Monitoring

## 8.1 Command Model
Razor Cloud issues asynchronous commands to the Engine. Each command has a unique ID, a type, and a payload. Example commands:

- `StartLive` / `StopLive`
- `RunBacktest`
- `StartOptimization` / `CancelOptimization`
- `InjectGenes`
- `DeployExtension`
- `UpdateEngine`
- `ReloadExtensions`
- `GetStatus` / `GetLogs`

The engine acknowledges receipt, executes, and streams progress events and final results back.

## 8.2 Monitoring
The Cloud dashboard displays:

- Real‑time equity, balance, drawdown, and margin for live sessions.
- Open positions and pending orders.
- Engine health: connectivity, last tick age, CPU/memory usage.
- Operation progress: backtest percent complete, optimisation generation and best fitness.

## 8.3 Reporting
All result data (trade histories, equity curves, population snapshots, per‑symbol metrics, correlation matrices) is stored in the Cloud. Users can generate reports (Excel, JSON, PDF) on demand, or configure periodic report generation. The engine never generates formatted reports; it streams raw data only.

---
