---
id: product:razor/flows/strategy-development
title: Strategy Development
level: product
kind: contract
domains: [engine, extensions, optimisation, sdk]
flows: [strategy-development]
keywords:
  - strategy development
  - developing a strategy
  - strategybase
  - istrategycapability
  - indicator
  - tickwindow
  - gene
  - optimisable strategy
references:
  - product:razor/contracts/extension-developer-guide/developing-a-strategy
  - product:razor/contracts/extension-developer-guide/developing-a-neural-network-model
  - product:razor/contracts/extension-developer-guide/deployment
  - product:razor/contracts/extension-developer-guide/best-practices
  - product:razor/contracts/extension-developer-guide
  - product:razor/contracts/configuration-reference
  - product:razor/contracts/configuration-reference/slot-capability-interfaces
  - product:razor/contracts/configuration-reference/strategy-specification
  - product:razor/contracts/configuration-reference/gene-attributes
  - product:razor/contracts/configuration-reference/market-data-types
  - product:razor/contracts/configuration-reference/validation-and-exceptions
  - product:razor/contracts/configuration-reference/hook-system
  - product:razor/cross-cutting/principles/determinism-is-mandatory
  - product:razor/cross-cutting/principles/tick-only-core-no-bar-dependencies
  - product:razor/blueprint/product-model/user-workflows
  - product:razor/blueprint/product-model/licensing-subscriptions
  - product:razor/blueprint/internal-architecture/backtesting-engine
  - product:razor/blueprint/internal-architecture/genetic-optimisation-engine
  - product:razor/operational/installation-and-deployment/verifying-the-installation
  - product:razor/flows/backtest-run
  - product:razor/flows/optimisation-run
implements: [strategy-development]
---

# Strategy Development

## Purpose

Produce a strategy that reacts to ticks, survives optimisation, and behaves identically in a backtest and
in live trading. It is the strategy-specific route through extension development: the same contracts,
toolchain and local engine, with the strategy slot, its lifecycle and its gene schema as the subject.

## Participants

| Component | Role in this flow |
|---|---|
| Developer | Writes the strategy, its indicators and - optionally - its neural network. |
| Cloud | Owns the configuration the strategy receives, and executes the runs that exercise it. |
| Engine, Kernel | Drive the strategy's lifecycle during a backtest, an optimisation or a live session. |
| Strategy (extension) | Supplies the decision logic and the gene schema. |

## Steps

| # | Step | Owner | Specified by |
|---|---|---|---|
| 1 | Set up the project as an extension: `Sdk` package reference, `[assembly: SdkVersion("1.0.0")]`. | Developer | `product:razor/contracts/extension-developer-guide` |
| 2 | Implement the strategy slot: `IStrategyCapability`, or derive from `StrategyBase` for its convenience members. | Developer | `product:razor/contracts/configuration-reference/slot-capability-interfaces`, `product:razor/contracts/extension-developer-guide/developing-a-strategy` |
| 3 | Declare what the strategy needs: request symbols and timeframes through the strategy specification, and know that the account's initial balance and leverage arrive with it. | Strategy, author | `product:razor/contracts/configuration-reference/strategy-specification`, `product:razor/contracts/configuration-reference/market-data-types` |
| 4 | Implement the lifecycle: `OnConfigureAsync(spec)`, `OnStartAsync(indicators)`, synchronous `OnTick(symbol, tick)` for every tick in order, `OnStopAsync`, and `InjectGenes` for optimisation. | Developer | `product:razor/contracts/configuration-reference/slot-capability-interfaces`, `product:razor/contracts/extension-developer-guide/developing-a-strategy` |
| 5 | Build indicators through the registry, and use `TickWindow` for OHLC-style statistics - the core is tick-only, so bars are an aggregation, never a callback. | Developer | `product:razor/contracts/extension-developer-guide/developing-a-strategy`, `product:razor/cross-cutting/principles/tick-only-core-no-bar-dependencies` |
| 6 | Mark the parameters the genetic algorithm may vary with `[Gene]`, respecting the constructor's `step` rules and giving deterministic `Order`. | Developer | `product:razor/contracts/configuration-reference/gene-attributes` |
| 7 | Optionally require a neural network: set `RequiresNeuralNetwork`, and supply a model in `NeuralNetworks/` or accept the built-in feed-forward network; its parameters join the chromosome. | Developer | `product:razor/contracts/extension-developer-guide/developing-a-neural-network-model`, `product:razor/contracts/configuration-reference/slot-capability-interfaces` |
| 8 | Keep the strategy deterministic and thread-safe: no wall-clock time, portable seeded randomness, `TickWindow` touched only from the tick pipeline. | Developer | `product:razor/cross-cutting/principles/determinism-is-mandatory`, `product:razor/contracts/extension-developer-guide/best-practices` |
| 9 | Exercise it: run it on a locally running engine with the development licence, first as a backtest, then as an optimisation over the same strategy. | Developer, Engine | `product:razor/contracts/extension-developer-guide/deployment`, `product:razor/blueprint/product-model/licensing-subscriptions`, `product:razor/flows/backtest-run`, `product:razor/flows/optimisation-run` |
| 10 | Iterate until the strategy is ready, then deploy it and replace the mock adapter with a real broker adapter for production. | Developer, Cloud | `product:razor/blueprint/product-model/user-workflows`, `product:razor/flows/extension-deployment` |
| 11 | When correctness is questioned, the live/backtest parity contract decides: identical tick sequences must produce identical trade histories. | Engine, Developer | `product:razor/blueprint/internal-architecture/backtesting-engine`, `product:razor/blueprint/internal-architecture/broker-architecture` |

## Persisted and Reported

- The compiled strategy DLL is placed in the engine's `Strategies/` directory, or deployed through the
  Cloud (`product:razor/contracts/extension-developer-guide/deployment`,
  `product:razor/blueprint/internal-architecture/extension-loading-versioning`).
- The gene schema is not stored: it is discovered by reflection from the `[Gene]` attributes at run time
  (`product:razor/blueprint/internal-architecture/genetic-optimisation-engine`).
- Results of the runs that exercise the strategy are stored in the Cloud, and the engine streams raw data
  to it (`product:razor/blueprint/product-model/control-monitoring`).
- A first-run check confirms end-to-end connectivity with a test backtest
  (`product:razor/operational/installation-and-deployment/verifying-the-installation`).

## Failure Modes

| Failure | What happens | Specified by |
|---|---|---|
| Duplicate symbols, or an empty symbol request | Validation throws `ConfigurationException`; the strategy will not run. | `product:razor/contracts/configuration-reference/strategy-specification`, `product:razor/contracts/configuration-reference/validation-and-exceptions` |
| `[Gene]` step rules are violated | The attribute constructor rejects the declaration rather than silently adjusting it. | `product:razor/contracts/configuration-reference/gene-attributes` |
| The strategy reads a wall clock | Determinism breaks and the rule is CI-enforced; use the tick's time instead. | `product:razor/cross-cutting/principles/determinism-is-mandatory`, `product:razor/contracts/extension-developer-guide/best-practices` |
| The strategy uses unseeded randomness | Gene seeds must be derived from the master seed, and negative seeds are rejected. | `product:razor/cross-cutting/principles/determinism-is-mandatory` |
| `TickWindow` is read from a background task | It is not thread-safe; access must happen from the tick pipeline or under synchronisation. | `product:razor/contracts/extension-developer-guide/developing-a-strategy` |
| The strategy returns from `OnTick` asynchronously | `OnTick` must be purely synchronous to preserve determinism in both backtest and live. | `product:razor/contracts/configuration-reference/slot-capability-interfaces` |
| A hook the strategy relies on is skipped | Hook order is deterministic - priority, then plugin name, then registration order - so an ordering assumption that ignores it is a defect. | `product:razor/contracts/configuration-reference/hook-system` |

## Domain References

- `sdk`, `extensions`: `product:razor/contracts/extension-developer-guide/developing-a-strategy`,
  `product:razor/contracts/configuration-reference/slot-capability-interfaces`.
- `optimisation`: `product:razor/contracts/configuration-reference/gene-attributes`,
  `product:razor/blueprint/internal-architecture/genetic-optimisation-engine`.
- `engine`: `product:razor/cross-cutting/principles/tick-only-core-no-bar-dependencies`,
  `product:razor/blueprint/internal-architecture/backtesting-engine`.

## Change Entry Point

Start impact discovery here for anything that changes how a strategy is written, configured, exercised or
made optimisable. `product:razor/blueprint/product-model/user-workflows` carries the developer workflow
this flow realises end to end.
