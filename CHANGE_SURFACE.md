---
title: "Monorepo Audit Pass: Empty Catch Remediations and Tooling Calibration"
author: "sinavali"
created_date: "2026-10-31"
target_branch: "main"
risk_level: "LOW"
affected_projects:
  - "core"
  - "scripts"
---

# Change Surface: Monorepo Audit Pass: Empty Catch Remediations and Tooling Calibration

## 1. Intent & Business Rationale
Finalize the Monorepo overhaul with 10-dimension audit clean pass:
- Remediate bare and empty catch blocks in core Engine and Kernel services.
- Calibrate subproject-relative directory depth calculation in `scripts/audit-runner.py`.

## 2. Affected Monorepo Projects
- `core`
- `scripts`

## 3. Code Surface
### Modified Files
- `CHANGE_SURFACE.md`
- `core/src/Engine/Communication/BinaryTransferManager.cs`
- `core/src/Engine/Communication/CloudConnector.cs`
- `core/src/Engine/Services/Update/SelfUpdateManager.cs`
- `core/src/Kernel/Brokers/LiveBroker.Session.cs`
- `scripts/audit-runner.py`

## 4. Test Surface
### Unit & Integration Suites
- `core/tests/Kernel.UnitTests`
- `core/tests/Engine.UnitTests`

## 5. Invariants
- Zero bare or empty catch blocks swallowing unhandled exceptions.
- 10-dimension audit achieves 100% PASS with 0 blocking defects.

## 6. Risk Matrix
- Rollback: Clean git revert.
- Blast radius strictly bounded to declared Code Surface.
