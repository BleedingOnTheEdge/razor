---
project_name: "contracts"
profile: "D"
stack: "node-ts-20"
scope: "shared"
owner: "frontend-team"
tier_overrides: []
---

# Project Agent Manifest: contracts

## 1. Scope & Business Intent
TypeScript domain interfaces, Zod runtime schemas, API data transfer contracts, and shared domain models consumed by frontend applications and the API client.

## 2. Architectural Profile & Boundaries
- **Profile**: D (Shared Contracts & Types)
- **Primary Inputs**: Consumed across all web apps and packages.
- **Allowed Outbound Dependencies**:
  - Zero internal dependencies (leaf package).
- **Forbidden Dependencies**:
  - DOM APIs, React runtime, or Node.js native libraries.
  - Sibling package implementation details.

## 3. Local Nx Target Delegations
- `nx lint contracts` -> `pnpm --filter @razor/contracts lint`
- `nx test contracts` -> `pnpm --filter @razor/contracts test`
- `nx build contracts` -> `pnpm --filter @razor/contracts build`
- `nx audit contracts` -> `pnpm audit --filter @razor/contracts`

## 4. Test & Verification Rules
- Strict type checking (`tsc --noEmit`).
- Zod schema validation round-trip tests.
- Zero tolerance for `any` or untyped escape hatches.

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | - | - |

## 6. Project Invariants
- All contracts represent JSON-serializable payloads.
- Strict backward compatibility on schema fields.
- Immutable contract interfaces.
