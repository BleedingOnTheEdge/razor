---
id: product:razor/blueprint/product-model/licensing-subscriptions
parent: product:razor/blueprint/product-model
title: Licensing and Subscriptions
level: product
kind: blueprint
domains: [licensing]
flows: [onboarding]
keywords:
  - subscription
  - tiers
  - free development tier
  - durations
  - feature gates
  - feature id registry
  - capability set
  - instance api key
references:
  - product:razor/blueprint/product-model/product-overview
  - product:razor/contracts/configuration-reference
---

# Licensing and Subscriptions

## Subscription tiers

Razor is sold as a per-user subscription in durations of **4, 6 or 12 months**. Each subscription
includes one engine instance by default, and additional instances can be purchased incrementally.

A **free development tier** gives full access to the Cloud and the engine with functional limits
enforced by the licence key:

- only a mock adapter for live trading, which records every order sent without executing it;
- historical data limited to a predefined rolling window (for example, three months);
- every other feature - backtesting, optimisation, reporting - fully functional.

## Feature gates

Capabilities are enforced by the Cloud through a **signed capability set** transmitted to the engine
after authentication. The engine enforces the set locally, and any attempt to bypass it is reported
back to the Cloud.

| Feature | ID | Description |
|---|---|---|
| Live Trading | 100 | Core live trading capability |
| Backtesting | 101 | Backtest execution |
| Optimisation | 102 | Genetic-algorithm optimisation |
| Neural Networks | 103 | Support for `INeuralNetworkModel` |
| Hooks | 104 | Hook system support |
| Cronjobs | 105 | Scheduled jobs |
| Schedules | 106 | One-off scheduled commands |
| Self-Update | 108 | Automatic binary update |
| Log Streaming | 109 | On-demand log transfer |
| Telemetry Export | 110 | Metrics export |
| Behavior Logging | 111 | Sparse behaviour recording |

## Instance API keys

Each engine instance is registered in the Cloud and assigned a unique API key, used during the
initial WebSocket handshake to authenticate the instance. Users create and revoke keys from the Cloud
dashboard. Keys are per instance, not per user.
