---
title: "Cryptographic JWT Claims, Multi-Tenant Authorization, and Marketplace Treasury Security"
author: "sinavali"
created_date: "2026-10-31"
target_branch: "feat/auth-jwt-and-tenant-isolation"
risk_level: "HIGH"
affected_projects:
  - "core"
  - "frontends"
---

# Change Surface: Cryptographic JWT Claims, Multi-Tenant Authorization, and Marketplace Treasury Security

## 1. Intent & Business Rationale
Establish zero cross-tenant data leaks and secure cryptographic authentication across monorepo services:
- Issue signed HMAC-SHA256 JWT tokens containing `AccountId`, `UserId`, `Role`, and `UserName` upon authentication (Issue #101).
- Implement `TenantContext` resolving authenticated tenant identity and validating endpoint-level authorization.
- Eliminate client-side payment secret storage in browser `localStorage`, migrating to secure backend endpoints `/api/admin/payments/config` (Issue #102).
- Implement `GET /api/marketplace/acquisitions` endpoint and wire `MyLicensesPage` to display authenticated acquisitions (Issue #103).
- Author typed `BundlePaths` API schema in `@razor/api-client` (Issue #104).

## 2. Affected Monorepo Projects
- `core`
- `frontends`

## 3. Code Surface
### Modified Files
- `core/src/Cloud/CloudApplication.cs`
- `core/src/Cloud/CloudOptions.cs`
- `core/src/Cloud/Endpoints/MarketplaceAcquisitionsEndpoints.cs`
- `core/src/Cloud/Endpoints/PaymentConfigEndpoints.cs`
- `core/src/Cloud/Services/AdminSettingsService.cs`
- `core/src/Cloud/Services/JwtTokenService.cs`
- `core/src/Cloud/Services/TenantContext.cs`
- `core/src/Cloud/Services/UserService.cs`
- `core/tests/Cloud.UnitTests/CloudGovernanceBranchTests.cs`
- `core/tests/Cloud.UnitTests/JwtTokenServiceTests.cs`
- `frontends/apps/marketplace/src/app/my-licenses/page.tsx`
- `frontends/apps/marketplace/src/app/payments/page.tsx`
- `frontends/packages/api-client/src/schema/paths-bundles.ts`
- `frontends/packages/api-client/src/schema/paths.ts`

## 4. Test Surface
### Unit & Integration Suites
- `core/tests/Cloud.UnitTests/JwtTokenServiceTests.cs`
- `core/tests/Cloud.UnitTests`
- `frontends/packages/api-client`
- `frontends/apps/marketplace`

## 5. Invariants
- Resource AccountId must match caller's authenticated JWT claims.
- Private payment provider keys must never be exposed to browser storage.
- All tokens must carry cryptographic HMAC-SHA256 signatures with expiration validation.

## 6. Risk Matrix
- Rollback: Revert commits via standard git rollback.
- Blast radius bounded strictly to declared Code Surface.
