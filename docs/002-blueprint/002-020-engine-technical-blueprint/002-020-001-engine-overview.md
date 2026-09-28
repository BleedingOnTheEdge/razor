---
id: product:razor/blueprint/engine-technical-blueprint/engine-overview
parent: product:razor/blueprint/engine-technical-blueprint
title: Engine Overview
level: product
kind: blueprint
domains: [engine]
keywords:
  - engine overview
  - core principles
  - headless
  - stateless
  - always online
  - live first
  - infinite resiliency
references:
  - product:razor/cross-cutting/principles
  - product:razor/blueprint/product-model/product-overview
code_paths:
  - core/src/Engine/**
---

# Engine Overview

The Razor Engine is the headless execution node that runs on the user's infrastructure. It is the
**sole execution point** for all trading, backtesting, optimisation and data-streaming work, and it
communicates exclusively with the Cloud over a persistent, encrypted WebSocket.

## What the engine is

- **Always online.** It maintains its Cloud connection at all times. If the connection drops it
  retries indefinitely with exponential backoff, and never exits on its own.
- **Fully controllable.** The Cloud drives every aspect of its operation through granular commands -
  the full surface is in `product:razor/blueprint/product-model/appendix-a-supported-commands`.
- **Secure.** Three-factor authentication (username, password, instance API key), end-to-end
  encryption, and anti-tampering.
- **Performant.** Resource-aware task scheduling with strict live-first priority.
- **Headless and minimal.** The user interacts only through the Cloud dashboard. There is no
  configuration file, and the CLI exists solely for authentication and critical alerts.
- **Stateless and subordinate.** All configuration, scheduling, reporting and decision-making live in
  the Cloud. The engine executes, streams raw data, and forgets.

## How the product principles land in the engine

The authoritative statements are the cross-cutting principles in
`product:razor/cross-cutting/principles`. In the engine they are realised as follows, and these
realisations are what the rest of this blueprint specifies:

| Principle | How the engine satisfies it |
|---|---|
| Cloud-first | The engine is a thin client. It holds no persistent state beyond the current session's needs; configuration arrives with each command. |
| Security and anti-tampering | Binary obfuscation, signing and integrity checks; encrypted transport; credentials never written to disk. See `security-and-anti-tampering`. |
| Determinism | All backtest and optimisation work is deterministic, with seeds managed consistently by the Kernel. See `product:razor/blueprint/internal-architecture`. |
| Live-first | Live trading always has priority, and resources are reserved to keep it uninterrupted. See `concurrency-and-task-management`. |
| Infinite resiliency | Losing the Cloud does not stop live tasks or shut the engine down; it queues outgoing data and waits. See `offline-handling-and-retry`. |
| Extensibility | Extensions load into isolated contexts and can be reloaded without restarting the process. See `extension-and-slot-management`. |
| Observability | Logging and telemetry are exposed in standard formats for external monitoring. See `logging-and-telemetry`. |
| Performance | Every feature is built to minimal overhead: sparse batched recording, allocation-free hot paths. See `performance`. |
