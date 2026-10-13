---
id: product:razor/blueprint/internal-architecture/extension-loading-versioning
parent: product:razor/blueprint/internal-architecture
title: Extension Loading & Versioning
level: product
kind: blueprint
domains: [extensions]
flows: [extension-deployment]
keywords:
  - extension loading
  - versioning
  - sdkversion
  - plugin load context
  - isolation
code_paths:
  - core/src/Kernel/**
  - core/src/Engine/Pluggability/**
---

# Extension Loading & Versioning

## Directory Structure

Extensions are placed in subdirectories alongside the engine:

| Directory | Purpose | Scanned For |
|-----------|---------|-------------|
| `Adapters/` | Broker connectivity | `IAdapterCapability` |
| `Strategies/` | Trading logic | `IStrategyCapability` |
| `Indicators/` | Technical analysis | `Indicator` subclasses |
| `Plugins/` | Hook‑based extensions | `IHookManifest` |
| `NeuralNetworks/` | Neural network models | `INeuralNetworkModel` |

A single DLL can implement any combination. The engine scans all directories.

## Version Attributes

- `[assembly: SdkVersion("1.0.0")]` – declares the targeted SDK version. The engine checks this before loading any assembly.

## Loading Process

1. Scan all extension directories for `.dll` files.
2. For each assembly, load in a new `PluginLoadContext` (unloadable later).
3. The `PluginLoadContext` ensures `Sdk` is loaded from the default context (type sharing), while all other dependencies are resolved from the extension's directory.
4. Call `PluginValidator.ValidateAssembly()` to check the SDK version. Reject if the major version differs.
5. Call `PluginSafetyValidator.Validate()` to check strong‑naming in production.
6. Discover types implementing `IHookManifest`, `IAdapterCapability`, `IStrategyCapability`, `INeuralNetworkModel`, or `Indicator`.
7. Register discovered items in the engine's manifest.
8. Send the manifest to Razor Cloud.
9. Cloud responds with the active set (selected by the user from their profile).
10. Activate the selected adapter, strategy, indicators, NN model, and hook plugins.

**Isolation:** Each extension context resolves dependencies independently, avoiding version conflicts. Assemblies must be strongly signed in production; unsigned plugins are rejected.

---
