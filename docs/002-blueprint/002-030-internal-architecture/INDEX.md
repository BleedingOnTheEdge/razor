---
id: product:razor/blueprint/internal-architecture
title: Razor Internal Technical Architecture
level: product
kind: blueprint
domains: [engine, cloud]
keywords:
  - internal architecture
  - core engine
  - kernel
  - data flow
  - brokers
  - backtesting
  - hooks
  - optimisation
  - threading
  - determinism
references:
  - product:razor/blueprint/product-model
  - product:razor/blueprint/engine-technical-blueprint
  - product:razor/cross-cutting/principles
code_paths:
  - core/src/Kernel/**
  - core/src/Shared/**
  - core/src/Engine/**
  - core/src/Cloud/**
---

# Razor Internal Technical Architecture

Internal architecture for core developers: how data reaches the engine, how brokers, backtesting,
hooks and optimisation work, and the determinism and threading rules that bind them.

This section governs the closed-source components. It is **not** the SDK contract surface:
extension developers build against the contracts under `product:razor/contracts` and never need
this section.

Any architecture deviation must be approved by the Razor architecture board.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/blueprint/internal-architecture/introduction | Scope, audience, and how this section relates to the SDK contracts. | engine | | |
| product:razor/blueprint/internal-architecture/solution-structure | Projects, dependency graph, repository layout, and how the engine composes them. | engine, cloud | | core/src/**, core/tests/** |
| product:razor/blueprint/internal-architecture/data-flow-architecture | From binary tick file to borrowed ticks: the historical and live data paths. | data, engine | | core/src/Shared/**, core/src/Kernel/Backtesting/** |
| product:razor/blueprint/internal-architecture/clock-system | `TickClock` and `SystemClock`, and why market time never mixes with wall time. | engine | | core/src/Kernel/Clock/** |
| product:razor/blueprint/internal-architecture/broker-architecture | `SimulatedBroker` and `LiveBroker`, their parity contract and reconciliation. | live-trading, backtesting | live-trading-session, backtest-run | core/src/Kernel/Brokers/** |
| product:razor/blueprint/internal-architecture/backtesting-engine | `BacktestRunner`: inputs, execution flow, gene injection and teardown. | backtesting | backtest-run | core/src/Kernel/Backtesting/** |
| product:razor/blueprint/internal-architecture/hook-system-architecture | Filter and action hooks: registry, invocation, priority and sub-registries. | extensions | extension-development | core/src/Kernel/Hooks/** |
| product:razor/blueprint/internal-architecture/genetic-optimisation-engine | Chromosomes, selection, crossover, mutation, stagnation and resumable state. | optimisation | optimisation-run | core/src/Kernel/Optimization/** |
| product:razor/blueprint/internal-architecture/configuration-specification-system | The specification types the engine validates and parses. | engine | | core/src/Kernel/Configuration/** |
| product:razor/blueprint/internal-architecture/extension-loading-versioning | Load contexts, version attributes and assembly isolation. | extensions | extension-deployment | core/src/Kernel/**, core/src/Engine/Pluggability/** |
| product:razor/blueprint/internal-architecture/messaging-events | The message bus and the catalog of engine events. | engine | | core/src/Kernel/Messaging/**, core/src/Kernel/Events/** |
| product:razor/blueprint/internal-architecture/threading-concurrency | Which work runs on which thread, and where the locks are. | engine | | |
| product:razor/blueprint/internal-architecture/telemetry-observability | The metrics the engine emits and how they are exported. | engine, reporting | | core/src/Kernel/Telemetry/** |
| product:razor/blueprint/internal-architecture/report-generation-engine-role | What the engine contributes to reporting, and why rendering is not its job. | reporting | | core/src/Kernel/Reporting/** |
| product:razor/blueprint/internal-architecture/determinism-infrastructure | Portable RNG, seeding, the clock prohibition and golden tests. | engine | | core/src/Sdk/Shared/CustomizedRandom.cs |
| product:razor/blueprint/internal-architecture/cloud-control-plane | Cloud's surface, placement, and what it must reconstruct from engine runs. | cloud | | core/src/Cloud/** |
