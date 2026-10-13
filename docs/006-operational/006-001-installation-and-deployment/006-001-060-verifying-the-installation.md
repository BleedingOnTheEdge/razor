---
id: product:razor/operational/installation-and-deployment/verifying-the-installation
parent: product:razor/operational/installation-and-deployment
title: Verifying the Installation
level: product
kind: operational
domains: [operations, cloud, live-trading]
flows: [onboarding, backtest-run]
keywords:
  - verifying installation
  - engine startup
  - online status
  - test backtest
  - connectivity check
---

# Verifying the Installation

## Engine Startup

When the engine starts successfully, you will see log output similar to:

```
[info] Razor Engine v1.0.0 LTS starting...
[info] Discovered: 2 adapters, 3 strategies, 4 indicators, 1 NN model, 5 hook plugins
[info] Connecting to Razor Cloud...
[info] Connected and authenticated. Engine ID: eng_abc123
[info] Sending extension manifest to Cloud...
[info] Cloud activated: adapter=BinanceAdapter, strategy=MACrossover, indicators=[SMA,RSI], plugins=[DrawdownGuard,TelegramNotifier], nnModel=none
[info] Waiting for commands...
```

## Cloud Verification

In Razor Cloud, navigate to **Engines**. Your engine should appear as **Online** with a green indicator. If it shows **Offline** or **Error**, check the local log file in the `logs/` directory.

## Running a Test Backtest

1. In Razor Cloud, create a simple strategy configuration.
2. Click **Run Backtest** and select your online engine.
3. The engine processes the backtest and streams progress to the Cloud.
4. Once complete, view the results in the Cloud dashboard.

This confirms end‑to‑end connectivity and correct engine operation.

---
