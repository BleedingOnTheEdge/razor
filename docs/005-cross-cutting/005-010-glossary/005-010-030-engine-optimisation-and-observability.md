---
id: product:razor/cross-cutting/glossary/engine-optimisation-and-observability
parent: product:razor/cross-cutting/glossary
title: Engine, Optimisation and Observability
level: product
kind: cross-cutting
domains: [engine, optimisation, backtesting, reporting]
keywords:
  - engine components
  - backtest
  - genetic algorithm
  - optimisation
  - determinism
  - metrics
  - telemetry
  - reporting
---

# Engine, Optimisation and Observability

**Backtest**
A simulation of trading over historical tick data to evaluate a strategy's past performance.

**BacktestInput**
An immutable record containing all data and configuration required to run a backtest: tick streams, symbols, strategy instance, specifications, and optional genes.

**BacktestRunner**
The orchestrator class that executes a backtest, processing ticks sequentially through the broker and strategy.

**BehaviorRecorder**
A service that records sparse behavioural data (state, action, reward) from strategies for reinforcement learning training. Records are buffered, compressed, and uploaded to Cloud.

**Calmar Ratio**
A risk‑adjusted return metric: annualised return divided by maximum drawdown.

**Chromosome**
A candidate solution in the genetic algorithm. A flat array of doubles representing strategy genes and neural network parameters.

**CI (Continuous Integration)**
Automated build and test pipeline that verifies code quality and determinism.

**Configuration Exception**
Exception thrown when an immutable specification record fails validation.

**Crossover**
A GA operation where two parent chromosomes exchange genes to create offspring.

**CustomizedRandom**
A portable deterministic pseudo‑random number generator (xorshift128+). Guarantees identical sequences across .NET versions and operating systems. Located in `Sdk.Shared`.

**Determinism**
The guarantee that identical inputs produce bit‑identical outputs every run, on any supported platform.

**Elitism**
A GA strategy where the best chromosomes are copied unchanged to the next generation.

**Razor Engine**
The closed‑source, headless executable that runs on the user's server. It executes backtests, optimisations, and live trading.

**Execution Specification**
Immutable configuration record for a backtest or optimisation run: date range, latency, warm‑up, etc. Located in `Kernel.Configuration`.

**Fitness**
A scalar score (higher = better) that rates a backtest result. Fitness evaluation is performed by hook plugins via the `OnFitnessEvaluation` action hook, not by a built‑in `IFitnessModel`.

**Gene**
A single optimisable value within a strategy, marked with `[Gene]` attribute. Can be continuous, discrete, categorical, structural, or parametric.

**GeneInjector**
Static helper class in `Sdk.Shared` that extracts gene schemas, injects gene values into strategy properties and neural network models, and builds chromosome arrays.

**Genetic Algorithm (GA)**
A population‑based optimisation method inspired by evolution. Used to find optimal strategy parameters.

**GeneticOptimizerState**
An immutable snapshot of the optimiser's population and parameters, allowing pause/resume of long‑running optimisations.

**Golden Test**
A determinism verification test that runs a backtest twice and compares the hash of the trade history. A CI gate.

**Hyper‑Mutation**
An elevated mutation rate activated when the GA's best fitness stagnates for several generations.

**IMessageBus**
In‑process publish/subscribe messaging system for domain events. Located in `Kernel.Messaging` (internal, not in the public SDK).

**Razor Kernel**
The closed‑source core library containing all trading logic, brokers, GA, hook invoker, and telemetry.

**Live Specification**
Immutable configuration for live trading: magic number and order guard timeout. Continuous optimisation fields have been removed (Cloud‑orchestrated). Located in `Kernel.Configuration`.

**Metrics**
Performance statistics: Net Profit, Return%, Win Rate, Sharpe Ratio, Sortino Ratio, Profit Factor, Calmar Ratio. Custom metrics are computed by hook plugins via the `OnCompleted` backtest action hook and the live action hooks.

**Observability**
The ability to monitor the internal state of the engine through metrics, logs, and health checks.

**OpenTelemetry**
A vendor‑neutral observability framework. Razor emits metrics via `System.Diagnostics.Metrics`.

**Optimisation Specification**
Immutable GA configuration: master seed, generations, population size, mutation/crossover rates, elitism, tournament size. Located in `Kernel.Configuration`.

**Population**
The set of all chromosomes in a GA generation.

**Profit Factor**
Gross profit divided by gross loss. > 1 indicates profitability.

**Report Generator**
A class that invokes the `OnBeforeGenerate` and `OnAfterGenerate` hooks. Report rendering is handled by Razor Cloud.

**Seed**
A number used to initialise a random number generator. Razor derives all randomness from a master seed.

**Sharpe Ratio**
A risk‑adjusted return metric: average return above risk‑free rate divided by standard deviation of returns.

**Sortino Ratio**
Like Sharpe ratio but only considers downside volatility.

**Stagnation**
A GA condition where the best fitness does not improve for several generations. Triggers hyper‑mutation.

**Strategy Specification**
Immutable configuration: initial balance, leverage, symbols/timeframes. Located in `Sdk.Shared`.

**Tournament Selection**
A GA selection method where a random group of chromosomes is chosen and the best is selected.

**Validation**
Every configuration record must implement `Validate()` and throw `ConfigurationException` on invalid input.

**xorshift128+**
The algorithm used by `CustomizedRandom` for portable, deterministic random number generation.
