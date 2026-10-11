---
id: product:razor/contracts/lineage-and-reproduction
parent: product:razor/contracts
title: Lineage and Reproduction Contract
level: product
kind: contract
parties: [cloud, engine]
domains: [cloud, engine, reporting, backtesting, optimisation]
flows: [backtest-run, optimisation-run, reporting]
keywords:
  - lineage
  - provenance
  - reproduction
  - fork point
  - intervention
  - run gap
  - replay specification
  - run report
  - ranking
references:
  - product:razor/decisions/intervened-runs-remain-reportable
  - product:razor/blueprint/internal-architecture/cloud-control-plane
  - product:razor/flows/reporting
code_paths:
  - core/src/Cloud/Data/LineageEnums.cs
  - core/src/Cloud/Data/FlowRun.cs
  - core/src/Cloud/Data/RunIntervention.cs
  - core/src/Cloud/Data/RunGap.cs
  - core/src/Cloud/Services/LineageContracts.cs
  - core/src/Cloud/Services/LineageService.cs
  - core/src/Cloud/Services/FlowOrchestrator.cs
  - core/src/Cloud/Services/RunReportService.cs
  - core/src/Cloud/Services/RunRankingService.cs
test_paths:
  - core/tests/Cloud.UnitTests/Lineage/**
  - core/tests/EndToEndTests/EngineE2ETests.cs
---

# Lineage and Reproduction Contract

## Purpose

Defines the formal contracts, data structures, and invariants for tracking execution lineage, recording
interventions, itemizing coverage gaps, reconstructing runs via replay, and enforcing reporting integrity
under `product:razor/decisions/intervened-runs-remain-reportable`.

## Core Enums

### 1. `RunRelation`
Records how a child run relates to its parent along the relation axis:
- `Appended`: Child continues the parent without modification; parent's results stand.
- `Branched`: Child starts afresh from a past fork point; parent is preserved in full and both remain reportable.
- `Spliced`: Child replaces parent's suffix from fork point; composite timeline joins the two.

### 2. `RunContinuity`
Records whether the resulting timeline has coverage discontinuities:
- `Contiguous`: No missing intervals; child continues directly from interruption or fork point.
- `Gapped`: A known period is omitted; gap range and mandatory reason are recorded.

### 3. `RunKind` and `RunStatus`
- `RunKind`: `Backtest`, `Optimization`, `WalkForward`.
- `RunStatus`: `Pending`, `Running`, `Paused`, `Completed`, `Faulted`, `Cancelled`.

## Data Contracts and Schemas

### `ForkPoint`
Identifies the divergence coordinates:
- `Step` (int?, optional): Step index where divergence occurred.
- `Generation` (int?, optional): Optimization generation where divergence occurred.
- `WindowIndex` (int?, optional): Walk-forward analysis window index.

### `InterventionSpecification`
Records a change applied at a checkpoint:
- `StepIndex` (int): Step or generation affected.
- `PreviousFingerprint` (string): State or parameter fingerprint before modification.
- `NewFingerprint` (string): State or parameter fingerprint after modification.
- `Actor` (string): System or operator initiating the change.
- `Reason` (string, mandatory): Business rationale explaining why the intervention occurred.
- `ModificationsSummary` (string?, optional): Human-readable summary of parameter changes.
- `BeforePayloadJson` (string?, optional): Serialized pre-change payload.
- `AfterPayloadJson` (string?, optional): Serialized post-change payload.

### `GapSpecification`
Records an unexecuted interval:
- `StartStep` (int): Beginning step/index of the gap.
- `EndStep` (int): Ending step/index of the gap.
- `Reason` (string, mandatory): Business explanation for why execution was skipped or lost.

### `ReplaySpecification`
Parameters required to deterministically reproduce a diverged composite run:
- `BaseRunId` (Guid): Original run identifier.
- `ForkPoint` (ForkPoint): Point of divergence.
- `Interventions` (IReadOnlyList<InterventionSpecification>): Ordered sequence of recorded interventions.
- `ChildSeed` (long?, optional): Seed applied at fork point.
- `RandomPosition` (string?, optional): RNG sequence position restored at fork point.

Reproduction rule: `replay(baseRunId, forkPoint, interventions, childSeed, randomPosition)` reproduces
identically given deterministic component inputs.

### `RunReport` and Reporting Invariants
Auditable user-facing summary conforming to provenance rules:
- `RunId` (Guid), `ParentRunId` (Guid?), `Relation` (RunRelation?), `Continuity` (RunContinuity?).
- `IsPartial` (bool): Set to `true` whenever gaps are present.
- `HeadlineFiguresSuppressed` (bool): `true` if net profit, return, Sharpe, or drawdown are suppressed.
- `IsDiverged` (bool): `true` when run is branched, spliced, or gapped.
- `IsComparable` (bool): `false` when run has gaps or diverged lineage.
- `DivergenceFlag` (string?): Explicit flag attached to rankings and summaries.
- `Gaps` (IReadOnlyList<ReportGapDetail>): Itemized list with start step, end step, and reason.
- `Aggregates` (ReportAggregateMetrics?): NetProfit, TotalReturn, SharpeRatio, MaxDrawdown, TradeCount, BestFitness.
- `Interventions` (IReadOnlyList<InterventionSpecification>): Full intervention audit log.
- `WarningMessage` (string?): Contextual advisory explaining gap impacts.

## Strict Invariants

1. **Mandatory Reason:** Every intervention and every gap record must carry a non-empty business `Reason`.
2. **Never Emit Whole-Looking Numbers:** Aggregates over gapped runs are strictly marked `partial`. Headline figures are suppressed or flagged as partial, never presented as whole.
3. **Comparability Guard:** Diverged runs (`Branched`, `Spliced`) and `Gapped` runs are flagged in rankings and benchmarks (`RankedRunResult.IsDiverged = true`). Spliced outcomes are never silently ranked alongside clean runs as if equivalent.
4. **Append-Only Intervention Log:** The intervention sequence is strictly append-only; past checkpoints cannot be deleted or mutated.
