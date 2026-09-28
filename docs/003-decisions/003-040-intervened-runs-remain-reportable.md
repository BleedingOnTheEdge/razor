---
id: product:razor/decisions/intervened-runs-remain-reportable
parent: product:razor/decisions
title: Intervened and Resumed Runs Stay Reportable with Provenance
level: product
kind: decision
domains: [backtesting, cloud, engine, optimisation, reporting]
flows: [optimisation-run, live-trading-session, reporting]
keywords:
  - provenance
  - intervened run
  - diverged run
  - resumed run
  - gap
  - override
  - injected genes
  - mid-flight change
references:
  - product:razor/blueprint/internal-architecture/cloud-control-plane
  - product:razor/blueprint/internal-architecture/genetic-optimisation-engine
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
  - product:razor/blueprint/product-model/appendix-a-supported-commands
  - product:razor/blueprint/product-model/user-workflows
  - product:razor/cross-cutting/principles/determinism-is-mandatory
  - product:razor/flows/optimisation-run
  - product:razor/flows/live-trading-session
  - product:razor/flows/reporting
---

# Intervened and Resumed Runs Stay Reportable with Provenance

## Context

A run does not always go from start to finish untouched. An optimisation can be paused and resumed, or
have its genes injected into a live session mid-flight; a run can be resumed from an earlier point; and
either intervention means the run's history is not a single unbroken sequence.

## Decision

**An intervened or diverged run is always reportable with provenance.** A run whose parameters were
changed mid-flight, or that was resumed from an earlier point, must remain reportable; its gap or override
is recorded rather than hidden. **A gapped run must never emit whole-looking numbers.**

**Status: live ruling.**

## Consequences

- Provenance is stored alongside everything else the Cloud keeps: "runs, results, progress, reports and
  provenance" (`product:razor/blueprint/internal-architecture/cloud-control-plane`).
- Resume must be exact rather than approximate: the optimiser's state is a serialisable snapshot of the
  entire population, restored by `LoadState()` and invalidated by `InvalidateFitness()` if the evaluation
  data changed (`product:razor/blueprint/internal-architecture/genetic-optimisation-engine`).
- Exact resumption is a determinism requirement, not a convenience: the portable RNG "must be serialisable
  so that optimisation state can be saved and resumed exactly", because a generator seeded from the master
  seed alone cannot be resumed
  (`product:razor/cross-cutting/principles/determinism-is-mandatory`).
- The command surface supports intervention: `PauseOptimization`, `ResumeOptimization`,
  `GetOptimizationState`, and `InjectGenes` on a running live session
  (`product:razor/blueprint/product-model/appendix-a-supported-commands`).
- Injection into a live session is a normal product path, not an exception: after an optimisation the
  Cloud pushes the new genes to the running live engine on user approval or automatic timeout
  (`product:razor/blueprint/product-model/user-workflows`).
- State snapshots are what make a resumed run possible in the first place: `OptimizationStates` and
  `LiveState` in local SQLite, and the Cloud is the source of truth when the two disagree
  (`product:razor/blueprint/engine-technical-blueprint/state-persistence`).
- The flows most exposed to intervention are `product:razor/flows/optimisation-run` and
  `product:razor/flows/live-trading-session`; their outcomes reach the user through
  `product:razor/flows/reporting`.

## Reasoning the Documents Give

- `product:razor/blueprint/internal-architecture/cloud-control-plane` records that provenance is stored,
  which is the mechanism the ruling depends on.
- `product:razor/blueprint/internal-architecture/genetic-optimisation-engine` gives the resume mechanism -
  a deep clone of the population plus the invalidation rule - and
  `product:razor/cross-cutting/principles/determinism-is-mandatory` gives the reason it must be exact:
  the portable RNG "must be serialisable so that optimisation state can be saved and resumed exactly",
  because a seed alone does not describe a position in a sequence. The same distinction is stated in the
  code itself (`core/src/Sdk/Shared/CustomizedRandom.cs` captures and restores the generator's position
  for exactly this reason), which is not a `docs/` node.
- `product:razor/blueprint/product-model/user-workflows` shows mid-flight gene injection to a live
  strategy is an intended workflow, which is why an intervened run cannot be treated as an anomaly.

**Not recorded in `docs/`:** the recording rule itself. No document in the tree states that a gap or an
override must be *recorded rather than hidden*, and no document states that a gapped run must not emit
whole-looking numbers. Provenance is documented as something the Cloud stores; what an intervention must
do to a report is not. The specific provenance of a mid-flight `InjectGenes` - what is recorded, and how a
user sees that a run was overridden - is likewise undocumented.

## Alternatives Considered

Not recorded. No document weighs hiding an intervention, restarting a run instead of resuming it, or
reporting a gapped run as if it were whole.
