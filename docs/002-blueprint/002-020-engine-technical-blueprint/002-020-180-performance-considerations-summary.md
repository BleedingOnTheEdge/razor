---
id: product:razor/blueprint/engine-technical-blueprint/performance-considerations-summary
parent: product:razor/blueprint/engine-technical-blueprint
title: 19. Performance Considerations (Summary)
level: product
kind: blueprint
---

# 19. Performance Considerations (Summary)

| Area | Strategy |
|------|----------|
| **Tick Processing** | Avoid allocations; use `Span<T>`, `ArrayPool`; hot paths are allocation‑free. |
| **Data Recording** | Sparse (only on action), batched, compressed, asynchronous I/O. |
| **Logging** | Structured JSON; buffered writes; daily rotation. |
| **Telemetry** | Lock‑free histograms/counters; minimal overhead. |
| **WebSocket** | Reuse buffers; chunked transfers; flow control. |
| **Task Scheduling** | Resource reservation prevents contention; live‑first priority. |
| **State Persistence** | Minimal SQLite usage; Cloud is source of truth. |

---
