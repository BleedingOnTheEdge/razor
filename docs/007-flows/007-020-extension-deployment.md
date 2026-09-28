---
id: product:razor/flows/extension-deployment
parent: product:razor/flows
title: Extension Deployment
level: product
kind: contract
domains: [cloud, engine, extensions, operations, sdk, security]
flows: [extension-deployment]
keywords:
  - extension deployment
  - deploy extension
  - activate extensions
  - double validation
  - extension manifest
  - hot reload
  - reload extensions
  - deploy extension dll
references:
  - product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
  - product:razor/blueprint/internal-architecture/extension-loading-versioning
  - product:razor/blueprint/internal-architecture/cloud-control-plane
  - product:razor/blueprint/product-model/user-workflows
  - product:razor/contracts/extension-developer-guide/project-setup
  - product:razor/contracts/extension-developer-guide/deployment
  - product:razor/contracts/extension-developer-guide/compatibility
  - product:razor/cross-cutting/principles/extension-versioning-compatibility
  - product:razor/operational/installation-and-deployment/extension-management
  - product:razor/operational/installation-and-deployment/logs-and-troubleshooting
  - product:razor/operational/installation-and-deployment/system-requirements
implements: [extension-deployment]
---

# Extension Deployment

## Purpose

Get an extension DLL from where it was built onto a running engine, and make exactly the Cloud-selected
set active. Two independent gates must agree: the Cloud decides what *should* run, and the engine
confirms what *can*.

## Participants

| Component | Role in this flow |
|---|---|
| Cloud | Validates signatures, compatibility and licence permissions, selects the active set, and pushes it. |
| Engine | Scans, loads in isolation, validates, activates, and can reload without restarting. |
| Extension author | Produces a signed DLL that declares its target SDK version. |
| Operator | Places DLLs for local testing and watches the load appear in the logs. |

## Steps

| # | Step | Owner | Specified by |
|---|---|---|---|
| 1 | The author builds the extension against the `Sdk` package and declares `[assembly: SdkVersion("1.0.0")]`. | Extension author | `product:razor/contracts/extension-developer-guide/project-setup`, `product:razor/cross-cutting/principles/extension-versioning-compatibility` |
| 2 | The DLL is placed where an engine can see it - uploaded through the Cloud interface for managed deployment, or dropped into the matching directory of a locally running engine for testing. | Cloud, or operator | `product:razor/blueprint/product-model/user-workflows`, `product:razor/contracts/extension-developer-guide/deployment`, `product:razor/operational/installation-and-deployment/extension-management` |
| 3 | Discovery: on startup, on `DeployExtension`, or on `ReloadExtensions`, the engine scans every extension directory, loads each assembly through an isolated load context, and validates the SDK version. | Engine | `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management`, `product:razor/blueprint/internal-architecture/extension-loading-versioning` |
| 4 | The engine builds a manifest of everything it discovered and sends it to the Cloud as an `ExtensionManifest` event. | Engine | `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management` |
| 5 | The Cloud validates signatures, compatibility and licence permissions, chooses the active set, and sends `ActivateExtensions` (extensions band 1400-1404). | Cloud | `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management`, `product:razor/blueprint/internal-architecture/cloud-control-plane` |
| 6 | The engine re-validates that every selected extension is present, loadable and internally consistent, and acknowledges with the validated set or an error. | Engine | `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management` |
| 7 | The Cloud acknowledges; the engine activates the set and runs the lifecycle: instantiate, initialise (adapter `ConnectAsync`; strategy `OnConfigureAsync` and `OnStartAsync`; plugins `RegisterHooks`), with hooks registered before the strategy starts. | Engine | `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management` |
| 8 | Hot reload: on `ReloadExtensions` the engine lets the current task finish, unloads the extension contexts, rescans, sends a new manifest, takes the new active set, and activates it. The process never stops. | Engine | `product:razor/operational/installation-and-deployment/extension-management` |
| 9 | Deactivation: on `StopLive` or `ReloadExtensions`, extensions are disposed in reverse activation order. | Engine | `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management` |

## Persisted and Reported

- The engine persists the extension manifest in SQLite; the Cloud keeps the per-instance profiles that
  decide the active set (`product:razor/blueprint/engine-technical-blueprint/state-persistence`,
  `product:razor/blueprint/internal-architecture/cloud-control-plane`).
- The load is visible in the startup log and in the Cloud as the instance's active adapter, strategy,
  indicators, plugins and model (`product:razor/operational/installation-and-deployment/verifying-the-installation`).
- The full directory layout and the engine's filesystem footprint are specified once, in
  `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management`.

## Failure Modes

| Failure | What happens | Specified by |
|---|---|---|
| Unsigned extension in production | The safety validator rejects it; it is never activated. | `product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering`, `product:razor/blueprint/internal-architecture/extension-loading-versioning` |
| SDK major version mismatch | The assembly is rejected unless an explicit compatibility mode is configured; a mismatched version is a documented troubleshooting case. | `product:razor/contracts/extension-developer-guide/compatibility`, `product:razor/operational/installation-and-deployment/logs-and-troubleshooting` |
| Missing `SdkVersion` attribute | The extension is not loaded; the operator checks assembly attributes. | `product:razor/operational/installation-and-deployment/logs-and-troubleshooting` |
| The new set fails re-validation | Loading rolls back: the previously active set stays loaded until the new set is fully validated. | `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management` |
| A multi-file extension is placed flat | Only the DLL matching the folder name is scanned, so the extension will not resolve its dependencies. | `product:razor/operational/installation-and-deployment/extension-management` |
| A Windows-only adapter (for example MetaTrader 5) is deployed to Linux | The adapter cannot run; the engine must be deployed on Windows. | `product:razor/contracts/extension-developer-guide/compatibility`, `product:razor/operational/installation-and-deployment/system-requirements` |

## Domain References

- `extensions`, `engine`: `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management`,
  `product:razor/blueprint/internal-architecture/extension-loading-versioning`.
- `sdk`: `product:razor/contracts/extension-developer-guide/project-setup`.
- `cloud`: `product:razor/blueprint/internal-architecture/cloud-control-plane`.
- `security`: `product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering`.
- `operations`: `product:razor/operational/installation-and-deployment/extension-management`.

## Change Entry Point

Start here for anything that changes how an extension is discovered, validated, activated, reloaded or
rolled back. Building the extension is the separate `extension-development` flow.
