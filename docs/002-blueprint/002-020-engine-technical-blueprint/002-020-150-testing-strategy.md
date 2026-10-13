---
id: product:razor/blueprint/engine-technical-blueprint/testing-strategy
parent: product:razor/blueprint/engine-technical-blueprint
title: Testing Strategy
level: product
kind: blueprint
domains: [engine]
keywords:
  - testing
  - unit tests
  - integration tests
  - cross-project tests
  - performance tests
  - load tests
  - end-to-end tests
  - e2e tests
  - reconnect resilience
  - negative control
references:
  - product:razor/cross-cutting/principles
  - product:razor/blueprint/internal-architecture
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry
code_paths:
  - core/tests/**
test_paths:
  - core/tests/EndToEndTests/**
  - core/tests/Engine.IntegrationTests/**
  - core/tests/Engine.UnitTests/**
  - core/tests/Kernel.UnitTests/**
  - core/tests/Cloud.UnitTests/**
---

# Testing Strategy

Five levels, each answering a different question.

## Unit tests

Each component in isolation: command dispatcher, task manager, extension manager, state manager,
cloud connector, schedule manager. These answer *does this component behave as specified*.

## Integration tests

The engine as a whole: startup, authentication, a full command flow, multi-task concurrency, offline
retry, extension reload. These answer *do the parts work together*.

## Cross-project integration tests

Engine and Kernel together: run a backtest through the engine and verify the results; run live
trading against a mock adapter. These answer *does the engine actually drive the Kernel correctly* -
the boundary where a contract mismatch hides.

## Performance and load tests

Simulate a heavy optimisation while live trading runs, and measure CPU, memory and task-switching
overhead. These answer *does the live-first guarantee hold under load*.

## End-to-end (E2E) verification tests

The engine and Cloud executing as separate OS processes communicating over real network sockets (WSS):
a compiled Engine binary (`dotnet Engine.dll --auth=...`) connects to a live ASP.NET Core Cloud web host
with ephemeral ECDH key derivation, HMAC challenges, and AES-256-GCM encrypted message frames. These
answer *does the distributed system work reliably across real processes and network boundaries*.

The end-to-end verification suite (`core/tests/EndToEndTests/EngineE2ETests.cs`) validates:
- **Handshake and roundtrip command dispatch:** Live WSS connection establishment, session registration
  in `EngineSessionRegistry`, command dispatching (`GetEngineVersion`), execution on the Engine, and
  completion verification in Cloud `CommandService`.
- **Reconnect resilience and infinite retry:** Severing the active Cloud connection puts the Engine into
  its infinite retry loop with exponential backoff (buffering messages in SQLite `QueuedMessages`); when
  the Cloud host returns on the same port, the Engine reconnects seamlessly, re-authenticates, flushes
  queued messages, and accepts new commands (`GetStatus`) without task disruption.
- **Negative security control:** An unauthorized Engine instance presenting an invalid API key is rejected
  at authentication and prevented from registering in the session registry.
- **Cloud-owned flow lifecycle:** Cloud `FlowOrchestrator` starts an original backtest run, drives commands
  to the running Engine, pauses the run, and executes resume-with-intervention, creating a child run with
  `Spliced` + `Contiguous` lineage and an audited `InterventionSpecification`.

The determinism principle means tests at all levels must be reproducible: the same inputs produce
the same results, which is what makes a failure meaningful. See
`product:razor/cross-cutting/principles`.
