---
id: product:razor/blueprint/engine-technical-blueprint/id-system-for-features-capabilities
parent: product:razor/blueprint/engine-technical-blueprint
title: 17. ID System for Features & Capabilities
level: product
kind: blueprint
---

# 17. ID System for Features & Capabilities

## 17.1 Feature ID Registry

| Feature | ID | Description |
|---------|----|-------------|
| Live Trading | 100 | Core live trading capability |
| Backtesting | 101 | Backtest execution |
| Optimisation | 102 | GA optimisation |
| Neural Networks | 103 | Support for `INeuralNetworkModel` |
| Hooks | 104 | Hook system support |
| Cronjobs | 105 | Scheduled jobs |
| Schedules | 106 | One‑off scheduled commands |
| Self‑Update | 108 | Automatic binary update |
| Log Streaming | 109 | On‑demand log transfer |
| Telemetry Export | 110 | Metrics export |
| Behavior Logging | 111 | Sparse behaviour recording |

## 17.2 Capability Negotiation

- Engine sends its `Capabilities` (list of supported feature IDs) during handshake.
- Cloud validates and may reject the Engine if it lacks required features.

---
