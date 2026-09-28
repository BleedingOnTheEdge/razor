---
id: product:razor/blueprint/internal-architecture/solution-structure
parent: product:razor/blueprint/internal-architecture
title: Solution Structure
level: product
kind: blueprint
domains: [engine, cloud]
keywords:
  - solution structure
  - projects
  - dependency graph
  - repository layout
  - dependency injection
  - composition root
  - command flow
references:
  - product:razor/blueprint/product-model
  - product:razor/blueprint/engine-technical-blueprint
code_paths:
  - core/src/**
  - core/tests/**
---

# Solution Structure

The Razor solution is one repository containing the closed-source engine, the public SDK, the
shared runtime utilities, and the Cloud control plane. This document maps the projects, how they
depend on each other, and how the engine composes them into a running process.

## Projects

| Project | Role | Visibility | Notes |
|---|---|---|---|
| `Sdk` | Public contracts | Public (NuGet) | Hooks, slots, domain types, utilities. No runtime logic. |
| `Shared` | Shared runtime utilities | Private | Memory-mapped tick access, tick synthesis, portable RNG, binary file mapping. |
| `Kernel` | Core engine implementation | Private | Backtesting, brokers, optimisation, hooks, telemetry, specifications. |
| `Engine` | Headless executable | Private | Composition root: CLI, Cloud connection, security, tasks, extensions. |
| `Cloud` | SaaS control plane | Private | Web application for management, monitoring and reporting. |

The `Sdk` is the only project with a public NuGet surface; the rest ship as private, signed
assemblies.

## Dependency Graph

```
Sdk      (no dependencies beyond the .NET 10 BCL)
  ^
Shared   (references Sdk)
  ^
Kernel   (references Sdk, Shared)
  ^
Engine   (references Sdk, Shared, Kernel)

Cloud    (standalone web application; does not reference the engine graph)
```

Extensions (adapters, strategies, indicators, hook plugins, neural-network models) reference
**only** `Sdk`. The kernel never references an extension assembly directly; discovery happens by
reflection through an isolated `AssemblyLoadContext`.

`Cloud` is built as a web application (`Microsoft.NET.Sdk.Web`) with its own endpoint and
persistence stack, and is versioned with the solution rather than sharing the engine's project
references. Its scope is specified by
`product:razor/blueprint/internal-architecture/cloud-control-plane`.

## Repository Layout

```
razor/                          <- repository root
├── core/                       <- the .NET solution
│   ├── src/
│   │   ├── Sdk/                <- public contracts (Hooks/, Shared/, Slots/)
│   │   ├── Shared/             <- shared runtime utilities
│   │   ├── Kernel/             <- core engine implementation
│   │   ├── Engine/             <- headless executable
│   │   │   ├── Communication/  <- Cloud transport, handshake, command dispatch
│   │   │   ├── Core/           <- security, state, telemetry, recorder, self-update
│   │   │   ├── Extensions/     <- extension discovery and lifecycle
│   │   │   ├── Kernel/         <- kernel facade
│   │   │   ├── Management/     <- tasks, scheduling, command handlers
│   │   │   ├── Pluggability/   <- load contexts, activation, slot management
│   │   │   └── Services/       <- host services
│   │   └── Cloud/              <- control plane web application
│   ├── tests/
│   │   ├── Sdk.UnitTests/
│   │   ├── Sdk.IntegrationTests/
│   │   ├── Kernel.UnitTests/
│   │   ├── Engine.UnitTests/
│   │   ├── Engine.IntegrationTests/
│   │   └── Cloud.UnitTests/
│   ├── assets/                 <- test and sample data
│   ├── Razor.sln
│   ├── Directory.Build.props
│   ├── coverlet.runsettings
│   ├── .editorconfig
│   └── nuget.config
├── docs/
├── samples/
├── frontends/
├── mobile/
├── global.json                 <- pinned .NET SDK
└── .github/workflows/          <- CI
```

Every .NET command must run from `core/` so the solution, `Directory.Build.props` and the
pinned SDK apply.

## Engine Composition

`Engine` is the composition root. `Program.cs` parses the command line, registers services, then
resolves and runs the host. The components it hosts are specified one per document in
`product:razor/blueprint/engine-technical-blueprint`; this document records only how they are
wired.

Service registration uses `Microsoft.Extensions.DependencyInjection` and follows three
lifetimes:

- **Singleton** for the process-wide services that hold connection, security or persistence
  state (`SecurityManager`, `StateManager`, `CloudConnector`).
- **Scoped** for services whose lifetime follows a single task.
- **`Lazy<T>`** for services that must be resolved after construction, such as `ICloudConnector`
  inside `BehaviorRecorder`.

## Command Dispatch Path

A command arriving from the Cloud travels this path:

1. The Cloud sends a `Command` message.
2. `CloudConnector.ReceiveLoopAsync()` deserializes it and hands it to
   `ProcessReceivedMessageAsync()`.
3. The `CommandReceived` event fires.
4. `CommandDispatcher.OnCommandReceivedAsync()` calls `DispatchAsync()`.
5. `DispatchAsync()` looks up the handler registered for the `CommandId` and invokes
   `HandleAsync()`.
6. The handler performs the operation and replies with a `CommandResponse` through
   `SendResponseAsync()`.

The command registry itself is specified by
`product:razor/blueprint/engine-technical-blueprint/command-system`.
