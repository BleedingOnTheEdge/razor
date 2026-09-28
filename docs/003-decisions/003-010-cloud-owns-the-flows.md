---
id: product:razor/decisions/cloud-owns-the-flows
parent: product:razor/decisions
title: Cloud Owns the Flows, the Engine Exposes Primitives
level: product
kind: decision
domains: [backtesting, cloud, engine, optimisation]
flows: [backtest-run, optimisation-run, walk-forward-analysis]
keywords:
  - cloud orchestration
  - cloud owns the flows
  - engine primitives
  - simple backtest
  - simple optimisation
  - walk-forward analysis
  - not an engine feature
references:
  - product:razor/blueprint/internal-architecture/cloud-control-plane
  - product:razor/blueprint/internal-architecture/configuration-specification-system
  - product:razor/blueprint/internal-architecture/genetic-optimisation-engine
  - product:razor/blueprint/product-model/control-monitoring
  - product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs
  - product:razor/contracts/configuration-reference/optimization-specification
  - product:razor/contracts/configuration-reference/live-specification
  - product:razor/flows
  - product:razor/flows/backtest-run
  - product:razor/flows/optimisation-run
  - product:razor/flows/walk-forward-analysis
---

# Cloud Owns the Flows, the Engine Exposes Primitives

## Context

The engine is headless and subordinate: it holds no long-term configuration or business logic, and every
operation arrives as a command with its configuration in the payload. That leaves open where a multi-step
analysis - a backtest, an optimisation, or a sequence of optimisation windows followed by out-of-sample
backtests - is actually defined.

## Decision

**Cloud owns the flows.** The simple backtest, the simple optimisation and walk-forward analysis are
Cloud-orchestrated sequences built from engine primitives; they are **not** engine features. The engine
exposes primitives only, and Cloud decomposes each flow into those primitives and tracks the resulting
runs.

**Status: live ruling.**

## Consequences

- The flows are specified as flow documents under `product:razor/flows`, not inside a component's
  blueprint: `product:razor/flows/backtest-run`, `product:razor/flows/optimisation-run` and
  `product:razor/flows/walk-forward-analysis`
  (`product:razor/blueprint/internal-architecture/cloud-control-plane`).
- The engine's specification records deliberately carry no fields for these flows'
  orchestration. `OptimizationSpecification` has "No walk-forward fields (orchestration is
  Cloud-managed)", and `LiveSpecification` had its continuous-optimisation fields removed for the same
  reason (`product:razor/blueprint/internal-architecture/configuration-specification-system`,
  `product:razor/contracts/configuration-reference/live-specification`).
- Fitness is not an engine feature either: there is no `FitnessModel` field, and fitness is computed
  through the `OnFitnessEvaluation` hook
  (`product:razor/contracts/configuration-reference/optimization-specification`,
  `product:razor/blueprint/internal-architecture/genetic-optimisation-engine`).
- The optimiser is a steppable component whose host controls the generation flow
  (`product:razor/blueprint/internal-architecture/genetic-optimisation-engine`).
- The dashboard is where orchestration becomes visible: commands, progress and results
  (`product:razor/blueprint/product-model/control-monitoring`).
- Scheduling that triggers a flow is the Cloud's, not the engine's
  (`product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs`).

## Reasoning the Documents Give

- `product:razor/blueprint/internal-architecture/cloud-control-plane` states it as a scope rule: Cloud
  "orchestrates flows by decomposing them into engine primitive operations and tracking the resulting
  runs. The simple backtest, simple optimisation and walk-forward analysis flows are specified as flow
  documents under `product:razor/flows`, not as engine features; the engine exposes only the primitives
  each flow is built from."
- The specification documents corroborate it by removing or never adding the orchestration fields, which
  is why a walk-forward sequence cannot be expressed as engine configuration
  (`product:razor/blueprint/internal-architecture/configuration-specification-system`).
- The engine's own design reasons are that it is stateless and subordinate, and that configuration
  travels with each command (`product:razor/blueprint/product-model/control-monitoring`).

## Alternatives Considered

Not recorded. No document describes an alternative in which a simple backtest, a simple optimisation or
walk-forward analysis is an engine feature; the specification documents state the absence of those fields
as a fact rather than as a choice between options.
