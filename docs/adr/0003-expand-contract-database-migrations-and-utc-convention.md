---
id: "ADR-0003"
title: "Expand/Contract Database Migrations and UTC Storage Convention"
status: "Accepted"
date: "2026-10-13"
deciders:
  - "Razor Enterprise Architecture Team"
  - "Antigravity OS Orchestrator"
affected_projects:
  - "core/src/Cloud"
  - "core/src/Engine"
tier_override: false
---

# ADR-0003: Expand/Contract Database Migrations and UTC Storage Convention

## 1. Context and Problem Statement
Database changes in production environments must support rolling, zero-downtime deployments. Abrupt breaking schema modifications (such as dropping columns or adding non-nullable columns without defaults) disrupt active user traffic. Furthermore, cross-timezone trading operations demand absolute temporal consistency.

## 2. Decision Drivers
- Tier 1 Inviolable: Zero-Downtime Expand/Contract Database Migration Protocol.
- Tier 1 Inviolable: UTC Storage Convention across all tables, events, and API boundaries.
- Support for distributed blue/green and canary deployments.

## 3. Considered Options
- **Option 1: Phased Expand/Contract with UTC ISO-8601 Convention**: Schema evolution proceeds through Expand, Dual-Write, Backfill, Read Switch, and Contract phases. All timestamps stored as `TIMESTAMPTZ` / UTC ISO-8601.
- **Option 2: Direct In-Place Migrations with Local Time**: High risk of deployment downtime, data loss, and timezone ambiguity in trade execution.

## 4. Decision Outcome
**Chosen Option**: Option 1. All schema migrations must strictly follow the 5-phase Expand/Contract model. All timestamps at rest, in flight, and in calculation must use UTC.

## 5. Consequences
### Positive Consequences
- Zero deployment downtime during database migrations.
- Complete deterministic timeline across engine telemetry, orders, and cloud events.

### Negative Consequences / Trade-Offs
- Multi-step migration planning required for schema modifications.

## 6. Compliance & Verification Strategy
- **Automated Verification**: Audit dimension 4 (Checks 4.4 and 4.6) verifies UTC timestamps and expand/contract patterns.
- **Test Implementation**: Integration tests verify dual-compatibility across version transitions.
