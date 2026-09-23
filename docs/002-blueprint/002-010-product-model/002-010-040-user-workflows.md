---
id: product:razor/blueprint/product-model/user-workflows
parent: product:razor/blueprint/product-model
title: 5. User Workflows
level: product
kind: blueprint
---

# 5. User Workflows

## 5.1 Developer Workflow
1. Register for a free developer account on Razor Cloud.
2. Download the Razor Engine binary.
3. Install the `Sdk` NuGet package.
4. Develop a strategy, adapter, indicator, hook plugin, or NN model locally.
5. Run the engine with the development license key; it connects to Razor Cloud.
6. Use the Cloud web interface to upload the extension, configure a backtest, and view results.
7. Iterate until the strategy is ready.
8. Upgrade to a paid subscription, replace the mock adapter with a real broker adapter, and deploy the same engine binary on a production server.

## 5.2 Production Workflow
1. Purchase a paid subscription.
2. Deploy the Engine on a production server with the production license key.
3. From Razor Cloud, configure the live trading session, activate the production adapter and strategy, and start the strategy.
4. Monitor real‑time performance, receive alerts, and periodically run optimisations—all from the Cloud dashboard.
5. When the Cloud schedules an optimisation, it sends a command to the engine; results are reported back and displayed, and upon user approval (or automatic timeout), the Cloud pushes new genes to the live engine.

---
