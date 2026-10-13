---
id: product:razor/operational/installation-and-deployment/extension-management
parent: product:razor/operational/installation-and-deployment
title: Extension Management
level: product
kind: operational
domains: [extensions, operations]
flows: [extension-deployment]
keywords:
  - extension management
  - extension directories
  - adapters folder
  - strategies folder
  - plugins folder
  - neural networks folder
  - hot reload
  - activation
references:
  - product:razor/contracts/extension-developer-guide/deployment
  - product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management
---

# Extension Management

Extensions are placed in subdirectories alongside the engine executable, and the Cloud decides which
of them are active. The directory-to-extension-type mapping and the discovery, validation and
activation contract are owned by `product:razor/contracts/extension-developer-guide/deployment` and
`product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management`. This document
covers the operator-facing placement mechanics and reload behaviour.

A single DLL can be placed in any of those directories - the engine scans all of them - but each
extension type conventionally has its own directory.

## Single‑File vs Multi‑File Extensions

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

## Hot‑Reloading Extensions

When the Cloud sends a `ReloadExtensions` command:

1. The engine completes the current task (backtest/live/optimization) naturally.
2. It unloads all extension assembly contexts.
3. It rescans all directories and sends a new manifest to the Cloud.
4. The Cloud responds with the new active set.
5. The engine activates the new extensions and is ready for new commands.

The engine process never stops—only the task pipeline pauses briefly.

---
