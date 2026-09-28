---
id: product:razor/flows/walk-forward-analysis
title: Walk-Forward Analysis
level: product
kind: contract
domains: [backtesting, cloud, engine, optimisation, reporting, sdk]
flows: [walk-forward-analysis]
keywords:
  - walk-forward
  - walk forward analysis
  - walk-forward analysis
  - out-of-sample
  - in-sample
  - anchored optimisation
  - optimisation window
  - rolling window
  - overfitting
references:
  - product:razor/blueprint/internal-architecture/cloud-control-plane
  - product:razor/blueprint/internal-architecture/genetic-optimisation-engine
  - product:razor/blueprint/internal-architecture/backtesting-engine
  - product:razor/blueprint/internal-architecture/configuration-specification-system
  - product:razor/blueprint/internal-architecture/messaging-events
  - product:razor/blueprint/internal-architecture/report-generation-engine-role
  - product:razor/blueprint/product-model/control-monitoring
  - product:razor/blueprint/product-model/configuration-management
  - product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
  - product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery
  - product:razor/blueprint/engine-technical-blueprint/command-system
  - product:razor/blueprint/product-model/appendix-a-supported-commands
  - product:razor/contracts/configuration-reference/optimization-specification
  - product:razor/contracts/configuration-reference/execution-specification
  - product:razor/contracts/configuration-reference/gene-attributes
  - product:razor/contracts/configuration-reference/strategy-specification
  - product:razor/contracts/configuration-reference/validation-and-exceptions
implements: [walk-forward-analysis]
---

# Walk-Forward Analysis

## Purpose

Test a strategy out of sample across time instead of once. The Cloud runs a sequence of optimisation
windows over historical data and, for each window, an out-of-sample backtest on the data the optimisation
did not see, then collects the results. It is a Cloud-orchestrated sequence built from the engine's
optimisation and backtest primitives, not an engine feature: there is no walk-forward command, no
walk-forward specification field, and no walk-forward engine mode.

## Participants

| Component | Role in this flow |
|---|---|
| Cloud | Owns the sequence: authors each window's timings and configuration, dispatches the primitives in order, and stores the results. |
| Engine | Runs each dispatched command as an ordinary optimisation or backtest task; it has no walk-forward state of its own. |
| Kernel | Provides the two primitives: the stepping genetic optimiser and the backtest runner. |
| Strategy (extension) | Supplies the gene schema each window optimises, and applies injected genes in the out-of-sample backtest. |

## Steps

| # | Step | Owner | Specified by |
|---|---|---|---|
| 1 | The Cloud decides the windows: which date range each optimisation sees, which out-of-sample range follows it, and when the sequence runs. Scheduling logic lives in the Cloud. | Cloud | `product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs`, `product:razor/blueprint/product-model/control-monitoring` |
| 2 | For each window, the Cloud sends `StartOptimization` (optimisation band 1300-1306) with an `ExecutionSpecification` whose date range is that window's in-sample data. | Cloud | `product:razor/blueprint/product-model/appendix-a-supported-commands`, `product:razor/contracts/configuration-reference/execution-specification` |
| 3 | The engine runs the optimisation exactly as the `optimisation-run` flow specifies - deterministic population, fitness through the `optimization.fitness.evaluate` hook, each chromosome evaluated by a backtest - and streams generation events back. | Engine, Kernel | `product:razor/blueprint/internal-architecture/genetic-optimisation-engine`, `product:razor/flows/optimisation-run` |
| 4 | The window completes; the engine streams the raw population and the best result to the Cloud, which records them as that window's outcome. | Engine, Cloud | `product:razor/blueprint/internal-architecture/report-generation-engine-role`, `product:razor/blueprint/internal-architecture/cloud-control-plane` |
| 5 | The Cloud takes the window's winning genes and sends `RunBacktest` (backtesting band 1200-1203) over a later, out-of-sample date range, carrying those genes in the payload. | Cloud | `product:razor/blueprint/internal-architecture/backtesting-engine`, `product:razor/blueprint/product-model/configuration-management` |
| 6 | The engine runs the backtest exactly as the `backtest-run` flow specifies, injecting the supplied genes instead of deriving a fresh set, and streams the raw result back. | Engine, Kernel | `product:razor/blueprint/internal-architecture/backtesting-engine`, `product:razor/flows/backtest-run` |
| 7 | The Cloud stores the out-of-sample result against the window - run, result, progress and provenance - and repeats steps 2-6 for the next window. | Cloud | `product:razor/blueprint/internal-architecture/cloud-control-plane`, `product:razor/blueprint/internal-architecture/messaging-events` |
| 8 | When the sequence ends, the Cloud renders the comparison the user asked for: in-sample versus out-of-sample per window, from the raw data the engine streamed. | Cloud, Engine | `product:razor/blueprint/product-model/control-monitoring`, `product:razor/blueprint/internal-architecture/report-generation-engine-role` |

## Persisted and Reported

- Every dispatched primitive is an ordinary run, so the Cloud stores each window's optimisation and
  out-of-sample backtest as a run, with its results, progress and provenance
  (`product:razor/blueprint/internal-architecture/cloud-control-plane`).
- The engine persists nothing walk-forward-specific. It keeps only the per-run state its primitives
  already persist - the optimisation population snapshot among them
  (`product:razor/blueprint/engine-technical-blueprint/state-persistence`).
- Generation progress during a window and percent-complete during an out-of-sample backtest are visible
  while they run, through the same command-progress and event channel every run uses
  (`product:razor/blueprint/internal-architecture/messaging-events`,
  `product:razor/blueprint/product-model/control-monitoring`).
- Optimisation cycle-completion events carry a cycle index, which is what lets the Cloud associate a
  window's outcome with its place in the sequence
  (`product:razor/blueprint/internal-architecture/messaging-events`).

## Failure Modes

| Failure | What happens | Specified by |
|---|---|---|
| A window's optimisation is cancelled or faults | The run is ended by `CancelOptimization` or reported `Faulted` to the Cloud; the sequence is the Cloud's to continue, retry or abandon, because the Cloud owns the orchestration. | `product:razor/blueprint/product-model/appendix-a-supported-commands`, `product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery` |
| A window's date range is invalid | The specification's validation rejects it before the primitive runs. | `product:razor/contracts/configuration-reference/execution-specification` |
| The engine restarts between windows | The sequence continues: the next window is a fresh command, and an interrupted optimisation window can be resumed from its persisted state. | `product:razor/blueprint/engine-technical-blueprint/state-persistence`, `product:razor/blueprint/internal-architecture/genetic-optimisation-engine` |
| The Cloud connection drops mid-window | The running primitive continues on the last known configuration; outgoing data is queued and the Cloud queues its next commands until the engine is reachable. | `product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry` |
| A chromosome's backtest cannot fetch its data | That evaluation fails through the adapter path, exactly as in a single backtest; there is no walk-forward-specific handling. | `product:razor/flows/backtest-run`, `product:razor/contracts/configuration-reference/validation-and-exceptions` |
| Determinism is broken | Out-of-sample results stop being reproducible, which defeats the point of the sequence. | `product:razor/cross-cutting/principles/determinism-is-mandatory` |

## Domain References

- `cloud`: `product:razor/blueprint/internal-architecture/cloud-control-plane` - Cloud owns the flow and
  decomposes it into engine primitives.
- `optimisation`: `product:razor/blueprint/internal-architecture/genetic-optimisation-engine`,
  `product:razor/contracts/configuration-reference/optimization-specification` - the in-sample half.
- `backtesting`: `product:razor/blueprint/internal-architecture/backtesting-engine` - the out-of-sample
  half.
- `engine`: `product:razor/blueprint/internal-architecture/configuration-specification-system` - the
  specification set deliberately has no walk-forward fields, because orchestration is Cloud-managed.
- `sdk`: `product:razor/contracts/configuration-reference/gene-attributes`,
  `product:razor/contracts/configuration-reference/strategy-specification` - the genes that move from a
  window into its out-of-sample backtest.
- `reporting`: `product:razor/blueprint/internal-architecture/report-generation-engine-role` - the engine
  streams raw per-window results; the Cloud renders the comparison.

## Undocumented Parts

The window sequence itself - how many windows there are, whether windows are anchored or rolling, how each
window's date range is derived, and whether the sequence stops or continues when a window fails - is not
specified by any document. The only document that names the feature is the forward-looking catalogue entry
in `product:razor/blueprint/future-features/catalog` ("Out-of-Sample Walk-Forward API ... Cloud-orchestrated:
the engine's optimisation and backtest primitives are called in sequence"), and the engine documents only
the primitives. The steps above record only what those documents support; the window policy remains a gap.

## Change Entry Point

Start impact discovery here for anything that changes how a walk-forward sequence is windowed, dispatched,
resumed or reported. The two primitives it composes are the entry points for changes inside a window:
`product:razor/flows/optimisation-run` and `product:razor/flows/backtest-run`.
