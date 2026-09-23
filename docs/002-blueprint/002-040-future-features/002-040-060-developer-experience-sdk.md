---
id: product:razor/blueprint/future-features/developer-experience-sdk
parent: product:razor/blueprint/future-features
title: Developer Experience & SDK
level: product
kind: blueprint
---

# Developer Experience & SDK

- **Jupyter Notebook Integration** – Python bridge to query `Kernel` backtests directly from Pandas.
- **F# / Python Bindings** – Enable strategy development in other languages via interop or embedded scripting.
- **Mock Exchange Adapter** – Highly realistic local matching engine that simulates network latency and order book queues. Built as a sample `IAdapterCapability` implementation.
- **Indicator Composition DSL** – Write `Indicators.Get("RSI(SMA(14),14)")` using a string‑based domain language.
- **Replay Mode GUI** – Lightweight Avalonia/WPF tool to step through completed backtests bar‑by‑bar visually.
- **State Serialization (Live)** – Dump `LiveBroker` state to disk on shutdown, hydrate on startup for crash recovery without re‑fetching from exchange.
- **Hook Debugging Tools** – Log hook execution chains, measure hook callback duration, detect hook conflicts at the same priority level.
- **Extension Validation Tool** – CLI tool that validates an extension DLL before upload: SDK version, interface implementation completeness, hook registration validity.

---
