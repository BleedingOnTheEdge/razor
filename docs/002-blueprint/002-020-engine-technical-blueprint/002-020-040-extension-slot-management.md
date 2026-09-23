---
id: product:razor/blueprint/engine-technical-blueprint/extension-slot-management
parent: product:razor/blueprint/engine-technical-blueprint
title: 5. Extension & Slot Management
level: product
kind: blueprint
---

# 5. Extension & Slot Management

## 5.1 Directory Structure

```
EngineRoot/
├── Slots/
│   ├── Adapters/
│   ├── Strategies/
│   ├── Indicators/
│   └── NeuralNetworks/
├── Hooks/
├── logs/
├── state/                 (SQLite state database)
├── downloads/             (received binary files)
├── backup/                (self‑update backups)
├── update/                (staged updates)
└── behavior_logs/         (compressed behaviour log files)
```

All paths are relative to the Engine executable. No configuration files exist in these directories.

## 5.2 Discovery & Activation Flow (Double Validation)

The activation flow guarantees that only compatible, signed, and Cloud‑approved extensions are loaded. This is implemented in `ExtensionManager` and `ExtensionCatalog`.

1. **Discovery (Engine):** On startup (or `ReloadExtensions`), Engine scans all directories, loads each assembly via `PluginLoadContext`, validates SDK version (`[SdkVersion]`), and builds a manifest.
2. **Manifest Send (Engine → Cloud):** Engine sends the complete manifest to Cloud via `ExtensionManifest` event.
3. **Cloud Validation & Selection:** Cloud validates signatures, compatibility, and license permissions. It selects the active set and sends `ActivateExtensions` command.
4. **Engine Re‑validation:** Engine re‑validates that all selected extensions are present, loadable, and internally consistent.
5. **Engine → Cloud `ActiveExtensionsAck`:** Engine sends back the validated set (or an error).
6. **Cloud Finalises:** Cloud acknowledges and the Engine activates the extensions.

## 5.3 Extension Lifecycle

- **Instantiation:** `Activator.CreateInstance` (or cached compiled lambda via `_ctorCache`).
- **Initialisation:** Calls `ConnectAsync` (adapter), `OnConfigureAsync`/`OnStartAsync` (strategy), sets `NeuralNetwork` if required, and `RegisterHooks` (plugins).
- **Activation Order:** Hooks registered **before** strategy starts.
- **Deactivation:** On `StopLive` or `ReloadExtensions`, Engine disposes in reverse order.

## 5.4 Safety & Compatibility

- Double validation ensures consistency.
- `PluginValidator` checks SDK version (major must match).
- `PluginSafetyValidator` checks strong‑naming in production.
- Rollback on failure (the previous active set remains loaded until the new set is fully validated).

---
