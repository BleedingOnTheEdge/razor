---
project_name: "engine"
profile: "A"
stack: "dotnet-10"
scope: "backend"
owner: "engine-team"
tier_overrides:
  - rule: "engine-coverage-staged-scope"
    adr_reference: "docs/adr/0005-kernel-engine-coverage-shortfall-and-convergence.md"
    justification: "Engine coverage convergence is tracked in ADR-0005 with dedicated test suites expanding toward 95% threshold"
---

# Project Agent Manifest: engine

## 1. Scope & Business Intent
Trading execution engine orchestrating trading strategy lifecycles, task management, risk checks, order routing, state recovery, and bi-directional communication between the Kernel and Cloud control plane.

## 2. Architectural Profile & Boundaries
- **Profile**: A (Backend & Core Services: Hexagonal / DDD)
- **Primary Inputs**: Inbound commands from CloudConnector, CLI orchestration commands, Kernel state change events.
- **Allowed Outbound Dependencies**:
  - `Razor.Kernel`
  - `Razor.Sdk`
  - `Razor.Shared`
- **Forbidden Dependencies**:
  - Direct UI or presentation dependencies.
  - Tight coupling to concrete transport protocols outside communication adapters.

## 3. Local Nx Target Delegations
- `nx lint engine` -> `dotnet format --verify-no-changes core/src/Engine/Engine.csproj`
- `nx test engine` -> `dotnet test core/tests/Engine.UnitTests/Engine.UnitTests.csproj -c Release`
- `nx build engine` -> `dotnet build core/src/Engine/Engine.csproj -c Release`
- `nx audit engine` -> `dotnet list core/src/Engine/Engine.csproj package --vulnerable`
- `nx publish engine` -> `node scripts/build-engine.mjs`

## 4. Test & Verification Rules
- Unit tests verify task lifecycle transitions, command dispatching, and state management (`core/tests/Engine.UnitTests`).
- Integration tests verify full subsystem coordination (`core/tests/Engine.IntegrationTests`).
- In-memory database emulators are forbidden (Tier 1 Inviolable).
- All timestamps exchanged with Kernel and Cloud must be UTC ISO-8601 (Tier 1 Inviolable).

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| Engine Coverage Staged Scope | Tracked coverage convergence roadmap under ADR-0005 while maintaining full passing test suites | `docs/adr/0005-kernel-engine-coverage-shortfall-and-convergence.md` |

## 6. Project Invariants
- Exactly one active EngineId per runtime instance managed by `IStateManager`.
- Non-blocking order execution pipeline ensures market orders are dispatched within defined latency ceilings.
- State persistence occurs before acknowledging task execution completion.
