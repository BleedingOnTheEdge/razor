---
id: product:razor/blueprint
title: Razor Blueprint
level: product
kind: blueprint
domains: [engine, cloud, backtesting, live-trading, optimisation, data, marketplace, licensing, reporting, security]
keywords:
  - blueprint
  - product model
  - engine specification
  - internal architecture
  - future features
---

# Razor Blueprint

What Razor is, how it is shaped as a product, how the engine is specified, and where it is going.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/blueprint/project-overview | What Razor is, the technology it is built on, the market it addresses, and the vision. | engine | | |
| product:razor/blueprint/product-model | Product components, deployment and distribution, licensing, user workflows, configuration, control and monitoring, extensibility, roadmap and branding. | engine, cloud, licensing, marketplace | onboarding | |
| product:razor/blueprint/engine-technical-blueprint | The engine specification: CLI and startup, communication protocol, commands, extensions and slots, concurrency, schedules, security, telemetry, self-update and platform behaviour. | engine, cloud, security, extensions | engine-update, extension-deployment | core/src/Engine/** |
| product:razor/blueprint/internal-architecture | Internal architecture for core developers: data flow, clock, brokers, backtesting, hooks, genetic optimisation, threading, determinism and the Cloud control plane. | engine, cloud, data, backtesting, live-trading, optimisation | backtest-run, live-trading-session, optimisation-run | core/src/Kernel/**, core/src/Shared/** |
| product:razor/blueprint/future-features | Forward-looking catalogue of planned features beyond v1.0.0 LTS; no commitments implied. | engine, cloud, extensions, data, reporting, operations | | |