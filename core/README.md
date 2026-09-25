# Solution README.md — Razor.Core

**Location:** `core/README.md` (Root of the Razor.Core solution)  
**Status:** Authoritative  
**Last Updated:** 2026-07-09  

---

# Razor.Core

**Institutional‑grade algorithmic trading engine – v1.0.0 LTS**

Welcome to the Razor.Core solution. This repository contains the heart of the Razor ecosystem: the public SDK for extension developers, the shared utilities for high‑performance I/O, the closed‑source engine that executes backtests, optimisations, and live trading, and the headless engine executable that connects to Razor Cloud.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Razor Cloud                            │
│                      (SaaS – management & monitoring)              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ encrypted WebSocket
┌──────────────────────────────▼──────────────────────────────────────┐
│                          Razor Engine                            │
│                   (headless executable – closed source)             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                        Kernel                         │
│                     (closed‑source core library)                    │
│  backtesting • optimisation • live trading • genetic algorithm      │
│  brokers • hooks • telemetry • message bus                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                        Shared                         │
│                   (shared utilities – closed source)                │
│       memory‑mapped tick lists • binary file mapping               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ references
┌──────────────────────────────▼──────────────────────────────────────┐
│                         Sdk                           │
│                      (public NuGet SDK – open contracts)            │
│             hooks • slots • domain types • utilities               │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

| Principle | Description |
|-----------|-------------|
| **Determinism** | Given the same inputs, Razor produces bit‑identical outputs on every run. |
| **Tick‑Only Core** | All operations use raw ticks; OHLC aggregated on‑demand. |
| **Market Agnosticism** | Razor has zero knowledge of any specific market type; all exchange logic resides in adapters. |
| **Live‑Backtest Parity** | Simulated and live brokers use the same `IMarketCalculator` for identical behaviour. |
| **Cloud‑First** | The Engine is a thin client; all configuration, scheduling, and reporting reside in the Cloud. |
| **Infinite Resiliency** | If Cloud connectivity is lost, the Engine retries forever and never exits. |
| **Extension Isolation** | Extensions are loaded in isolated `AssemblyLoadContext`s; hot‑reloadable. |

---

## Projects

| Project | Description | Visibility |
|---------|-------------|------------|
| `Sdk` | Public SDK for building extensions (adapters, strategies, indicators, hook plugins, NN models). Contains only contracts – no runtime logic. | NuGet package (proprietary, freely redistributable) |
| `Shared` | Shared utilities for high‑performance I/O: memory‑mapped tick files (`MemoryMappedTickList`), binary file mapping (`BinaryDataMapper`), and borrowed data management (`BorrowedTickData`). | Private (closed‑source) |
| `Kernel` | Core engine implementing all trading logic: backtesting, optimisation, live trading, brokers (simulated and live), genetic algorithm, hooks, telemetry, and message bus. | Private (closed‑source) |
| `Engine` | Headless executable that hosts the Kernel, manages extensions, and communicates with Razor Cloud via encrypted WebSocket. Includes CLI, service support, self‑update, and command dispatch (60+ commands). | Private (closed‑source) |

```
Sdk
       ↑
Shared
       ↑
Kernel
       ↑
Engine
```

Extensions (adapters, strategies, indicators, hook plugins, NN models) reference **only** `Sdk`.

---

## Quick Start

### For Extension Developers

1. Install the `Sdk` NuGet package in your .NET class library targeting `net10.0`.
2. Add the SDK version attribute:
   ```csharp
   [assembly: SdkVersionAttribute("1.0.0")]
   ```
3. Implement one or more contracts:
   - `IAdapterCapability` – for broker connectivity
   - `IStrategyCapability` – for trading logic
   - `INeuralNetworkModel` – for neural network models
   - `Indicator` – for technical indicators
   - `IHookManifest` – for hook plugins
4. Build your DLL and place it in the appropriate engine directory.
5. Manage activation via Razor Cloud.

For detailed guidance, see the [Extension Developer Guide](../docs/004-contracts/004-010-extension-developer-guide/INDEX.md).

### For Core Developers

#### Prerequisites
- .NET 10 SDK (`10.0.300`, pinned by [`global.json`](../global.json) at the repository root)

#### Build
```bash
cd core
dotnet restore
dotnet build --configuration Release
```

#### Test
```bash
dotnet test --configuration Release
```

#### Run the Engine

```bash
cd src/Engine
dotnet run -- --auth=username,password,apikey
```

Or run interactively (prompts for credentials):

```bash
dotnet run
```

#### Run as a Service

**Windows:**
```bash
sc create RazorEngine binPath = "C:\Path\Engine.exe --service --auth=user,pass,key" start=auto
```

**Linux (systemd):**
```ini
[Service]
ExecStart=/opt/Razor/Engine --service --auth=user,pass,key
WorkingDirectory=/opt/Razor
Restart=on-failure
```

---

## Repository Structure

```
core/
├── src/
│   ├── Sdk/          ← Public contracts (NuGet package)
│   │   ├── Hooks/                 ← Hook registration interfaces and contexts
│   │   ├── Shared/                ← Domain types, enums, exceptions, helpers
│   │   └── Slots/                 ← Capability interfaces (Adapter, Strategy, NN)
│   ├── Shared/       ← Shared utilities (memory‑mapped I/O)
│   ├── Kernel/       ← Core engine implementation
│   │   ├── Backtesting/           ← Backtest runner, input, result
│   │   ├── Brokers/               ← SimulatedBroker, LiveBroker
│   │   ├── Clock/                 ← TickClock, SystemClock
│   │   ├── Configuration/         ← ExecutionSpec, OptimizationSpec, LiveSpec
│   │   ├── Events/                ← Domain events (BacktestCompleted, etc.)
│   │   ├── Hooks/                 ← Hook registry, invoker, contexts
│   │   ├── Indicators/            ← Indicator registry
│   │   ├── Messaging/             ← Message bus
│   │   ├── Metrics/               ← FitnessCalculator, MetricsCalculator
│   │   ├── NeuralNetworks/        ← FeedForwardNetwork (built‑in)
│   │   ├── Optimization/          ← GeneticOptimizer, Chromosome, Runner
│   │   ├── Reporting/             ← ReportGenerator (stub; Cloud renders reports)
│   │   └── Telemetry/             ← CoreMetrics (OpenTelemetry)
│   └── Engine/       ← Headless executable
│       ├── Communication/         ← CloudConnector, BinaryTransferManager
│       ├── Core/                  ← Security, State, Credentials, Logging
│       ├── Extensions/            ← ExtensionManager, PluginLoadContext
│       ├── Kernel/                ← KernelService (facade)
│       ├── Management/            ← CommandDispatcher, TaskManager, CronJobManager
│       ├── Services/              ← BehaviorRecorder, SelfUpdateManager
│       └── Program.cs             ← Entry point
├── tests/
│   ├── Sdk.UnitTests/       ← 200+ unit tests
│   └── Sdk.IntegrationTests/ ← Integration tests
├── Razor.sln               ← Solution file
├── Directory.Build.props          ← Common build properties
├── nuget.config                   ← Package sources
├── .editorconfig                  ← Code style rules
└── .gitignore                     ← Git ignore rules
```

The Razor documentation tree (`docs/`) and the SDK pin (`global.json`) live at the **repository root**, outside `core/`.

---

## Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| [Razor Principles](../docs/005-cross-cutting/005-001-principles/INDEX.md) | All teams | Immutable architectural rules governing every Razor project. |
| [Configuration Reference](../docs/004-contracts/004-001-configuration-reference/INDEX.md) | Extension developers & power users | Complete catalog of configuration objects, enums, and validation rules. |
| [Extension Developer Guide](../docs/004-contracts/004-010-extension-developer-guide/INDEX.md) | Extension developers | Comprehensive guide for building adapters, strategies, indicators, hook plugins, and NN models. |
| [Installation & Deployment Guide](../docs/006-operational/006-001-installation-and-deployment/INDEX.md) | End‑users & IT staff | Step‑by‑step installation, configuration, and troubleshooting. |
| [Engine Technical Blueprint](../docs/002-blueprint/002-020-engine-technical-blueprint/INDEX.md) | Core developers | Complete engine specification: CLI, communication protocol, commands, security. |
| [Internal Architecture Document](../docs/002-blueprint/002-030-internal-architecture/INDEX.md) | Core developers | Data flow, broker architecture, hook system, GA engine, threading, telemetry. |
| [Product Model](../docs/002-blueprint/002-010-product-model/INDEX.md) | All teams | Product overview, components, licensing, and workflows. |
| [Glossary](../docs/005-cross-cutting/005-010-glossary/INDEX.md) | All users | Definitions of all domain‑specific terms. |
| [Future Features](../docs/002-blueprint/002-040-future-features/INDEX.md) | Internal & partners | Long‑term roadmap of planned features. |
| [Project Overview](../docs/002-blueprint/002-001-project-overview/INDEX.md) | External | High‑level introduction to Razor. |

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Tick‑Only Core** | All operations use raw ticks; OHLC aggregated on‑demand. |
| **Deterministic** | Bit‑identical outputs across runs; golden tests enforce determinism. |
| **Live‑Backtest Parity** | Simulated and live brokers use the same `IMarketCalculator`. |
| **Genetic Algorithm** | Population‑based optimisation with elitism, tournament selection, crossover, mutation, and hyper‑mutation. |
| **Neural Network Support** | Unified `INeuralNetworkModel` interface; built‑in feed‑forward network. |
| **Hook System** | Priority‑based extensibility with filter and action hooks across backtest, live, optimisation, and report pipelines (50+ hook points). |
| **Extension Isolation** | Loaded in isolated `AssemblyLoadContext`s; hot‑reloadable. |
| **Cloud‑Connected** | Persistent encrypted WebSocket; infinite retry; remote command execution. |
| **Self‑Update** | Automatic binary updates via Cloud heartbeat. |
| **Behavior Logging** | Sparse behaviour recording for RL training with MessagePack + GZip compression. |
| **Performance** | Memory‑mapped files, pooled arrays, allocation‑free hot paths. |

---

## Versioning

| Version | Status | Description |
|---------|--------|-------------|
| **1.0.0 LTS** | Current | Stable release with hooks‑and‑slots extension system, GA optimisation, live trading, Cloud connectivity, and 60+ commands. |
| **1.5.0** | Planned | Enhanced reporting, performance improvements, additional hook points. |
| **2.0.0 LTS** | Planned | Multi‑operation engine, advanced marketplace, ONNX and RL model support. |

Razor follows [Semantic Versioning](https://semver.org). Each major version is an LTS release.

---

## Command ID Registry

All 60+ commands are fully implemented in `Engine.Management.Commands.Handlers`.

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

---

## Licensing

| Project | License |
|---------|---------|
| `Sdk` | Proprietary, freely redistributable for extension development. |
| `Shared` | Closed‑source, all rights reserved. |
| `Kernel` | Closed‑source, all rights reserved. |
| `Engine` | Closed‑source, distributed as part of the Razor Engine binary. |

---

## Contributing

This repository is closed‑source. Contribution is restricted to Razor core team members.

For extension development, please refer to the [Extension Developer Guide](../docs/004-contracts/004-010-extension-developer-guide/INDEX.md).

---

## Support

- **Documentation:** See the [documentation index](../docs/INDEX.md).
- **Issues:** Contact Razor support through the Cloud dashboard.
- **Community:** Visit the Razor developer forum (coming soon).

---

*This README is the authoritative entry point for the Razor.Core solution. All code, documentation, and design decisions must align with the [Razor Principles](../docs/005-cross-cutting/005-001-principles/INDEX.md).*
