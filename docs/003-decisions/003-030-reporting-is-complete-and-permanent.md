---
id: product:razor/decisions/reporting-is-complete-and-permanent
parent: product:razor/decisions
title: Reporting Is Complete and Permanent
level: product
kind: decision
domains: [cloud, engine, reporting]
flows: [reporting]
keywords:
  - reporting
  - every run
  - every result
  - progress
  - retention
  - permanent
  - fully granular
  - raw data
references:
  - product:razor/blueprint/internal-architecture/cloud-control-plane
  - product:razor/blueprint/internal-architecture/report-generation-engine-role
  - product:razor/blueprint/internal-architecture/messaging-events
  - product:razor/blueprint/internal-architecture/telemetry-observability
  - product:razor/blueprint/engine-technical-blueprint/logging-and-telemetry
  - product:razor/blueprint/engine-technical-blueprint/behavior-recorder
  - product:razor/blueprint/product-model/control-monitoring
  - product:razor/flows/reporting
---

# Reporting Is Complete and Permanent

## Context

Every engine operation - a backtest, an optimisation, a live session - produces data a user may later need
to inspect, compare or prove. The engine is deliberately thin and holds no product state, so where that
data lives and how complete it must be is a product ruling rather than an implementation detail.

## Decision

**Reporting is non-negotiable and fully granular: everything, forever.** Every run, every result and every
progress record is reportable. Nothing a run produces is outside the reporting surface, and progress is
reportable while a run is still in flight, not only once it completes.

**Status: live ruling.**

## Consequences

- The Cloud is the store for everything a user can report on: "runs, results, progress, reports and
  provenance"
  (`product:razor/blueprint/internal-architecture/cloud-control-plane`).
- The engine's role is to stream raw result data - `BacktestCompletedEvent`, `OptimizationGenerationEvent`,
  `OptimizationCycleCompletedEvent`, `LiveSessionEndedEvent` and command progress - and to expose
  per-target snapshots on request (`GetLiveState`, `GetOptimizationState`, `GetBacktestResult`); it never
  renders a formatted report
  (`product:razor/blueprint/internal-architecture/report-generation-engine-role`,
  `product:razor/blueprint/internal-architecture/messaging-events`).
- Users generate reports on demand or configure periodic generation, from data the Cloud already holds, in
  formats including Excel, JSON and PDF
  (`product:razor/blueprint/product-model/control-monitoring`).
- Progress is part of the surface: percent complete for a backtest, generation and best fitness for an
  optimisation, equity and drawdown for live
  (`product:razor/blueprint/product-model/control-monitoring`).
- Logs and metrics are reportable through the same channel: `GetLogs` transfers log files on demand, and
  `GetMetrics` / `ExportMetrics` expose OpenTelemetry metrics
  (`product:razor/blueprint/engine-technical-blueprint/logging-and-telemetry`,
  `product:razor/blueprint/internal-architecture/telemetry-observability`).
- Behaviour records are reportable too, uploaded periodically rather than kept on the client's disk
  (`product:razor/blueprint/engine-technical-blueprint/behavior-recorder`).
- The whole surface is the `reporting` flow (`product:razor/flows/reporting`).

## Reasoning the Documents Give

- `product:razor/blueprint/internal-architecture/cloud-control-plane` gives the verbatim list of what is
  stored - runs, results, progress, reports and provenance - which is the granularity half of the ruling.
- `product:razor/blueprint/internal-architecture/report-generation-engine-role` gives the architectural
  reason for the split: the engine's role is limited to streaming raw data, because the Cloud is what
  renders.
- `product:razor/blueprint/product-model/control-monitoring` states the split as deliberate - "This split
  is deliberate: it keeps the engine thin and keeps report format an evolving server-side concern" - which
  is why completeness is a Cloud property rather than an engine feature, and gives the product reason:
  all result data is stored in the Cloud so users can generate reports whenever they want them, on demand
  or on a schedule.

**Not recorded in `docs/`:** the permanence half of the ruling. No document in the tree bounds retention
or states that data is kept indefinitely; the word "forever" and any retention guarantee for the Cloud's
store appear in no `docs/` document. The reverse is stated for the engine only - behaviour-log files are
deleted after a successful upload - so the permanence requirement is a gap.

## Alternatives Considered

Not recorded. No document weighs retaining less than everything, or bounding retention; the only retention
choice documented is the engine-local one for behaviour logs, which is stated as a fact rather than a
considered alternative.
