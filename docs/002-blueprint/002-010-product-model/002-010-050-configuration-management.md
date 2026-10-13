---
id: product:razor/blueprint/product-model/configuration-management
parent: product:razor/blueprint/product-model
title: Configuration Management
level: product
kind: blueprint
domains: [cloud, engine]
keywords:
  - configuration
  - source of truth
  - bootstrap
  - config in payload
  - disposable local state
references:
  - product:razor/contracts/configuration-reference
  - product:razor/blueprint/product-model/control-monitoring
---

# Configuration Management

- The engine's local configuration is limited to the credentials supplied at startup, interactively
  or via `--auth`.
- All operational configuration - strategy specifications, execution parameters, optimisation
  settings, live trading parameters - is created and stored in the Cloud.
- When the Cloud sends a command, for example `RunBacktest`, the **full configuration is included in
  the payload**.
- Users modify configuration through the Cloud interface; changes take effect immediately or on the
  next operation, depending on context.
- **The Cloud is the immutable source of truth for all configuration.** Any local state on the engine
  is temporary and disposable.

The shape of that configuration is defined by `product:razor/contracts/configuration-reference`.
