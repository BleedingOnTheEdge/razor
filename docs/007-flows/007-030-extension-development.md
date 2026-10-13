---
id: product:razor/flows/extension-development
parent: product:razor/flows
title: Extension Development
level: product
kind: contract
domains: [data, engine, extensions, sdk]
flows: [extension-development]
keywords:
  - extension development
  - build an extension
  - adapter development
  - hook plugin development
  - sdk package
  - extension skeleton
  - local testing
references:
  - product:razor/contracts/extension-developer-guide/introduction
  - product:razor/contracts/extension-developer-guide/extension-concepts
  - product:razor/contracts/extension-developer-guide/project-setup
  - product:razor/contracts/extension-developer-guide/developing-an-adapter
  - product:razor/contracts/extension-developer-guide/developing-an-adapter/adapter-capabilities-and-connection
  - product:razor/contracts/extension-developer-guide/developing-an-adapter/data-providers
  - product:razor/contracts/extension-developer-guide/developing-an-adapter/execution-and-market-calculator
  - product:razor/contracts/extension-developer-guide/developing-an-adapter/example-adapter-skeleton
  - product:razor/contracts/extension-developer-guide/developing-a-strategy
  - product:razor/contracts/extension-developer-guide/developing-a-hook-plugin
  - product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/safe-fire-and-forget-async-patterns
  - product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/hook-plugin-examples
  - product:razor/contracts/extension-developer-guide/developing-a-neural-network-model
  - product:razor/contracts/extension-developer-guide/best-practices
  - product:razor/contracts/configuration-reference/slot-capability-interfaces
  - product:razor/contracts/configuration-reference/hook-system
  - product:razor/contracts/configuration-reference/market-data-types
  - product:razor/blueprint/internal-architecture/hook-system-architecture
  - product:razor/blueprint/product-model/extensibility-overview
  - product:razor/blueprint/product-model/deployment-distribution
  - product:razor/blueprint/product-model/user-workflows
implements: [extension-development]
---

# Extension Development

## Purpose

Turn an idea into a signed .NET DLL that speaks one or more public `Sdk` contracts, then prove it on a
locally running engine before it is deployed. Development is local; everything the engine does with the
result is the `extension-deployment` flow.

## Participants

| Component | Role in this flow |
|---|---|
| Developer | Writes, compiles and locally tests the extension. |
| Cloud | Issues the developer account, licence and profile that make activation possible later. |
| Engine | Discovers the DLL during local testing and reports it in a manifest. |
| `Sdk` package | Supplies the contracts the extension compiles against. |

## Steps

| # | Step | Owner | Specified by |
|---|---|---|---|
| 1 | Register a free developer account on the Cloud, download the engine binary, and install the `Sdk` NuGet package. | Developer | `product:razor/blueprint/product-model/user-workflows`, `product:razor/blueprint/product-model/deployment-distribution` |
| 2 | Create the class library, reference the `Sdk` package, and declare `[assembly: SdkVersion("1.0.0")]`. | Developer | `product:razor/contracts/extension-developer-guide/project-setup` |
| 3 | Choose the extension type: adapter, strategy, indicator, hook plugin or neural-network model. A single DLL may combine several. | Developer | `product:razor/contracts/extension-developer-guide/introduction` |
| 4 | Learn the shape: slots, indicators and hooks. | Developer | `product:razor/contracts/extension-developer-guide/extension-concepts`, `product:razor/blueprint/product-model/extensibility-overview` |
| 5 | Implement the chosen contract - `IAdapterCapability` for an adapter, `IStrategyCapability` or `StrategyBase` for a strategy, `Indicator` for an indicator, `IHookManifest` for a hook plugin, `INeuralNetworkModel` for a model. | Developer | `product:razor/contracts/configuration-reference/slot-capability-interfaces`, `product:razor/contracts/extension-developer-guide/developing-an-adapter`, `product:razor/contracts/extension-developer-guide/developing-a-strategy`, `product:razor/contracts/extension-developer-guide/developing-a-hook-plugin`, `product:razor/contracts/extension-developer-guide/developing-a-neural-network-model` |
| 6 | Honour the contracts' discipline: deterministic randomness, no wall-clock time in trading logic, thread-safe adapters, allocation-free hot paths, and synchronous hook callbacks. | Developer | `product:razor/contracts/extension-developer-guide/best-practices`, `product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/safe-fire-and-forget-async-patterns` |
| 7 | Test locally: place the DLL in the matching engine directory, restart the engine, run with the development licence, and use backtests and mock live mode. | Developer | `product:razor/contracts/extension-developer-guide/deployment` |
| 8 | Iterate until the extension behaves; the developer workflow repeats steps 5-7. | Developer | `product:razor/blueprint/product-model/user-workflows` |
| 9 | Hand the DLL to the deployment path - upload to the Cloud, or place it for engine discovery. | Developer, then Cloud | `product:razor/blueprint/product-model/user-workflows` |

## Persisted and Reported

- Development is local: the DLL and its build outputs live on the developer's machine, and the engine
  reports what it discovered through its manifest once it scans the directory
  (`product:razor/contracts/extension-developer-guide/deployment`,
  `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management`).
- The development licence limits capabilities but keeps backtesting, optimisation and reporting fully
  functional (`product:razor/blueprint/product-model/licensing-subscriptions`).
- Nothing about the extension is stored server-side until it is uploaded or selected in a profile
  (`product:razor/blueprint/internal-architecture/cloud-control-plane`).

## Failure Modes

| Failure | What happens | Specified by |
|---|---|---|
| The extension targets a different SDK major version | The engine validates `[SdkVersion]` before loading and rejects it unless a compatibility mode is configured. | `product:razor/contracts/extension-developer-guide/compatibility` |
| The extension uses `System.Random` or `DateTime.UtcNow` in trading logic | Determinism breaks; the engine prohibits wall-clock time in trading logic and CI enforces it. | `product:razor/contracts/extension-developer-guide/best-practices` |
| A hook callback is declared `async void` | An exception in it can crash the process; callbacks must be synchronous. | `product:razor/contracts/configuration-reference/hook-system` |
| The adapter is called concurrently | Adapter implementations must be thread-safe, because tick events, sync and command execution can arrive together. | `product:razor/contracts/extension-developer-guide/best-practices` |
| The DLL depends on a version that clashes with the engine | Each extension resolves its dependencies in its own isolated context, so clashes surface as load failures rather than silent misbehaviour. | `product:razor/blueprint/internal-architecture/extension-loading-versioning` |
| An indicator or model never appears in the manifest | The engine is not scanning the expected directory; the directory contract names where each type must live. | `product:razor/contracts/extension-developer-guide/deployment` |

## Domain References

- `extensions`, `sdk`: `product:razor/contracts/extension-developer-guide/introduction`,
  `product:razor/contracts/configuration-reference/slot-capability-interfaces`,
  `product:razor/contracts/configuration-reference/hook-system`.
- `data`: `product:razor/contracts/configuration-reference/market-data-types` - adapters return the
  instrument properties and tick data the engine consumes.
- `engine`: `product:razor/blueprint/internal-architecture/hook-system-architecture`,
  `product:razor/blueprint/product-model/deployment-distribution`.

## Change Entry Point

Start here for anything that changes how an extension is written, compiled or locally tested. Deploying
and activating it is the `extension-deployment` flow; a strategy specifically is also the
`strategy-development` flow.
