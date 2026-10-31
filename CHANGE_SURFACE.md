---
title: "Database Concurrency, Test Security, and Operational Foundations"
author: "sinavali"
created_date: "2026-10-31"
target_branch: "feat/database-concurrency-and-multi-tenancy"
risk_level: "MEDIUM"
affected_projects:
  - "core"
  - "docs"
---

# Change Surface: Database Concurrency, Test Security, and Operational Foundations

## 1. Intent & Business Rationale
Implement optimistic concurrency tokens across mutable database entities, eliminate static credentials, and author operational specifications:
- Add `RowVersion` optimistic concurrency tokens to `Account`, `EngineInstance`, `FlowRun`, and `License` using EF Core concurrency token mapping and a zero-downtime migration (Issue #97).
- Eliminate static hardcoded test passwords in `CloudTestDatabase.cs` to satisfy EP-OS secret scanning rules (Issue #98).
- Author operational runbooks for `cloud-dashboard` and `marketplace` detailing triage and rollback procedures (Issue #99).
- Create Service Level Objective (SLO) definitions under `docs/slo/` validated against EP-OS schema (Issue #100).

## 2. Affected Monorepo Projects
- `core`
- `docs`

## 3. Code Surface
### Modified Files
- `core/src/Cloud/Data/Account.cs`
- `core/src/Cloud/Data/CloudDbContext.cs`
- `core/src/Cloud/Data/EngineInstance.cs`
- `core/src/Cloud/Data/FlowRun.cs`
- `core/src/Cloud/Data/License.cs`
- `core/src/Cloud/Migrations/20261031120000_AddOptimisticConcurrencyTokens.Designer.cs`
- `core/src/Cloud/Migrations/20261031120000_AddOptimisticConcurrencyTokens.cs`
- `core/tests/Cloud.UnitTests/DatabaseSchemaCompatibilityTests.cs`
- `core/tests/Cloud.UnitTests/EngineLifecycleTests.cs`
- `core/tests/Cloud.UnitTests/TestSupport/CloudTestDatabase.cs`
- `docs/runbooks/cloud-dashboard.md`
- `docs/runbooks/marketplace.md`
- `docs/slo/cloud-api.slo.yaml`
- `docs/slo/cloud-dashboard.slo.yaml`
- `docs/slo/marketplace.slo.yaml`

## 4. Test Surface
### Unit & Integration Suites
- `core/tests/Cloud.UnitTests/DatabaseSchemaCompatibilityTests.cs`
- `core/tests/Cloud.UnitTests`
- `scripts/ep.py slo`
- `scripts/ep.py migration check`

## 5. Invariants
- Zero-downtime Expand/Contract schema changes strictly observed.
- Zero plaintext credentials or hardcoded secret strings in source code.
- Concurrency tokens rotated automatically on entity updates.

## 6. Risk Matrix
- Rollback: Revert commits via standard git rollback.
- Blast radius bounded strictly to declared Code Surface.
