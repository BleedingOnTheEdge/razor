---
id: product:razor/operational/installation-and-deployment/extension-management
parent: product:razor/operational/installation-and-deployment
title: 8. Extension Management
level: product
kind: operational
---

# 8. Extension Management

## 8.1 Directory Structure

Extensions are placed in subdirectories alongside the engine executable:

| Directory | Purpose | Implements |
|-----------|---------|------------|
| `Adapters/` | Broker/exchange connectivity | `IAdapterCapability` |
| `Strategies/` | Trading logic | `IStrategyCapability` |
| `Indicators/` | Technical analysis computations | `Indicator` (abstract base) |
| `Plugins/` | Hook‑based extensions | `IHookManifest` |
| `NeuralNetworks/` | Neural network models | `INeuralNetworkModel` |

A single DLL can be placed in any directory—the engine scans all of them. However, for organisational clarity, each extension type has its own directory.

## 8.2 Single‑File vs Multi‑File Extensions

**Single‑file extensions:** Place the `.dll` directly in the appropriate directory.
```
Adapters/
├── BinanceAdapter.dll
└── NobitexAdapter.dll
```

**Multi‑file extensions:** Create a subfolder with the extension's name, containing all required DLLs. The engine scans for the DLL matching the folder name.
```
Adapters/
└── NobitexAdapter/
    ├── NobitexAdapter.dll      ← scanned
    └── NobitexApiClient.dll    ← loaded as dependency
```

## 8.3 Discovery and Activation

1. On startup, the engine scans all extension directories.
2. It builds a manifest of discovered adapters, strategies, indicators, hook plugins, and NN models.
3. The manifest is sent to Razor Cloud.
4. The user selects active items from their Cloud profile.
5. The Cloud sends the active set back to the engine.
6. The engine activates the selected adapter, strategy, indicators, and plugins. Inactive items are not loaded.

## 8.4 Hot‑Reloading Extensions

When the Cloud sends a `ReloadExtensions` command:

1. The engine completes the current task (backtest/live/optimization) naturally.
2. It unloads all extension assembly contexts.
3. It rescans all directories and sends a new manifest to the Cloud.
4. The Cloud responds with the new active set.
5. The engine activates the new extensions and is ready for new commands.

The engine process never stops—only the task pipeline pauses briefly.

---
