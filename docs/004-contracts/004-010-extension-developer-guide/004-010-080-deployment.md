---
id: product:razor/contracts/extension-developer-guide/deployment
parent: product:razor/contracts/extension-developer-guide
title: 9. Deployment
level: product
kind: contract
---

# 9. Deployment

## 9.1 Directory Placement

Place your compiled DLL in the appropriate directory:

| Extension Type | Directory |
|----------------|-----------|
| Adapter | `Adapters/` |
| Strategy | `Strategies/` |
| Indicator | `Indicators/` |
| Hook Plugin | `Plugins/` (or any directory—all are scanned) |
| NN Model | `NeuralNetworks/` |

## 9.2 Activation

1. The engine scans all directories on startup.
2. Discovered extensions are sent to Razor Cloud as a manifest.
3. The user selects active items from their Cloud profile.
4. The Cloud sends the active set to the engine.
5. Only active items are loaded and initialized.

## 9.3 Local Testing

During development, place your DLL in the appropriate directory of a locally running Razor Engine. The engine scans on startup, so restart after adding or updating DLLs. With a free development license, you can test adapters with a mock execution mode.

---
