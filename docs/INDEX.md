---
id: product:razor/docs
title: Documentation Map
level: product
kind: blueprint
---

# Documentation Map

Routing only. Which domains exist, which flows exist, and which domains each flow spans.
This file stays tiny. It is the first thing an orchestrator reads.

## Domains

| Domain | Root |
|---|---|
| backtesting | product:razor/blueprint |
| cloud | product:razor/blueprint |
| data | product:razor/blueprint |
| engine | product:razor/blueprint |
| extensions | product:razor/contracts |
| licensing | product:razor/blueprint |
| live-trading | product:razor/blueprint |
| marketplace | product:razor/blueprint |
| operations | product:razor/operational |
| optimisation | product:razor/blueprint |
| reporting | product:razor/blueprint |
| sdk | product:razor/contracts |
| security | product:razor/blueprint |

The four documentation roots are:

| Root | Covers |
|---|---|
| product:razor/blueprint | What Razor is, the product model, the engine specification, the internal architecture, and planned features. |
| product:razor/contracts | The configuration data contract and the public extension API. |
| product:razor/cross-cutting | The principles and the glossary that apply to every part of the product. |
| product:razor/operational | Procedures for running the product in the field. |

## Flows

| Flow | Spans |
|---|---|
| backtest-run | backtesting, cloud, data, engine, live-trading, operations, sdk |
| engine-update | cloud, engine, extensions, operations, security |
| extension-deployment | cloud, engine, extensions, operations, sdk, security |
| extension-development | data, engine, extensions, sdk |
| live-trading-session | backtesting, cloud, data, engine, extensions, live-trading, operations, sdk, security |
| onboarding | cloud, engine, extensions, licensing, live-trading, operations, security |
| optimisation-run | backtesting, cloud, engine, optimisation, sdk |
| reporting | cloud, engine |
| strategy-development | engine, extensions, optimisation, sdk |

## Cross-domain flows

Every flow above spans more than one domain, which is why each is documented as a flow rather
than inside a single component's blueprint. The two widest are `live-trading-session` (nine
domains) and `backtest-run` (seven); both cross the engine, the Cloud control plane and the
public contracts at once.
