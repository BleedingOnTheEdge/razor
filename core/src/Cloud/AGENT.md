---
project_name: "cloud"
profile: "A"
stack: "dotnet-10"
scope: "backend"
owner: "cloud-team"
tier_overrides: []
---

# Project Agent Manifest: cloud

## 1. Scope & Business Intent
Cloud backend service for the Razor trading ecosystem. Responsible for instance registration, authentication and session tokens, heartbeat telemetry aggregation, command dispatch orchestration, and external API gateways.

## 2. Architectural Profile & Boundaries
- **Profile**: A (Backend & Core Services: Hexagonal / DDD)
- **Primary Inputs**: Inbound FastEndpoints REST endpoints, WebSocket telemetry channels.
- **Allowed Outbound Dependencies**:
  - `Razor.Shared`
  - `Razor.Sdk`
  - Ephemeral PostgreSQL database
- **Forbidden Dependencies**:
  - Direct references to frontend libraries or web client bundles.
  - In-memory SQLite emulators for integration testing (Tier 1 Inviolable).
  - Bypass of domain encapsulation layers.

## 3. Local Nx Target Delegations
- `nx lint cloud` -> `dotnet format --verify-no-changes core/src/Cloud/Cloud.csproj`
- `nx test cloud` -> `dotnet test core/tests/Cloud.UnitTests/Cloud.UnitTests.csproj -c Release`
- `nx build cloud` -> `dotnet build core/src/Cloud/Cloud.csproj -c Release`
- `nx audit cloud` -> `dotnet list core/src/Cloud/Cloud.csproj package --vulnerable`

## 4. Test & Verification Rules
- Unit tests run fast, in-process, mock-free for domain calculations (`core/tests/Cloud.UnitTests`).
- Integration tests execute against real PostgreSQL containers or validated relational providers.
- Strict UTC ISO-8601 timestamps enforced across all persisted entity models and API payloads (Tier 1 Inviolable).
- 95%+ line and branch coverage required under the declared coverage gate.

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | - | - |

## 6. Project Invariants
- All engine instances must authenticate via cryptographically verified API keys or instance tokens.
- All database migrations follow the Expand/Contract zero-downtime standard.
- Telemetry ingest handlers are idempotent and gracefully discard out-of-order duplicates.
