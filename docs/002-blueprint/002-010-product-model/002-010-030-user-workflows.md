---
id: product:razor/blueprint/product-model/user-workflows
parent: product:razor/blueprint/product-model
title: User Workflows
level: product
kind: blueprint
flows: [onboarding, extension-development, strategy-development, live-trading-session]
keywords:
  - developer workflow
  - production workflow
  - onboarding
  - deploy strategy
  - re-optimisation
  - gene injection
references:
  - product:razor/blueprint/product-model/licensing-subscriptions
  - product:razor/blueprint/product-model/deployment-distribution
  - product:razor/blueprint/product-model/control-monitoring
---

# User Workflows

## Developer workflow

1. Register for a free developer account on the Cloud.
2. Download the engine binary.
3. Install the `Sdk` NuGet package.
4. Develop a strategy, adapter, indicator, hook plugin or neural-network model locally.
5. Run the engine with the development licence key; it connects to the Cloud.
6. Use the Cloud interface to upload the extension, configure a backtest, and view results.
7. Iterate until the strategy is ready.
8. Upgrade to a paid subscription, replace the mock adapter with a real broker adapter, and deploy the
   **same engine binary** on a production server.

## Production workflow

1. Purchase a paid subscription.
2. Deploy the engine to a production server with the production licence key.
3. From the Cloud, configure the live session, activate the production adapter and strategy, and start
   it.
4. Monitor real-time performance, receive alerts, and run optimisations periodically - all from the
   dashboard.
5. When the Cloud schedules an optimisation it sends the command to the engine; results are reported
   back and displayed, and on user approval (or automatic timeout) the Cloud pushes the new genes to
   the running live engine.
