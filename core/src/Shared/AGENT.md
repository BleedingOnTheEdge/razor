---
project_name: "shared"
profile: "D"
stack: "dotnet-10"
scope: "shared"
owner: "core-team"
tier_overrides: []
---

# Project Agent Manifest: shared

## 1. Scope & Business Intent
Cross-cutting shared libraries, domain value primitives, JSON serialization converters, cryptographic hashing, and temporal utilities utilized across all .NET backend projects.

## 2. Architectural Profile & Boundaries
- **Profile**: D (Shared Contracts & Utilities)
- **Primary Inputs**: Consumed across all backend assemblies.
- **Allowed Outbound Dependencies**:
  - Zero internal project dependencies (leaf library).
- **Forbidden Dependencies**:
  - Any dependency on `Razor.Cloud`, `Razor.Engine`, `Razor.Kernel`, or `Razor.Sdk`.
  - Concrete database drivers or web frameworks.

## 3. Local Nx Target Delegations
- `nx lint shared` -> `dotnet format --verify-no-changes core/src/Shared/Shared.csproj`
- `nx test shared` -> `dotnet test core/tests/Cloud.UnitTests/Cloud.UnitTests.csproj -c Release`
- `nx build shared` -> `dotnet build core/src/Shared/Shared.csproj -c Release`
- `nx audit shared` -> `dotnet list core/src/Shared/Shared.csproj package --vulnerable`

## 4. Test & Verification Rules
- 95%+ line and branch coverage required under the declared coverage gate.
- Pure unit tests with zero file system or network I/O.
- Strict UTC ISO-8601 parsing and serialization verification.

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | - | - |

## 6. Project Invariants
- Thread-safe utility methods and converters.
- Deterministic JSON serialization formats matching contract schemas.
- Zero mutable shared global state.
