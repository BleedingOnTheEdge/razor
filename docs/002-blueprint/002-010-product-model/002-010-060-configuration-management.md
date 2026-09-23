---
id: product:razor/blueprint/product-model/configuration-management
parent: product:razor/blueprint/product-model
title: 7. Configuration Management
level: product
kind: blueprint
---

# 7. Configuration Management

- The Engine's local configuration is limited to credentials supplied at startup (interactively or via `--auth`).
- All operational configurations (strategy specifications, execution parameters, optimisation settings, live trading parameters) are created and stored in Razor Cloud.
- When the Cloud sends a command (e.g., `RunBacktest`), the full configuration is included in the payload.
- Users modify configurations through the Cloud web interface; changes take effect immediately or on the next operation, depending on context.
- Razor Cloud is the immutable source of truth for all configurations; any local state on the engine is temporary and disposable.

---
