---
project_name: "cloud-dashboard"
profile: "B"
stack: "node-ts-20"
scope: "frontend"
owner: "frontend-team"
tier_overrides: []
---

# Project Agent Manifest: cloud-dashboard

## 1. Scope & Business Intent
Next.js web application providing an enterprise operator and trader dashboard for managing live engines, monitoring real-time telemetry, orchestrating trading tasks, and inspecting analytics.

## 2. Architectural Profile & Boundaries
- **Profile**: B (Web Application: Apple Design System + Zero-Trust Client)
- **Primary Inputs**: Operator user interactions, WebSocket telemetry streams.
- **Allowed Outbound Dependencies**:
  - `@razor/contracts`
  - `@razor/api-client`
  - `@razor/ui-kit`
- **Forbidden Dependencies**:
  - Direct database access or server-side secret bundling (Tier 1 Inviolable).
  - Bypassing `@razor/contracts` types for ad-hoc any shapes.

## 3. Local Nx Target Delegations
- `nx lint cloud-dashboard` -> `pnpm --filter @razor/cloud-dashboard lint`
- `nx test cloud-dashboard` -> `pnpm --filter @razor/cloud-dashboard test`
- `nx build cloud-dashboard` -> `pnpm --filter @razor/cloud-dashboard build`
- `nx audit cloud-dashboard` -> `pnpm audit --filter @razor/cloud-dashboard`

## 4. Test & Verification Rules
- Component and hook unit tests executed with Vitest.
- Strict TypeScript verification (`tsc --noEmit`) with no implicit any.
- Responsive layout verification and accessibility compliance (WCAG 2.1 AA).
- Reduced-motion adherence for all spring physics animations.

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | - | - |

## 6. Project Invariants
- Zero secrets in client builds; all client environment variables strictly prefixed with `NEXT_PUBLIC_`.
- Token refreshes handled transparently with zero disruption to active WebSocket connections.
- Error states always provide actionable recovery mechanisms with optimistic UI rollbacks.
