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
references:
  - product:razor/cross-cutting/principles
  - product:razor/blueprint/internal-architecture
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
code_paths:
  - core/tests/**
---

# Testing Strategy

Four levels, each answering a different question.

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

The determinism principle means the first three levels must be reproducible: the same inputs produce
the same results, which is what makes a failure meaningful. See
`product:razor/cross-cutting/principles`.
