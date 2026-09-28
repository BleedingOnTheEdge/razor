---
id: product:razor/decisions/coverage-gate-is-ninety-five-percent
parent: product:razor/decisions
title: The Coverage Gate Is 95 Percent Line and Branch on a Declared Scope
level: product
kind: decision
domains: [engine, operations]
keywords:
  - coverage
  - coverage gate
  - 95 percent
  - line coverage
  - branch coverage
  - declared scope
  - CI
  - build.yml
references:
  - product:razor/cross-cutting/principles/enforcement
  - product:razor/cross-cutting/principles/testing-determinism-verification
  - product:razor/blueprint/engine-technical-blueprint/testing-strategy
  - product:razor/cross-cutting/principles/determinism-is-mandatory
---

# The Coverage Gate Is 95 Percent Line and Branch on a Declared Scope

## Context

The repository builds and tests in CI, and a coverage number is only meaningful if it is measured the
same way every time and enforced rather than reported.

## Decision

**Coverage in this project is 95% line and branch on a declared scope, enforced in CI.** Both floors must
be met on the declared assemblies; the gate fails the build when either rate is below its floor.

**Status: live ruling.**

## Consequences

- The gate is enforced by the repository's CI workflow and by a coverage-gate script invoked with
  `--min-line 95 --min-branch 95` and an explicit declared scope, alongside the .NET steps that run from
  `core/`. The declared scope is `Sdk Shared Cloud`; everything instrumented is merged, measured and
  printed, but the floors apply only to the declared assemblies, with out-of-scope assemblies named in the
  summary.
- Two assemblies, `Kernel` and `Engine`, are currently outside the declared scope because they have no
  test project of their own; issue #4 adds both. The declared scope is therefore a moving set, which is
  why the ruling names a declared scope rather than "the solution".
- Enforcement is not only coverage: a static-analysis step in CI verifies adherence to the principles
  where it is automatable, and a golden determinism test is a CI gate
  (`product:razor/cross-cutting/principles/enforcement`).
- Reproducibility is what makes the gate meaningful: the test levels must be deterministic, "the same
  inputs produce the same results, which is what makes a failure meaningful"
  (`product:razor/blueprint/engine-technical-blueprint/testing-strategy`,
  `product:razor/cross-cutting/principles/determinism-is-mandatory`).
- The gate complements the verification levels the engine documents - unit, integration, cross-project and
  performance/load - rather than replacing any of them
  (`product:razor/blueprint/engine-technical-blueprint/testing-strategy`).

## Reasoning the Documents Give

- `product:razor/cross-cutting/principles/enforcement` gives the process reason: pull requests that
  contradict the principles are rejected, and the checks that can be automated are gates in CI.
- `product:razor/blueprint/engine-technical-blueprint/testing-strategy` gives the quality reason: the four
  test levels exist to answer different questions, and their determinism is what makes a failure
  informative.
- `product:razor/cross-cutting/principles/testing-determinism-verification` carries the verification
  mandate the gate enforces.

**Not recorded in `docs/`:** the threshold and the declared scope. The number 95, the "line and branch"
pair, and the declared scope `Sdk Shared Cloud` are recorded in the repository router `AGENT.md` (its
"Continuous integration and coverage" section, which also names `CONTRIBUTING_AGENTS.md`, Definition of
Done item 4, as the agreement) and in the CI configuration itself. Neither `AGENT.md` nor
`CONTRIBUTING_AGENTS.md` is a node in the `docs/` graph - `AGENT.md` sits at the repository root and
`CONTRIBUTING_AGENTS.md` at the org root - so this decision cannot link them by id.

## Alternatives Considered

Not recorded. No document weighs a different threshold, a single line-or-branch floor, or a
whole-solution scope against the declared-scope gate.
