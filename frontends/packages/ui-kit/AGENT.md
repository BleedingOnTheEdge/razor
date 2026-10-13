---
project_name: "ui-kit"
profile: "D"
stack: "node-ts-20"
scope: "shared"
owner: "frontend-team"
tier_overrides: []
---

# Project Agent Manifest: ui-kit

## 1. Scope & Business Intent
Shared React component library implementing Apple Design System foundations: fluid physical motion, translucent glassmorphism, precise SF Pro typography, and accessible interactive primitives.

## 2. Architectural Profile & Boundaries
- **Profile**: D (Shared Presentation Library)
- **Primary Inputs**: Consumed by `cloud-dashboard` and `marketplace`.
- **Allowed Outbound Dependencies**:
  - `@razor/contracts`
  - `react`, `react-dom`, `lucide-react`, `tailwind-merge`
- **Forbidden Dependencies**:
  - Direct HTTP client calls, business logic, or backend domain services.
  - Hardcoded non-semantic color escapes.

## 3. Local Nx Target Delegations
- `nx lint ui-kit` -> `pnpm --filter @razor/ui-kit lint`
- `nx test ui-kit` -> `pnpm --filter @razor/ui-kit test`
- `nx build ui-kit` -> `pnpm --filter @razor/ui-kit build`
- `nx audit ui-kit` -> `pnpm audit --filter @razor/ui-kit`

## 4. Test & Verification Rules
- Strict TypeScript verification (`tsc --noEmit`).
- Component rendering tests with Vitest and Testing Library.
- Keyboard navigation and ARIA accessibility compliance.

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | - | - |

## 6. Project Invariants
- Pure presentational components with zero external side effects.
- Full support for `prefers-reduced-motion` media queries on all spring transitions.
- High contrast and WCAG 2.1 AA compliance across light and dark modes.
