---
id: product:razor/cross-cutting/principles/messaging-observability
parent: product:razor/cross-cutting/principles
title: 15. Messaging & Observability
level: product
kind: cross-cutting
---

# 15. Messaging & Observability
**All significant events (order execution, connection state, optimisation progress) must be published through a lightweight in‑process message bus, enabling decoupled monitoring and logging.**

- The `IMessageBus` must support typed subscriptions and deduplication (via `EventId`).
- Event payloads must contain all relevant metrics (e.g., `BacktestCompletedEvent` includes Sharpe ratio, profit factor) so dashboards can display key statistics without parsing reports.
- Razor must expose OpenTelemetry metrics (histograms, counters) for backtest throughput, GA fitness improvement, live order latency, and live tick latency.
- Connection state must be exposed as a gauge for health check integration.

---
