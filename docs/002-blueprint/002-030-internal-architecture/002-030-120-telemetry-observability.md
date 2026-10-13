---
id: product:razor/blueprint/internal-architecture/telemetry-observability
parent: product:razor/blueprint/internal-architecture
title: Telemetry & Observability
level: product
kind: blueprint
domains: [engine, reporting]
keywords:
  - telemetry
  - metrics
  - opentelemetry
  - coremetrics
code_paths:
  - core/src/Kernel/Telemetry/**
---

# Telemetry & Observability

`CoreMetrics` (instance‑based) provides OpenTelemetry metrics via `System.Diagnostics.Metrics`.

| Metric | Instrument | Description |
|--------|------------|-------------|
| `core.ga.fitness_improvement` | Histogram | Improvement in best fitness per generation |
| `core.backtest.ticks_per_second` | Histogram | Tick processing rate |
| `core.live.order_latency_ms` | Histogram | Order placement latency in milliseconds |
| `core.live.order_rejections_total` | Counter | Total order rejections |
| `core.optimization.duration_seconds` | Histogram | Total optimisation run duration |
| `core.live.tick_latency_ticks` | Histogram | Live tick arrival latency |
| `core.live.connection_state` | Gauge | 1 if connected, 0 if disconnected |

All metrics are registered in a `Meter` named `"Core.Metrics"`. Engine‑specific metrics are in `EngineTelemetry` under `"Engine"`.

---
