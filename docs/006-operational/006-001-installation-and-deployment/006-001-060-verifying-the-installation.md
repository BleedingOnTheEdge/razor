---
id: product:razor/operational/installation-and-deployment/verifying-the-installation
parent: product:razor/operational/installation-and-deployment
title: 7. Verifying the Installation
level: product
kind: operational
---

# 7. Verifying the Installation

## 7.1 Engine Startup

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

## 7.2 Cloud Verification

In Razor Cloud, navigate to **Engines**. Your engine should appear as **Online** with a green indicator. If it shows **Offline** or **Error**, check the local log file in the `logs/` directory.

## 7.3 Running a Test Backtest

1. In Razor Cloud, create a simple strategy configuration.
2. Click **Run Backtest** and select your online engine.
3. The engine processes the backtest and streams progress to the Cloud.
4. Once complete, view the results in the Cloud dashboard.

This confirms end‑to‑end connectivity and correct engine operation.

---
