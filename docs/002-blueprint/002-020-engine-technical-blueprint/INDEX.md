---
id: product:razor/blueprint/engine-technical-blueprint
title: Engine Technical Blueprint
level: product
kind: blueprint
domains: [engine, cloud]
keywords:
  - engine blueprint
  - engine specification
  - headless engine
  - execution node
references:
  - product:razor/blueprint/internal-architecture
  - product:razor/blueprint/product-model
  - product:razor/contracts/configuration-reference
code_paths:
  - core/src/Engine/**
---

# Engine Technical Blueprint

The complete specification of the Razor Engine: how it starts, how it talks to the Cloud, the
commands it exposes, how extensions load, and the operational guarantees it makes.

The blueprint specifies the engine's **contract with the Cloud**. The internals it delegates to -
data flow, brokers, backtesting, optimisation, determinism - are in
`product:razor/blueprint/internal-architecture`.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/blueprint/engine-technical-blueprint/engine-overview | What the engine is, and how the product principles land in it. | engine | | core/src/Engine/Program.cs |
| product:razor/blueprint/engine-technical-blueprint/cli-and-startup | Launch, authentication and the absence of a bootstrap file. | engine | | core/src/Engine/Program.cs |
| product:razor/blueprint/engine-technical-blueprint/communication-protocol | Transport, envelope, handshake, heartbeat, command execution, binary transfers, capability negotiation, broadcast. | engine, cloud, security | | core/src/Engine/Communication/** |
| product:razor/blueprint/engine-technical-blueprint/command-system | The command ID registry and how handlers are dispatched. | engine | | core/src/Engine/Management/Commands/** |
| product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management | Discovery, double validation, lifecycle and safety of extensions. | extensions | extension-deployment | core/src/Engine/Pluggability/** |
| product:razor/blueprint/engine-technical-blueprint/concurrency-and-task-management | Task types, priorities and resource reservation. | engine | | core/src/Engine/Management/Tasks/** |
| product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs | Virtual timers: cronjobs and one-off schedules. | engine | | core/src/Engine/Management/Scheduling/** |
| product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry | Reconnection, infinite retry, and what keeps running while offline. | engine | | core/src/Engine/Communication/CloudConnector.cs |
| product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering | Authentication, transport encryption, binary protection, extension signing. | security, engine | | core/src/Engine/Core/SecurityManager.cs |
| product:razor/blueprint/engine-technical-blueprint/logging-and-telemetry | Logging, log streaming and metrics. | engine, reporting | | core/src/Engine/Core/EngineTelemetry.cs |
| product:razor/blueprint/engine-technical-blueprint/behavior-recorder | Sparse, batched decision recording for reinforcement learning. | engine, data | | core/src/Engine/Core/BehaviorRecorder.cs |
| product:razor/blueprint/engine-technical-blueprint/self-update | Remote update via heartbeat, with rollback. | engine | engine-update | core/src/Engine/Core/SelfUpdateManager.cs |
| product:razor/blueprint/engine-technical-blueprint/state-persistence | The narrow set of things the engine persists locally. | engine | | core/src/Engine/Core/StateManager.cs |
| product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery | Failure handling at every level, including the kill switch. | engine | | |
| product:razor/blueprint/engine-technical-blueprint/platform-details | Windows and Linux operational differences. | operations, engine | | |
| product:razor/blueprint/engine-technical-blueprint/testing-strategy | How the engine is verified. | engine | | core/tests/** |
| product:razor/blueprint/engine-technical-blueprint/performance | The performance discipline the engine is built to. | engine | | |
