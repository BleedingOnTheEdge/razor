---
project_name: "sdk"
profile: "D"
stack: "dotnet-10"
scope: "shared"
owner: "sdk-team"
tier_overrides: []
---

# Project Agent Manifest: sdk

## 1. Scope & Business Intent
Public SDK abstractions, developer interfaces, broker contracts, indicator definitions, and strategy base types for the Razor ecosystem.

## 2. Architectural Profile & Boundaries
- **Profile**: D (Shared Contracts & Platform SDK)
- **Primary Inputs**: Consumed by external developers, strategy plugins, and internal core services.
- **Allowed Outbound Dependencies**:
  - `Razor.Shared`
- **Forbidden Dependencies**:
  - Infrastructure libraries (EF Core, ASP.NET, concrete database drivers).
  - Internal engine or kernel implementation details.

## 3. Local Nx Target Delegations
- `nx lint sdk` -> `dotnet format --verify-no-changes core/src/Sdk/Sdk.csproj`
- `nx test sdk` -> `dotnet test core/tests/Sdk.UnitTests/Sdk.UnitTests.csproj -c Release`
- `nx build sdk` -> `dotnet build core/src/Sdk/Sdk.csproj -c Release`
- `nx audit sdk` -> `dotnet list core/src/Sdk/Sdk.csproj package --vulnerable`

## 4. Test & Verification Rules
- 95%+ line and branch coverage enforced strictly by `coverage_gate.py` (`core/tests/Sdk.UnitTests`, `core/tests/Sdk.IntegrationTests`).
- Comprehensive regression testing for all public interface contracts.
- Deterministic behavior across all indicator and math primitives.

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | - | - |

## 6. Project Invariants
- Strict SemVer backward compatibility across all public interfaces and contracts.
- Value objects and contract DTOs are immutable once instantiated.
- Zero external runtime I/O inside pure SDK calculations.
