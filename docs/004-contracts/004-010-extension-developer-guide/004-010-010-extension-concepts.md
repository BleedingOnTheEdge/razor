---
id: product:razor/contracts/extension-developer-guide/extension-concepts
parent: product:razor/contracts/extension-developer-guide
title: 2. Extension Concepts
level: product
kind: contract
---

# 2. Extension Concepts

## 2.1 Architecture Overview

Razor extensions are organized into three concepts:

| Concept | What It Does | Directory |
|---------|-------------|-----------|
| **Slots** | Required capabilities (Adapter, Strategy, NN Model) | `Adapters/`, `Strategies/`, `NeuralNetworks/` |
| **Indicators** | Technical analysis computations | `Indicators/` |
| **Hooks** | Intercept and observe engine events | `Plugins/` (any scanned directory) |

**Slots** provide core functionality the engine needs to operate. The Cloud activates exactly one Adapter and one Strategy per engine instance, and optionally one NN Model if the strategy requires it.

**Hooks** are the primary extensibility mechanism. A hook plugin implements `IHookManifest` and registers callbacks on named hook points with priorities. Hook plugins are always active once loaded—they run whenever their registered hooks fire.

## 2.2 The Razor SDK

The SDK is the `Razor.Core.Sdk` NuGet package. It contains **only** contracts (interfaces, abstract classes, records, enums, and utilities) – no runtime logic, no GA engine, no broker implementations. You can freely redistribute the package.

The SDK includes helper types like `CustomizedRandom` (portable RNG), `TickWindow`, `TickSynthesizer`, and `GeneInjector`. These are helpers for your extension code; you are free to use them or implement your own. However, any randomness that affects trading decisions must derive from the master seed (see §8.4).

---
