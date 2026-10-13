---
id: product:razor/blueprint/engine-technical-blueprint/logging-and-telemetry
parent: product:razor/blueprint/engine-technical-blueprint
title: Logging and Telemetry
level: product
kind: blueprint
domains: [engine, reporting]
keywords:
  - logging
  - serilog
  - structured logs
  - log rotation
  - log levels
  - log streaming
  - telemetry
  - opentelemetry
  - metrics
references:
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/internal-architecture
code_paths:
  - core/src/Engine/Core/EngineTelemetry.cs
---

# Logging and Telemetry

## Logging

- **Library:** Serilog, writing structured JSON through `CompactJsonFormatter`.
- **Output:** daily-rotated files under `logs/`, with a 10 MB size limit and 31-day retention.
- **Levels:** Trace, Debug, Information, Warning, Error, Critical. The default is Information, and the
  Cloud can change it with `SetLogLevel`.

## Streaming logs to the Cloud

The Cloud sends `GetLogs` with optional filters, and the engine replies with a **binary transfer** of
the matching log files (see `communication-protocol`). Logs are pushed on demand rather than streamed
continuously, so a quiet engine costs nothing.

## Telemetry

- **Mechanism:** OpenTelemetry, through `System.Diagnostics.Metrics`.
- Both Kernel metrics (`CoreMetrics`) and engine-specific metrics (`EngineTelemetry`) are collected.
- Metrics include command execution count, task count, connection state, live tick age, CPU usage and
  memory usage.

Metrics are the engine's outward view of its own health; the Cloud is what makes them visible to a
user. See `product:razor/blueprint/internal-architecture` for how Kernel-side telemetry is produced.
