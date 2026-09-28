---
id: product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management
parent: product:razor/blueprint/engine-technical-blueprint
title: Extension and Slot Management
level: product
kind: blueprint
domains: [extensions, engine]
flows: [extension-deployment]
keywords:
  - extension management
  - slots
  - discovery
  - activation
  - double validation
  - extensionmanifest
  - activateextensions
  - plugloadcontext
  - lifecycle
  - reload
  - strong naming
references:
  - product:razor/contracts/configuration-reference
  - product:razor/blueprint/product-model/extensibility-overview
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
code_paths:
  - core/src/Engine/Pluggability/**
  - core/src/Engine/Communication/**
---

# Extension and Slot Management

## Directory layout

All paths are relative to the engine executable, and none of these directories is configured by a
file:

```text
EngineRoot/
  Slots/
    Adapters/
    Strategies/
    Indicators/
    NeuralNetworks/
  Hooks/
  logs/
  state/            SQLite state database
  downloads/        received binary files
  backup/           self-update backups
  update/           staged updates
  behavior_logs/    compressed behaviour log files
```

## Discovery and activation: double validation

Only compatible, signed, Cloud-approved extensions are loaded. `ExtensionManager` and
`ExtensionCatalog` implement the flow:

1. **Discovery (engine).** On startup, or on `ReloadExtensions`, the engine scans every directory,
   loads each assembly through `PluginLoadContext`, validates the SDK version via `[SdkVersion]`, and
   builds a manifest.
2. **Manifest (engine to Cloud).** The engine sends the complete manifest as an `ExtensionManifest`
   event.
3. **Validation and selection (Cloud).** The Cloud validates signatures, compatibility and licence
   permissions, chooses the active set, and sends `ActivateExtensions`.
4. **Re-validation (engine).** The engine confirms every selected extension is present, loadable and
   internally consistent.
5. **Acknowledgment (engine to Cloud).** The engine returns the validated set, or an error.
6. **Finalisation (Cloud).** The Cloud acknowledges and the engine activates the set.

The double validation is the point: the Cloud decides what *should* run, and the engine independently
confirms what *can*.

## Lifecycle

- **Instantiation** - `Activator.CreateInstance`, or a cached compiled constructor for repeated loads.
- **Initialisation** - `ConnectAsync` for an adapter, `OnConfigureAsync` and `OnStartAsync` for a
  strategy, the neural network is attached where required, and plugins call `RegisterHooks`.
- **Activation order** - hooks are registered **before** the strategy starts.
- **Deactivation** - on `StopLive` or `ReloadExtensions` the engine disposes in reverse order.

## Safety and compatibility

- Double validation keeps the Cloud's view and the engine's reality consistent.
- `PluginValidator` checks the SDK version, and the major version must match.
- `PluginSafetyValidator` enforces strong naming in production.
- Loading is isolated per extension, so extensions can be reloaded without restarting the process.
- Failure rolls back: the previously active set stays loaded until the new set is fully validated.
