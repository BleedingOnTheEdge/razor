---
id: product:razor/blueprint/engine-technical-blueprint/performance
parent: product:razor/blueprint/engine-technical-blueprint
title: Performance
level: product
kind: blueprint
domains: [engine]
keywords:
  - performance
  - allocations
  - span
  - arraypool
  - batching
  - buffered logging
  - lock-free metrics
  - flow control
references:
  - product:razor/blueprint/engine-technical-blueprint/concurrency-and-task-management
  - product:razor/blueprint/engine-technical-blueprint/behavior-recorder
  - product:razor/blueprint/internal-architecture
---

# Performance

The performance discipline the engine is built to, area by area. It is a specification of intent, not
a benchmark.

| Area | Strategy |
|---|---|
| **Tick processing** | Avoid allocations; use `Span<T>` and `ArrayPool`; hot paths are allocation-free. |
| **Data recording** | Sparse - only on an action - batched, compressed, asynchronous I/O. |
| **Logging** | Structured JSON, buffered writes, daily rotation. |
| **Telemetry** | Lock-free histograms and counters, minimal overhead. |
| **WebSocket** | Reuse buffers, chunked transfers, flow control. |
| **Task scheduling** | Resource reservation prevents contention; live-first priority. |
| **State persistence** | Minimal SQLite use; the Cloud is the source of truth. |

The unifying rule is that **nothing on the trading path may be observably slowed by anything off it**.
That is why recording, logging, telemetry and persistence are each sparse, batched or asynchronous,
and why live work holds a reserved core.
