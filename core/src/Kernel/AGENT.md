---
project_name: "kernel"
profile: "A"
stack: "dotnet-10"
scope: "backend"
owner: "kernel-team"
tier_overrides:
  - rule: "kernel-coverage-staged-scope"
    adr_reference: "docs/adr/0005-kernel-engine-coverage-shortfall-and-convergence.md"
    justification: "Kernel coverage convergence is tracked in ADR-0005 with dedicated test suites expanding toward 95% threshold"
---

# Project Agent Manifest: kernel

## 1. Scope & Business Intent
High-performance core matching engine, broker connectivity abstraction (`LiveBroker`, `SimulatedBroker`), tick distribution, position tracking, and real-time risk evaluation.

## 2. Architectural Profile & Boundaries
- **Profile**: A (Backend & Core Services: Hexagonal / DDD)
- **Primary Inputs**: Tick feeds, market depth data, broker trade execution callbacks, order requests from Engine.
- **Allowed Outbound Dependencies**:
  - `Razor.Sdk`
  - `Razor.Shared`
- **Forbidden Dependencies**:
  - Web frameworks, UI packages, or cloud transport connectors.
  - Unmanaged I/O within the core matching loop.

## 3. Local Nx Target Delegations
- `nx lint kernel` -> `dotnet format --verify-no-changes core/src/Kernel/Kernel.csproj`
- `nx test kernel` -> `dotnet test core/tests/Kernel.UnitTests/Kernel.UnitTests.csproj -c Release`
- `nx build kernel` -> `dotnet build core/src/Kernel/Kernel.csproj -c Release`
- `nx audit kernel` -> `dotnet list core/src/Kernel/Kernel.csproj package --vulnerable`

## 4. Test & Verification Rules
- Unit tests verify order book dynamics, risk limits, matching logic, and broker states (`core/tests/Kernel.UnitTests`).
- Simulation tests verify deterministic order matching against synthetic market ticks.
- All time-series ticks and trade records must use UTC timestamps (Tier 1 Inviolable).

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| Kernel Coverage Staged Scope | Tracked coverage convergence roadmap under ADR-0005 while maintaining full passing test suites | `docs/adr/0005-kernel-engine-coverage-shortfall-and-convergence.md` |

## 6. Project Invariants
- Sub-millisecond tick processing dispatch latency.
- Thread-safe order book updates and position calculations.
- Risk checks must execute atomically prior to order placement submission.
