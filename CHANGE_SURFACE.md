---
title: "Frontend Route Consolidation, Strict Typing, Container Hardening, and Production Polish"
author: "sinavali"
created_date: "2026-10-31"
target_branch: "refactor/frontend-panel-consolidation"
risk_level: "MEDIUM"
affected_projects:
  - "frontends"
  - "deploy"
  - "docs"
---

# Change Surface: Frontend Route Consolidation, Strict Typing, Container Hardening, and Production Polish

## 1. Intent & Business Rationale
Finalize the Monorepo overhaul with strict routing, typing, container security, and operational reliability:
- Consolidate duplicate outer routes into `/panel/*` with permanent 308 redirects in `next.config.mjs` (Issue #109).
- Flatten deeply nested routes (`generations/.../populations/...`) to conform to max directory depth $\le 6$ (Issue #110).
- Modularize and consolidate monolithic route pages (Issue #111).
- Bind author and operator identities to authenticated `useAuth().user` (Issue #112).
- Eliminate remaining explicit `any` in `LaunchRunModal.tsx` and `report.test.tsx` (Issue #113).
- Eliminate React test warnings and verify all Vitest suites run clean (Issue #114).
- Harden `Dockerfile` with unprivileged `razor` user and non-root execution (Issue #115).
- Add atomic failure traps in `deploy-runflare.sh` to prevent working tree corruption (Issue #116).
- Reconcile documentation references and AGENT manifests monorepo-wide (Issue #117).

## 2. Affected Monorepo Projects
- `frontends`
- `deploy`
- `docs`

## 3. Code Surface
### Modified Files
- `CHANGE_SURFACE.md`
- `Dockerfile`
- `README.md`
- `deploy/nginx.conf`
- `frontends/apps/cloud-dashboard/next.config.mjs`
- `frontends/apps/cloud-dashboard/src/app/panel/admin/ClusterSettingsForm.tsx`
- `frontends/apps/cloud-dashboard/src/app/panel/admin/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/panel/profile/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/panel/reports/[id]/generations/[genId]/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/panel/runs/[id]/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/panel/settings/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/panel/tickets/page.tsx`
- `frontends/apps/cloud-dashboard/src/components/live/LiveManagerContent.tsx`
- `frontends/apps/cloud-dashboard/src/components/runs/LaunchRunModal.tsx`
- `frontends/apps/cloud-dashboard/src/test/instances.test.tsx`
- `frontends/apps/cloud-dashboard/src/test/live.test.tsx`
- `frontends/apps/cloud-dashboard/src/test/operator-tickets.test.tsx`
- `frontends/apps/cloud-dashboard/src/test/report.test.tsx`
- `frontends/apps/cloud-dashboard/src/test/settings.test.tsx`
- `frontends/apps/marketplace/src/app/community/page.tsx`
- `frontends/apps/marketplace/src/components/items/item-detail-content.tsx`
- `frontends/apps/marketplace/src/test/catalogue.test.tsx`
- `frontends/apps/marketplace/src/test/community-and-tickets.test.tsx`
- `scripts/deploy-runflare.sh`

### Deleted Files
- `frontends/apps/cloud-dashboard/src/app/admin/ClusterSettingsForm.tsx`
- `frontends/apps/cloud-dashboard/src/app/admin/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/bundles/new/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/bundles/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/instances/[id]/live/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/instances/[id]/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/instances/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/live/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/panel/reports/[id]/generations/[genId]/populations/[popId]/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/profile/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/reports/[id]/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/runs/[id]/lineage/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/runs/[id]/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/runs/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/settings/page.tsx`
- `frontends/apps/cloud-dashboard/src/app/tickets/page.tsx`

## 4. Test Surface
### Unit & Integration Suites
- `frontends/apps/cloud-dashboard`
- `frontends/apps/marketplace`
- `frontends/packages/ui-kit`
- `frontends/packages/api-client`
- `frontends/packages/contracts`

## 5. Invariants
- All dashboard operations route through `/panel/*` with 308 redirects for legacy paths.
- Route directory depth must never exceed 6 levels from application root.
- Production containers must run as unprivileged `razor` user.
- Author and operator identities must reflect authenticated credentials.

## 6. Risk Matrix
- Rollback: Clean git revert.
- Blast radius bounded strictly to declared Code Surface.
