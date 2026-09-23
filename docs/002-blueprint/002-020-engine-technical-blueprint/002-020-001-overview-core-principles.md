---
id: product:razor/blueprint/engine-technical-blueprint/overview-core-principles
parent: product:razor/blueprint/engine-technical-blueprint
title: 1. Overview & Core Principles
level: product
kind: blueprint
---

# 1. Overview & Core Principles

The Razor Engine is the headless execution node that runs on the user's infrastructure. It is the **sole execution point** for all trading, backtesting, optimisation, and data‑streaming tasks. It communicates exclusively with Razor Cloud via a persistent, encrypted WebSocket connection.

The Engine is designed to be:

- **Always‑online** – maintains connection to Cloud at all times. If the connection drops, it retries indefinitely (with exponential backoff) and never exits on its own.
- **Fully controllable** – Cloud sends granular commands to manage every aspect of the Engine's operation (60+ commands, all implemented in `Razor.Core.Engine`).
- **Secure** – three‑factor authentication (username, password, instance API key), end‑to‑end encryption, anti‑tampering.
- **Performant** – resource‑aware task scheduling with strict live‑first prioritisation.
- **Headless & Simple** – user interacts only via Cloud dashboard; no configuration files; minimal CLI solely for authentication and critical alerts.
- **Stateless & Dumb** – all configuration, scheduling, reporting, and decision‑making live in Cloud. The Engine executes, streams raw data, and forgets.

**Core Principles (re‑stated for clarity):**

1. **Cloud‑First** – the Engine is a thin client; all logic, configuration, scheduling, and reporting are driven by Cloud. The Engine holds no persistent state beyond what is necessary for the current session.
2. **Security & Anti‑Tampering** – binary obfuscation, signing, integrity checks; encrypted communications; credentials never stored on disk.
3. **Determinism** – all backtest and optimisation tasks are deterministic; seeds are managed consistently by the Kernel.
4. **Live‑First** – live trading always has priority; resources are reserved to guarantee uninterrupted operation.
5. **Infinite Resiliency** – if Cloud connectivity is lost, the Engine retries forever and stays alive. It does not stop live tasks or shut down; it simply queues outgoing data and waits for reconnection.
6. **Extensibility** – all extension types loaded via isolated `AssemblyLoadContext`s; can be reloaded without restarting.
7. **Observability** – full logging and telemetry exposed in standard formats for integration with external monitoring tools.
8. **Performance** – every feature is designed with minimal overhead; data recording is sparse and batched; hot paths are allocation‑free where possible.

---
