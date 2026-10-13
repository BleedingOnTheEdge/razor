---
project_name: "api-client"
profile: "D"
stack: "node-ts-20"
scope: "shared"
owner: "frontend-team"
tier_overrides: []
---

# Project Agent Manifest: api-client

## 1. Scope & Business Intent
Strongly-typed HTTP and WebSocket client package providing uniform API consumption, automated JWT token handling, backoff retries, and error normalizing for Razor Cloud.

## 2. Architectural Profile & Boundaries
- **Profile**: D (Shared Contracts & Client SDK)
- **Primary Inputs**: Consumed by `cloud-dashboard` and `marketplace`.
- **Allowed Outbound Dependencies**:
  - `@razor/contracts`
- **Forbidden Dependencies**:
  - Presentation components, React state, or UI kit dependencies.
  - Hardcoded API credentials or environments.

## 3. Local Nx Target Delegations
- `nx lint api-client` -> `pnpm --filter @razor/api-client lint`
- `nx test api-client` -> `pnpm --filter @razor/api-client test`
- `nx build api-client` -> `pnpm --filter @razor/api-client build`
- `nx audit api-client` -> `pnpm audit --filter @razor/api-client`

## 4. Test & Verification Rules
- Modular schema and client architecture with all files under 800 lines ceiling.
- Strict type checking (`tsc --noEmit`).
- Exponential retry and circuit breaker logic tests.

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | - | - |

## 6. Project Invariants
- All network errors mapped to structured, strongly typed domain error representations.
- Zero embedded API keys or fallback production secrets in source code.
- Automatic header injection of correlation IDs for distributed tracing.
