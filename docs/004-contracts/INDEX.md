---
id: product:razor/contracts
title: Razor Contracts
level: product
kind: contract
domains: [sdk, engine, extensions, data]
keywords:
  - contracts
  - configuration reference
  - specification schema
  - extension developer guide
  - public API
---

# Razor Contracts

The interfaces Razor exposes and depends on: the configuration data contract and the public
extension API.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/contracts/configuration-reference | Every configuration object, enum and data contract that controls engine behaviour, with its validation rules. | engine, sdk | strategy-development, backtest-run, optimisation-run, live-trading-session, extension-development | core/src/Sdk/Shared/**, core/src/Sdk/Hooks/**, core/src/Sdk/Slots/**, core/src/Kernel/Configuration/** |
| product:razor/contracts/extension-developer-guide | How to build adapters, strategies, indicators, hook plugins and neural-network models against the public Sdk. | sdk, extensions | extension-development, extension-deployment, strategy-development | |