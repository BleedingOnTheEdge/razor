---
id: product:razor/blueprint/engine-technical-blueprint/logging-telemetry-performance-focused
parent: product:razor/blueprint/engine-technical-blueprint
title: 10. Logging & Telemetry (Performance‑Focused)
level: product
kind: blueprint
---

# 10. Logging & Telemetry (Performance‑Focused)

## 10.1 Logging Infrastructure

- **Library:** Serilog (structured JSON logs via `CompactJsonFormatter`).
- **Output:** Daily‑rotated files in `logs/` with size limit (10 MB) and retention (31 days).
- **Log Levels:** Trace, Debug, Information, Warning, Error, Critical. Default Information (overridable by Cloud via `SetLogLevel`).

## 10.2 Log Streaming to Cloud

- Cloud sends `GetLogs` with optional filters.
- Engine responds with a binary transfer of the matching log file(s).

## 10.3 Telemetry

- **Metrics:** OpenTelemetry (via `System.Diagnostics.Metrics`).
- Engine collects both Kernel metrics (`CoreMetrics`) and Engine‑specific metrics (`EngineTelemetry`).
- Metrics include: command execution count, task count, connection state, live tick age, CPU usage, memory usage.

---
