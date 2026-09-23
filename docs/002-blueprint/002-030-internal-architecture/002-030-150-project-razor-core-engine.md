---
id: product:razor/blueprint/internal-architecture/project-razor-core-engine
parent: product:razor/blueprint/internal-architecture
title: 16. Project: Razor.Core.Engine
level: product
kind: blueprint
---

# 16. Project: Razor.Core.Engine

## 16.1 Architecture Overview

The `Razor.Core.Engine` project is the headless executable that hosts the kernel and communicates with Razor Cloud. Its key components are:

- **Program.cs** – Entry point, CLI parsing, service registration, shutdown handling.
- **CloudConnector** – WebSocket connection, authentication, heartbeat, command dispatch, binary transfers.
- **SecurityManager** – ECDH key exchange, AES‑256‑GCM encryption, integrity checks.
- **StateManager** – SQLite persistence for engine ID, live state, optimisation state, cron jobs, schedules, queued messages.
- **ExtensionManager** – Discovery, activation, isolation, hot‑reload.
- **TaskManager** – Task scheduling with live‑first priority.
- **CronJobManager** – Cron and one‑off schedule execution.
- **KernelService** – Facade bridging engine commands to kernel operations.
- **BehaviorRecorder** – Sparse behavior logging with MessagePack + GZip.
- **SelfUpdateManager** – Download, checksum, staging, and rollback.

## 16.2 Dependency Injection

All services are registered in `BuildServiceProvider()` using `Microsoft.Extensions.DependencyInjection`. Key registrations include:

- `Singleton` for stateless services (SecurityManager, StateManager, CloudConnector, etc.)
- `Scoped` for task‑specific services
- `Lazy<T>` for dependencies that must be resolved after construction (e.g., ICloudConnector in BehaviorRecorder)

## 16.3 Command Flow

1. Cloud sends a `Command` message.
2. `CloudConnector.ReceiveLoopAsync()` deserializes and dispatches to `ProcessReceivedMessageAsync()`.
3. `CommandReceived` event fires.
4. `CommandDispatcher.OnCommandReceivedAsync()` calls `DispatchAsync()`.
5. `DispatchAsync()` looks up the handler by `CommandId` and invokes `HandleAsync()`.
6. Handler executes the operation and sends a `CommandResponse` via `SendResponseAsync()`.

---
