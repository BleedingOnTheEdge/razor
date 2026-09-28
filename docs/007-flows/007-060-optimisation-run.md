---
id: product:razor/flows/optimisation-run
title: Optimisation Run
level: product
kind: contract
domains: [backtesting, cloud, engine, optimisation, sdk]
flows: [optimisation-run]
keywords:
  - optimisation
  - optimization
  - genetic algorithm
  - StartOptimization
  - simple optimisation
  - chromosome
  - population
  - best fitness
references:
  - product:razor/blueprint/internal-architecture/genetic-optimisation-engine
  - product:razor/blueprint/internal-architecture/backtesting-engine
  - product:razor/blueprint/internal-architecture/telemetry-observability
  - product:razor/blueprint/internal-architecture/messaging-events
  - product:razor/blueprint/internal-architecture/report-generation-engine-role
  - product:razor/blueprint/internal-architecture/configuration-specification-system
  - product:razor/blueprint/internal-architecture/cloud-control-plane
  - product:razor/blueprint/engine-technical-blueprint/command-system
  - product:razor/blueprint/engine-technical-blueprint/concurrency-and-task-management
  - product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
  - product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery
  - product:razor/blueprint/product-model/appendix-a-supported-commands
  - product:razor/blueprint/product-model/configuration-management
  - product:razor/blueprint/product-model/control-monitoring
  - product:razor/blueprint/product-model/user-workflows
  - product:razor/contracts/configuration-reference/optimization-specification
  - product:razor/contracts/configuration-reference/execution-specification
  - product:razor/contracts/configuration-reference/gene-attributes
  - product:razor/contracts/configuration-reference/hook-system
  - product:razor/contracts/configuration-reference/validation-and-exceptions
  - product:razor/cross-cutting/principles/determinism-is-mandatory
implements: [optimisation-run]
---

# Optimisation Run

## Purpose

Evolve a population of strategy variants against historical data and return the best gene set. The Cloud
authors the request and the fitness policy; the engine runs the genetic algorithm as one task, evaluating
each chromosome with a full backtest, and streams generations back as they complete.

## Participants

| Component | Role in this flow |
|---|---|
| Cloud | Authors the run, defines fitness through a hook, schedules and approves the result, and stores population data. |
| Engine | Dispatches the command, admits the task, hosts the stepping GA, and streams progress. |
| Kernel | `GeneticOptimizer`, `Chromosome`, `GeneInjector`, and the `BacktestRunner` used as the fitness evaluator. |
| Strategy (extension) | Supplies the gene schema through `[Gene]` properties and applies injected genes. |
| Hook plugin (extension, or Cloud policy) | Computes fitness at the `optimization.fitness.evaluate` hook. |

## Steps

| # | Step | Owner | Specified by |
|---|---|---|---|
| 1 | Build the payload: `OptimizationSpecification`, `ExecutionSpecification`, the strategy, and optional genes; send `StartOptimization` (optimisation band 1300-1306). | Cloud | `product:razor/blueprint/product-model/configuration-management`, `product:razor/blueprint/product-model/appendix-a-supported-commands` |
| 2 | Validate the specification records; negative seeds, a too-small population and out-of-range rates are rejected. | Kernel | `product:razor/blueprint/internal-architecture/configuration-specification-system`, `product:razor/contracts/configuration-reference/optimization-specification`, `product:razor/contracts/configuration-reference/validation-and-exceptions` |
| 3 | Admit an optimisation task at Medium priority on the shared CPU budget, bounded by `MaxParallelThreads`. | Engine | `product:razor/blueprint/engine-technical-blueprint/concurrency-and-task-management`, `product:razor/contracts/configuration-reference/execution-specification` |
| 4 | Build the chromosome schema from `[Gene]`-decorated properties plus the neural network's parameter count. | Kernel | `product:razor/blueprint/internal-architecture/genetic-optimisation-engine`, `product:razor/contracts/configuration-reference/gene-attributes` |
| 5 | Initialise the population deterministically: master seed, per-individual seed derived without `HashCode`, the portable RNG, and random gene values inside each gene's constraints. | Kernel | `product:razor/blueprint/internal-architecture/genetic-optimisation-engine`, `product:razor/cross-cutting/principles/determinism-is-mandatory` |
| 6 | Evaluate: run a full backtest per chromosome with its genes injected, in parallel, and let the `optimization.fitness.evaluate` hook set the fitness. | Kernel, Strategy, plugins | `product:razor/blueprint/internal-architecture/genetic-optimisation-engine`, `product:razor/blueprint/internal-architecture/backtesting-engine`, `product:razor/contracts/configuration-reference/hook-system` |
| 7 | Evolve one generation: tournament selection, uniform crossover, mutation (tripled while hyper-mutation is active), elitism. | Kernel | `product:razor/blueprint/internal-architecture/genetic-optimisation-engine` |
| 8 | Repeat evaluation and evolution for the configured generation count, detecting stagnation and activating hyper-mutation to escape local optima. | Kernel | `product:razor/blueprint/internal-architecture/genetic-optimisation-engine` |
| 9 | Stream progress: generation and best fitness events, and `GetOptimizationState` on request; the dashboard shows generation and best fitness. | Engine, Cloud | `product:razor/blueprint/internal-architecture/messaging-events`, `product:razor/blueprint/product-model/control-monitoring` |
| 10 | Pause and resume: serialise the whole population to a state snapshot and restore it; invalidate fitness if the evaluation data changed. | Kernel, Cloud | `product:razor/blueprint/internal-architecture/genetic-optimisation-engine`, `product:razor/blueprint/engine-technical-blueprint/command-system` |
| 11 | Complete: fire the `optimization.completed` hook, stream the raw population and result data to the Cloud, and let the Cloud render anything user-facing. | Kernel, Engine, Cloud | `product:razor/contracts/configuration-reference/hook-system`, `product:razor/blueprint/internal-architecture/report-generation-engine-role` |
| 12 | Continue into the live loop: the Cloud pushes the winning genes to the running live engine with `InjectGenes` after user approval or an automatic timeout. | Cloud, Engine | `product:razor/blueprint/product-model/user-workflows`, `product:razor/contracts/configuration-reference/live-specification` |

## Persisted and Reported

- Optimisation state snapshots are persisted locally in SQLite, which is what makes pause and resume
  survive a restart (`product:razor/blueprint/engine-technical-blueprint/state-persistence`).
- The Cloud stores the run, its generations, results and provenance; the engine streams raw data and keeps
  no product record (`product:razor/blueprint/internal-architecture/cloud-control-plane`,
  `product:razor/blueprint/internal-architecture/report-generation-engine-role`).
- Metrics cover fitness improvement and run duration
  (`product:razor/blueprint/internal-architecture/telemetry-observability`).
- The dashboard shows operation progress - generation and best fitness - while the run is in flight
  (`product:razor/blueprint/product-model/control-monitoring`).

## Failure Modes

| Failure | What happens | Specified by |
|---|---|---|
| Invalid specification | `ConfigurationException`; the run does not start. | `product:razor/contracts/configuration-reference/validation-and-exceptions` |
| No fitness is set | The hook that computes fitness is the only mechanism; a run without a working evaluator produces no meaningful fitness. | `product:razor/contracts/configuration-reference/optimization-specification`, `product:razor/contracts/configuration-reference/hook-system` |
| Data fetch for a chromosome's backtest fails | The evaluation fails through the adapter path the backtest uses. | `product:razor/contracts/configuration-reference/validation-and-exceptions` |
| The task faults | The task is marked `Faulted` and the Cloud is notified. | `product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery` |
| `CancelOptimization` received | The run is cancelled through the command surface; pause and resume are separate commands. | `product:razor/blueprint/product-model/appendix-a-supported-commands` |
| Cloud connection lost mid-run | The run continues; outgoing data is queued and sent when the connection returns. | `product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry` |
| The engine restarts mid-run | The run can be resumed from the persisted optimisation state rather than restarted. | `product:razor/blueprint/engine-technical-blueprint/state-persistence`, `product:razor/blueprint/internal-architecture/genetic-optimisation-engine` |
| Determinism is broken | Results stop being reproducible, which invalidates strategy validation; a golden test enforces it. | `product:razor/cross-cutting/principles/determinism-is-mandatory` |

## Domain References

- `optimisation`: `product:razor/blueprint/internal-architecture/genetic-optimisation-engine`,
  `product:razor/contracts/configuration-reference/optimization-specification`,
  `product:razor/contracts/configuration-reference/gene-attributes`.
- `backtesting`, `engine`: `product:razor/blueprint/internal-architecture/backtesting-engine` - each
  chromosome is evaluated by a full backtest.
- `cloud`: `product:razor/blueprint/internal-architecture/cloud-control-plane`,
  `product:razor/blueprint/product-model/control-monitoring`.
- `sdk`: `product:razor/contracts/configuration-reference/gene-attributes` - the gene schema is authored
  on strategy properties.

## Change Entry Point

Start impact discovery here for anything that changes how an optimisation is requested, evolved, paused,
resumed, streamed or reported. The simple optimisation is one of the flows the Cloud orchestrates; a
sequence of optimisation windows followed by out-of-sample backtests is the `walk-forward-analysis` flow.
