---
project_name: "marketplace"
profile: "B"
stack: "node-ts-20"
scope: "frontend"
owner: "frontend-team"
tier_overrides: []
---

# Project Agent Manifest: marketplace

## 1. Scope & Business Intent
Next.js web portal enabling traders and developers to explore, acquire, review, and configure trading strategies, custom indicators, and ecosystem extensions.

## 2. Architectural Profile & Boundaries
- **Profile**: B (Web Application: Apple Design System + Zero-Trust Client)
- **Primary Inputs**: Web browser user interactions.
- **Allowed Outbound Dependencies**:
  - `@razor/contracts`
  - `@razor/api-client`
  - `@razor/ui-kit`
- **Forbidden Dependencies**:
  - Direct database connections or private server secrets in client bundle.
  - Direct internal imports from sibling app directories.

## 3. Local Nx Target Delegations
- `nx lint marketplace` -> `pnpm --filter @razor/marketplace lint`
- `nx test marketplace` -> `pnpm --filter @razor/marketplace test`
- `nx build marketplace` -> `pnpm --filter @razor/marketplace build`
- `nx audit marketplace` -> `pnpm audit --filter @razor/marketplace`

## 4. Test & Verification Rules
- Automated unit testing of catalog filters, cart logic, and search components using Vitest.
- Strict TypeScript compilation (`tsc --noEmit`).
- Fluid 60fps animations with full prefers-reduced-motion support.

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | - | - |

## 6. Project Invariants
- Zero secret leakage in bundle (ADR-0004 compliance).
- Client-side token sanitization prior to logging or telemetry dispatch.
- Fast initial paint time under 200ms with cached catalog metadata.
