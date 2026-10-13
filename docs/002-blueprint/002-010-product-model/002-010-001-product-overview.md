---
id: product:razor/blueprint/product-model/product-overview
parent: product:razor/blueprint/product-model
title: Product Overview
level: product
kind: blueprint
domains: [engine, cloud, marketplace, sdk]
keywords:
  - product overview
  - components
  - engine
  - cloud
  - marketplace
  - sdk
  - headless
  - stateless
  - public sdk
  - sdk namespaces
  - extension types
references:
  - product:razor/blueprint/product-model/deployment-distribution
  - product:razor/contracts/configuration-reference
  - product:razor/blueprint/internal-architecture
---

# Product Overview

Razor is an institutional-grade algorithmic trading engine for **strategy optimisation and fully
managed automated trading**. It is delivered as a distributed ecosystem: a lightweight, headless
execution engine runs on the client's own infrastructure, while control, scheduling, monitoring,
reporting and extension management are centralised in a cloud-based control plane.

Clients keep full custody of their funds and trading infrastructure while using an enterprise-grade
toolset for strategy development, optimisation and live execution, managed through a web interface.

## The four components

| Component | Role |
|---|---|
| **Razor Engine** | The execution node deployed on client servers. |
| **Razor Cloud** | The central management, command and reporting dashboard. |
| **Razor Marketplace** | A separate service for discovering, licensing and distributing extensions. |
| **`Sdk`** | The public SDK exposing only the contracts needed to build extensions. |

### Razor Engine

A single headless binary serves both developers and production users - there is no separate
development build. The same executable is deployed everywhere; capabilities are gated entirely by the
licence and permissions issued by the Cloud after authentication.

- **Headless.** After authenticating, the engine displays a live log stream and writes rotating daily
  logs to a local `logs/` directory. There is no interactive CLI, menu or local command interface;
  all interaction happens through the Cloud.
- **Stateless execution node.** It holds no long-term configuration, schedule or business logic. It
  receives commands - run backtest, start live, inject genes - with all required configuration from
  the Cloud, executes them, and streams results back.
- **Task-oriented architecture.** From v2.0.0 LTS the engine supports concurrent operations (a live
  session while an optimisation runs), each isolated with its own clock, broker instance and data
  context.
- **Platforms.** Windows (x64) and Linux (Debian/Ubuntu, x64).

**Bootstrap.** No configuration file is required. Credentials are supplied interactively at startup,
by the `--auth=username,password,apikey` flag for services and automation, or by the
`RAZOR_AUTH_TOKEN` environment variable carrying a base64-encoded `username:password:apikey`. All
operational parameters - strategy specifications, execution specifications, timeframes, symbols -
are pushed from the Cloud per command. Credentials are held in memory only and never persisted.

### Razor Cloud

The web-based control plane and the **sole interface** for interacting with engines, whether
developing a strategy or running production.

- **Instance management** - register engines, issue and revoke API keys, monitor connectivity and
  health.
- **Remote command and control** - start and stop strategies, trigger backtests, launch
  optimisations, inject genes, deploy extension DLLs, update engine binaries. Commands are queued and
  executed when the engine acknowledges.
- **Scheduling** - the Cloud holds all scheduling logic; for example, continuous optimisation runs
  are triggered by the Cloud from user-defined calendars, and the engine keeps no operational timers.
- **Real-time monitoring** - live equity curves, open positions, pending orders, margin utilisation,
  connection status and tick freshness.
- **Reporting and analytics** - all backtest and optimisation results are stored in the Cloud, and
  users generate rich reports on demand or on a schedule. The engine never generates formatted
  reports; it ships raw result data and the Cloud renders it (see
  `product:razor/contracts/configuration-reference`).
- **User and licence management** - role-based access, subscription tracking, feature flags,
  instance limits.
- **Configuration management** - all strategy, execution and optimisation configuration is created
  and stored in the Cloud; the engine holds nothing beyond its bootstrap.
- **Secrets management** - broker API keys and other secrets are stored in the Cloud and fetched by
  the engine over the encrypted channel.
- **Extension deployment** - users upload or select extensions, and the Cloud pushes signed DLLs to
  the engine.
- **Extension profiles** - adapters, strategies, indicators, hook plugins and neural-network models
  are activated and deactivated **per engine instance**; profiles live in the Cloud and are pushed
  on connection or reload.

### Razor Marketplace

A separate service, distinct from the Cloud, handling discovery and monetisation of extensions. It
shares the Cloud's user identity and communicates with it over secure internal APIs.

- **Catalogue** - free and paid listings, community-developed and Razor-curated, for adapters,
  strategies, indicators, hook plugins, neural-network models, or any combination.
- **Licensing** - respects the user's Cloud subscription and permissions; purchases attach to the
  user account.
- **Version management** - tracks extension versions, declares SDK compatibility, and supports
  updates.
- **Distribution** - when a user acquires an extension the Marketplace notifies the Cloud, which
  deploys it to the relevant engine instances.
- **Monetisation** - Razor Co. charges a transaction fee on each sale.

### `Sdk` (public SDK)

A public NuGet package containing **contracts only**: interfaces, abstract base classes, data models
and utilities sufficient to compile an extension. No runtime implementations, no broker logic, no
genetic-algorithm engine, no pipeline code. It is proprietary but freely redistributable, and may be
open-sourced later.

| Namespace | Contents |
|---|---|
| `Sdk.Hooks` | Hook registration interfaces (`IHookManifest`, `IHookRegistry`, `IFilterRegistration<T>`, `IActionRegistration<T>`), filter result types, and hook context interfaces for the backtest, live, optimisation and report pipelines. |
| `Sdk.Slots` | Capability interfaces for the three slot types: `IAdapterCapability`, `IStrategyCapability`, `INeuralNetworkModel`. |
| `Sdk.Shared` | Domain types (`Tick`, `Position`, `Order`, `TimeFrame`, `SymbolProperties`, and others), enums, exceptions, helpers and base classes (`Indicator`, `StrategyBase`). |

**Extension types and where they load from:**

| Extension type | Interface or base class | Directory |
|---|---|---|
| Adapter | `IAdapterCapability` | `Adapters/` |
| Strategy | `IStrategyCapability` or `StrategyBase` | `Strategies/` |
| Indicator | `Indicator` (abstract base) | `Indicators/` |
| Hook plugin | `IHookManifest` | `Plugins/` (any scanned directory) |
| Neural-network model | `INeuralNetworkModel` | `NeuralNetworks/` |

**Versioning.** Every extension assembly must declare its target SDK version with
`[assembly: SdkVersion("1.0.0")]`; the engine validates this before loading any assembly.
