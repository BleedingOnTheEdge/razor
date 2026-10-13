---
id: "ADR-0001"
title: "Monorepo Task Orchestration via Nx and Enterprise Governance"
status: "Accepted"
date: "2026-10-13"
deciders:
  - "Razor Enterprise Architecture Team"
  - "Antigravity OS Orchestrator"
affected_projects:
  - "core/src/Cloud"
  - "core/src/Engine"
  - "core/src/Kernel"
  - "core/src/Sdk"
  - "core/src/Shared"
  - "frontends/apps/cloud-dashboard"
  - "frontends/apps/marketplace"
  - "frontends/packages/contracts"
  - "frontends/packages/api-client"
  - "frontends/packages/ui-kit"
tier_override: false
---

# ADR-0001: Monorepo Task Orchestration via Nx and Enterprise Governance

## 1. Context and Problem Statement
The Razor platform comprises polyglot systems spanning high-performance .NET execution engines (Kernel, Engine, Cloud, Sdk, Shared) and Next.js / TypeScript web applications and libraries (Cloud Dashboard, Marketplace, Contracts, API Client, UI Kit). Prior to this decision, task execution was disparate across package managers and subdirectories without unified DAG dependency management or affected task tracking.

## 2. Decision Drivers
- Need for deterministic polyglot monorepo management under a single root orchestrator.
- Deterministic CI task graph with caching for `lint`, `test`, `build`, and `audit`.
- Elimination of divergent build scripts and uncoordinated release cycles.
- Alignment with Prime Directive P1 (Deterministic Monorepo Orchestration).

## 3. Considered Options
- **Option 1: Nx Root Orchestration with Polyglot Delegation via `nx:run-commands`**: Unified DAG orchestrator with standard target contracts across .NET and TypeScript.
- **Option 2: Standalone Shell Scripts**: Separate Makefile/Bash scripts per folder without caching or dependency graph.
- **Option 3: Turborepo**: JS/TS focused orchestrator with limited non-Node polyglot support.

## 4. Decision Outcome
**Chosen Option**: Option 1 (Nx Root Orchestration). Every subproject defines a `project.json` implementing the four mandatory target contracts: `lint`, `test`, `build`, and `audit`. Nx coordinates distributed task execution and incremental caching.

## 5. Consequences
### Positive Consequences
- Single entry point for monorepo validation (`pnpm nx run-many -t lint/test/build/audit`).
- Deterministic affected task execution (`nx affected`).
- Structural standardization verified by `scripts/verify-nx-targets.py`.

### Negative Consequences / Trade-Offs
- Requires root `package.json` and Node.js toolchain even when developing solely on .NET components.

## 6. Compliance & Verification Strategy
- **Automated Verification**: `python3 scripts/verify-nx-targets.py` mechanically scans all `project.json` files.
- **Test Implementation**: CI workflow runs `nx affected --target=lint/test/build/audit`.
