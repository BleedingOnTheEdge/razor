---
title: "Reporting Integrity, Genuine Telemetry, and Clean Empty States"
author: "sinavali"
created_date: "2026-10-31"
target_branch: "feat/reporting-integrity-and-clean-states"
risk_level: "MEDIUM"
affected_projects:
  - "core"
  - "frontends"
  - "docs"
---

# Change Surface: Reporting Integrity, Genuine Telemetry, and Clean Empty States

## 1. Intent & Business Rationale
Ensure 100% financial and telemetry data integrity Monorepo-wide:
- Eliminate synthetic optimization loops, Random(seed) mock trades, and Math.Sin equity curves in `RunReportService.cs` (Issue #105). Missing telemetry returns clean empty collections with `IsPartial = true` and `ReportGapDetail`.
- Eliminate fabricated walk-forward metrics and formulas in `windows/page.tsx` and `windows/[windowIndex]/page.tsx`, displaying authentic empty states when telemetry is absent (Issue #106).
- Remove hardcoded `DEFAULT_OPEN_POSITIONS` and `DEFAULT_EXECUTED_TRADES` from `LiveManagerContent.tsx`, displaying authentic idle status (Issue #107).
- Align documentation and API for report export, declaring XLSX and JSON as supported in v1.0, returning HTTP 501 for PDF export, and scheduling PDF for v1.5 (Issue #108).

## 2. Affected Monorepo Projects
- `core`
- `frontends`
- `docs`

## 3. Code Surface
### Modified Files
- `core/src/Cloud/Endpoints/ExportRunReportPdfEndpoint.cs`
- `core/src/Cloud/Services/RunReportService.cs`
- `core/tests/Cloud.UnitTests/ExportRunReportEndpointsTests.cs`
- `core/tests/Cloud.UnitTests/Lineage/RunReportServiceTests.cs`
- `docs/002-blueprint/002-001-project-overview/002-001-020-market-and-business.md`
- `docs/002-blueprint/002-010-product-model/002-010-060-control-monitoring.md`
- `docs/003-decisions/003-030-reporting-is-complete-and-permanent.md`
- `docs/007-flows/007-070-reporting.md`
- `frontends/apps/cloud-dashboard/src/app/panel/reports/[id]/windows/[windowIndex]/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/panel/reports/[id]/windows/page.tsx`
- `frontends/apps/cloud-dashboard/src/components/live/LiveManagerContent.tsx`

## 4. Test Surface
### Unit & Integration Suites
- `core/tests/Cloud.UnitTests/Lineage/RunReportServiceTests.cs`
- `core/tests/Cloud.UnitTests/ExportRunReportEndpointsTests.cs`
- `core/tests/Cloud.UnitTests`
- `frontends/apps/cloud-dashboard`

## 5. Invariants
- No synthetic or pseudo-random trades or curves may ever be generated in production reporting services.
- If run telemetry is missing, `IsPartial` must be flagged and empty collections returned.
- Live trading management UI must display honest live state, never hardcoded mock positions.
- PDF export endpoint must return 501 Not Implemented with a roadmap disclaimer.

## 6. Risk Matrix
- Rollback: Clean git revert.
- Blast radius bounded strictly to declared Code Surface.
