---
id: product:razor/blueprint/product-model/licensing-subscriptions
parent: product:razor/blueprint/product-model
title: 4. Licensing & Subscriptions
level: product
kind: blueprint
---

# 4. Licensing & Subscriptions

## 4.1 Subscription Tiers
Razor is sold as a per‑user subscription with the following durations: 4 months, 6 months, 12 months. Each subscription includes one engine instance by default. Additional instances can be purchased incrementally.

A **free development tier** is available. It provides full access to Razor Cloud and the Engine, but with functional limitations enforced by the license key:

- Only a mock adapter for live trading (records all sent orders without execution).
- Historical data limited to a predefined rolling window (e.g., 3 months).
- All other features (backtesting, optimisation, reporting) are fully functional.

## 4.2 Feature Gates
Capabilities are enforced by the Cloud through a signed capability set transmitted to the engine after authentication. The engine enforces these capabilities locally; any attempt to bypass them is reported to the Cloud.

**Feature ID Registry:**

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

## 4.3 Instance API Keys
Each engine instance is registered in Razor Cloud and assigned a unique API key. This key is used during the initial WebSocket handshake to authenticate the instance. Users create and revoke keys from the Cloud dashboard.

---
