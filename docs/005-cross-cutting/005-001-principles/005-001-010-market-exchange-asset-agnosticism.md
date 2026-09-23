---
id: product:razor/cross-cutting/principles/market-exchange-asset-agnosticism
parent: product:razor/cross-cutting/principles
title: 1. Market / Exchange / Asset Agnosticism
level: product
kind: cross-cutting
---

# 1. Market / Exchange / Asset Agnosticism
**Razor must work with definitions, never with hard‑coded special cases.**

- Razor itself must have **zero knowledge** of the underlying market type (Forex, Crypto, Futures, CFD, etc.).
- All exchange‑specific behaviour – order types, funding mechanisms, tick sizes, contract sizes, margin modes, PnL formulas, naming conventions – is delegated to **adapters** through clean interfaces (`IAdapterCapability`, `IMarketCalculator`, etc.).
- Adapters are the sole authoritative source of market logic. The core engine never performs an `if (assetClass == …)` check.
- New markets are added exclusively by creating a new adapter; no engine changes are permitted.

---
