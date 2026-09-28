---
id: product:razor/blueprint/product-model/control-monitoring
parent: product:razor/blueprint/product-model
title: Control and Monitoring
level: product
kind: blueprint
domains: [cloud, engine]
flows: [backtest-run, optimisation-run, live-trading-session, reporting]
keywords:
  - command model
  - asynchronous commands
  - acknowledgements
  - progress
  - monitoring
  - dashboard
  - reporting
  - equity curve
  - drawdown
  - margin
references:
  - product:razor/blueprint/product-model/appendix-a-supported-commands
  - product:razor/blueprint/engine-technical-blueprint
code_paths:
  - core/src/Engine/Management/Commands/**
---

# Control and Monitoring

## Command model

The Cloud issues **asynchronous commands** to the engine. Each command carries a unique ID, a type
and a payload. Representative commands:

- `StartLive` / `StopLive`
- `RunBacktest`
- `StartOptimization` / `CancelOptimization`
- `InjectGenes`
- `DeployExtension`
- `UpdateEngine`
- `ReloadExtensions`
- `GetStatus` / `GetLogs`

The engine acknowledges receipt, executes, and streams progress events and final results back. The
full registry for v1.0.0 LTS is in
`product:razor/blueprint/product-model/appendix-a-supported-commands`; the wire protocol that carries
these commands is specified in `product:razor/blueprint/engine-technical-blueprint`.

## Monitoring

The Cloud dashboard displays:

- real-time equity, balance, drawdown and margin for live sessions;
- open positions and pending orders;
- engine health - connectivity, last tick age, CPU and memory usage;
- operation progress - backtest percent complete, optimisation generation and best fitness.

## Reporting

All result data - trade histories, equity curves, population snapshots, per-symbol metrics,
correlation matrices - is stored in the Cloud. Users generate reports (Excel, JSON, PDF) on demand, or
configure periodic generation.

**The engine never generates formatted reports.** It streams raw data only; the Cloud renders it.
This split is deliberate: it keeps the engine thin and keeps report format an evolving server-side
concern.
