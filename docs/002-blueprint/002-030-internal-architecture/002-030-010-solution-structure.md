---
id: product:razor/blueprint/internal-architecture/solution-structure
parent: product:razor/blueprint/internal-architecture
title: 2. Solution Structure
level: product
kind: blueprint
---

# 2. Solution Structure

## 2.1 Projects

The repository `Razor/` contains the following **source projects**:

| Project | Role | Visibility | Notes |
|---------|------|------------|-------|
| `Razor.Core.Sdk` | Public SDK contracts | Public (NuGet) | Hooks, slots, domain types, utilities. No runtime logic. |
| `Razor.Core.Shared` | Shared utilities (file I/O, memory mapping) | Private (closed‑source) | Memory‑mapped tick access, binary file mapping. |
| `Razor.Core.Kernel` | Core engine implementation | Private (closed‑source) | Backtesting, brokers, optimisation, telemetry, hook invoker. References `Razor.Core.Sdk` and `Razor.Core.Shared`. |
| `Razor.Core.Engine` | User‑facing executable | Private (closed‑source) | Bootstraps the engine, connects to Cloud, manages extension lifecycle. References all core projects. |
| `Razor.Cloud` | SaaS control plane | Private (closed‑source) | Web application for management, monitoring, reporting (future). |

## 2.2 Dependency Graph

```
Razor.Core.Sdk  (no dependencies beyond .NET 10 BCL)
       ↑
Razor.Core.Shared  (references Razor.Core.Sdk)
       ↑
Razor.Core.Kernel  (references Razor.Core.Sdk, Razor.Core.Shared)
       ↑
Razor.Core.Engine  (references all core projects)
```

Extensions (adapters, strategies, indicators, hook plugins, NN models) reference **only** `Razor.Core.Sdk`. The kernel never references extension assemblies directly; discovery is via reflection through isolated `AssemblyLoadContext`.

## 2.3 Repository Layout

```
Razor/
├── src/
│   ├── Razor.Core.Sdk/           ← Public contracts
│   │   ├── Hooks/                  ← Hook registration interfaces and context types
│   │   ├── Shared/                 ← Domain types, enums, exceptions, helpers
│   │   └── Slots/                  ← Capability interfaces (IAdapterCapability, IStrategyCapability, INeuralNetworkModel)
│   ├── Razor.Core.Shared/        ← Shared utilities
│   ├── Razor.Core.Kernel/        ← Core engine
│   └── Razor.Core.Engine/        ← Headless executable
├── tests/
│   ├── Razor.Core.Sdk.UnitTests/
│   ├── Razor.Core.Sdk.IntegrationTests/
│   ├── Razor.Core.Kernel.UnitTests/
│   ├── Razor.Core.Kernel.IntegrationTests/
│   └── Razor.Determinism.Tests/
├── docs/
├── Razor.Core.sln
├── Directory.Build.props
├── global.json
└── .editorconfig
```

---
