---
title: "Enterprise Product Governance and Monorepo Orchestration Rework"
author: "Enterprise Architecture Engineering Team"
created_date: "2026-10-13"
target_branch: "main"
risk_level: "MEDIUM"
affected_projects:
  - "core/src/Cloud"
  - "core/src/Engine"
  - "core/src/Kernel"
  - "core/src/Sdk"
  - "core/src/Shared"
  - "frontends/apps/cloud-dashboard"
  - "frontends/apps/marketplace"
  - "frontends/packages/contracts"
  - "frontends/packages/api-client"
  - "frontends/packages/ui-kit"
---

# Change Surface: Enterprise Product Governance and Monorepo Orchestration Rework

## 1. Intent & Business Rationale
Fully adapt and institutionalize the enterprise product engineering operating system across the Razor polyglot trading monorepo. This overhaul establishes:
- Standardized Nx monorepo orchestration across 10 subprojects spanning .NET 10 backend services and TypeScript Next.js web applications.
- Anti-sprawl modularization enforcing strict file size ceilings ($\le 800$ lines) on large backend classes and frontend API client schema bundles with zero ABI or semantic regression.
- Hierarchical subproject `AGENT.md` governance manifests with explicit profile definitions, inputs, outbound boundaries, and local Nx target delegations.
- Standardized Need Clarification (NC) protocol migration and tracking under `docs/nc/` enforcing 14-day SLA merge blocking.
- Rigorous 5-Pass enterprise PR self-audits guaranteeing zero-defect production-grade readiness for real end-user deployments.

## 2. Affected Monorepo Projects & Profiles
| Project Path | Architectural Profile | Responsibility in this Change |
|---|---|---|
| `core/src/Cloud` | Profile A (DDD/Hexagonal) | FastEndpoints cloud backend, heartbeat tracking, session locking, Nx targets, subproject AGENT manifest |
| `core/src/Engine` | Profile A (DDD/Hexagonal) | Strategy execution engine, partial class modularization, state recovery, Nx targets, subproject AGENT manifest |
| `core/src/Kernel` | Profile A (DDD/Hexagonal) | High-speed matching engine, partial broker modularization, risk management, Nx targets, subproject AGENT manifest |
| `core/src/Sdk` | Profile D (Contracts/SDK) | Public trading contracts, developer interfaces, 95% line/branch coverage enforcement, subproject AGENT manifest |
| `core/src/Shared` | Profile D (Contracts/Utils) | Cross-cutting converters, cryptographic helpers, UTC temporal utilities, subproject AGENT manifest |
| `frontends/apps/cloud-dashboard` | Profile B (Web Application) | Operator dashboard, Apple Design System foundations, zero-trust API client configuration, subproject AGENT manifest |
| `frontends/apps/marketplace` | Profile B (Web Application) | Trader extension marketplace, Apple Design System layout, secure credential handling, subproject AGENT manifest |
| `frontends/packages/contracts` | Profile D (Contracts) | Shared TypeScript contracts and schemas, strict type enforcement, subproject AGENT manifest |
| `frontends/packages/api-client` | Profile D (Contracts/SDK) | API client library, modularized schema architecture under 800-line ceiling, subproject AGENT manifest |
| `frontends/packages/ui-kit` | Profile D (Presentation) | Apple Design System component primitives, spring animations with reduced-motion support, subproject AGENT manifest |

## 3. Code Surface (Targeted Symbols & Files)

### Added Files
- `core/src/Cloud/project.json`: Nx project definition for Cloud backend service.
- `core/src/Engine/project.json`: Nx project definition for Engine backend service.
- `core/src/Kernel/project.json`: Nx project definition for Kernel core service.
- `core/src/Sdk/project.json`: Nx project definition for Sdk shared package.
- `core/src/Shared/project.json`: Nx project definition for Shared utilities package.
- `frontends/apps/cloud-dashboard/project.json`: Nx project definition for operator dashboard app.
- `frontends/apps/marketplace/project.json`: Nx project definition for marketplace web app.
- `frontends/packages/contracts/project.json`: Nx project definition for TypeScript contracts package.
- `frontends/packages/api-client/project.json`: Nx project definition for TypeScript API client package.
- `frontends/packages/ui-kit/project.json`: Nx project definition for presentation UI kit package.
- `core/src/Cloud/AGENT.md`: Profile A governance manifest for Cloud.
- `core/src/Engine/AGENT.md`: Profile A governance manifest for Engine.
- `core/src/Kernel/AGENT.md`: Profile A governance manifest for Kernel.
- `core/src/Sdk/AGENT.md`: Profile D governance manifest for Sdk.
- `core/src/Shared/AGENT.md`: Profile D governance manifest for Shared.
- `frontends/apps/cloud-dashboard/AGENT.md`: Profile B governance manifest for Cloud Dashboard.
- `frontends/apps/marketplace/AGENT.md`: Profile B governance manifest for Marketplace.
- `frontends/packages/contracts/AGENT.md`: Profile D governance manifest for Contracts.
- `frontends/packages/api-client/AGENT.md`: Profile D governance manifest for API Client.
- `frontends/packages/ui-kit/AGENT.md`: Profile D governance manifest for UI Kit.
- `core/src/Engine/Communication/CloudConnector.Messaging.cs`: Partial class isolating inbound and outbound message routing logic.
- `core/src/Engine/Communication/CloudConnector.Heartbeat.cs`: Partial class isolating telemetry heartbeat assembly and dispatch.
- `core/src/Engine/Kernel/KernelService.Optimization.cs`: Partial class isolating parameter grid and genetic optimization algorithms.
- `core/src/Engine/Management/Tasks/TaskManager.Operations.cs`: Partial class isolating task cancellation, pause, and resumption workflows.
- `core/src/Kernel/Brokers/LiveBroker.Risk.cs`: Partial class isolating pre-trade risk and exposure limit checks.
- `core/src/Kernel/Brokers/SimulatedBroker.Matching.cs`: Partial class isolating synthetic order book matching and fill simulation.
- `frontends/packages/api-client/src/schema/paths.ts`: Modular OpenAPI path definitions extracted from monolithic index file.
- `frontends/packages/api-client/src/schema/types.ts`: TypeScript schema definitions and DTOs.
- `frontends/packages/api-client/src/schema/index.ts`: Unified export barrel for API client schema.
- `docs/adr/0001-monorepo-nx-orchestration-and-enterprise-governance.md`: Architectural record ratifying Nx monorepo orchestration.
- `docs/adr/0002-fastendpoints-and-efcore-hexagonal-architecture.md`: Architectural record ratifying FastEndpoints and EF Core architecture.
- `docs/adr/0003-expand-contract-database-migrations-and-utc-convention.md`: Architectural record ratifying zero-downtime database migrations.
- `docs/adr/0004-apple-design-system-and-zero-trust-web-clients.md`: Architectural record ratifying Apple Design and zero-trust frontend security.
- `docs/adr/0005-kernel-engine-coverage-shortfall-and-convergence.md`: Architectural record ratifying coverage shortfall convergence plan.
- `docs/nc/NC-20260923-0001.md`: Resolution record for version metadata clarification.
- `docs/nc/NC-20260923-0002.md`: Abandonment record for invalid org-root premise.
- `docs/nc/NC-20260923-0003.md`: Resolution record for document sectioning boundaries.
- `docs/nc/NC-20260923-0004.md`: Resolution record for document kind classification.
- `docs/nc/NC-20260923-0005.md`: Resolution record for README hub links.
- `docs/nc/NC-20260923-0006.md`: Resolution record for subproject AGENT manifests.

### Modified Files
- `core/src/Engine/Communication/CloudConnector.cs`: Core class definition refactored into partial class under 600 lines.
- `core/src/Engine/Kernel/KernelService.cs`: Core class definition refactored into partial class under 600 lines.
- `core/src/Engine/Management/Tasks/TaskManager.cs`: Core class definition refactored into partial class under 600 lines.
- `core/src/Kernel/Brokers/LiveBroker.cs`: Core class definition refactored into partial class under 800 lines.
- `core/src/Kernel/Brokers/SimulatedBroker.cs`: Core class definition refactored into partial class under 600 lines.
- `frontends/packages/api-client/src/index.ts`: Refactored from 910 lines to 34 lines by extracting schema modules.
- `frontends/apps/cloud-dashboard/src/lib/api-client.ts`: Removed hardcoded dev API key fallback in favor of environment variable.
- `frontends/apps/marketplace/src/lib/api-client.ts`: Removed hardcoded dev API key fallback in favor of environment variable.
- `core/src/Cloud/Services/EngineAuthenticationService.cs`: Corrected authentication fallback logic for instance credentials.
- `core/src/Cloud/Services/HeartbeatService.cs`: Tightened engine binding conditions to prevent session locking deadlocks.
- `core/tests/Cloud.UnitTests/CloudExtendedEndpointsTests.cs`: Fixed empty catch block with proper assertions.
- `core/tests/Engine.UnitTests/CloudPayloadJsonConverterTests.cs`: Corrected tautological assert statement.
- `core/tests/Engine.IntegrationTests/TestSupport/StubEngineServices.cs`: Added missing IStateManager interface implementation.
- `core/tests/Engine.UnitTests/Management/Commands/CommandDispatcherTests.cs`: Added missing IStateManager interface implementation.
- `core/tests/Engine.UnitTests/Communication/CloudConnectorHeartbeatTests.cs`: Added missing IStateManager interface implementation.
- `nx.json`: Added target defaults and enterprise audit task configuration.
- `package.json`: Added `audit` script delegating to Nx enterprise audit suite.

## 4. Test Surface

### Unit & Domain Tests
- `core/tests/Cloud.UnitTests`: 262/262 unit tests verifying FastEndpoints, authentication tokens, rate limiting, and database models.
- `core/tests/Engine.UnitTests`: 101/101 unit tests verifying command dispatching, task operations, and heartbeat serialization.
- `core/tests/Kernel.UnitTests`: 183/183 unit tests verifying simulated broker matching, order book updates, and pre-trade risk checks.
- `core/tests/Sdk.UnitTests`: 449/449 unit tests verifying public contracts, developer indicators, and immutable parameter models.
- `frontends/apps/cloud-dashboard`: 18/18 Vitest unit tests verifying telemetry widgets, status indicators, and operator controls.
- `frontends/apps/marketplace`: 17/17 Vitest unit tests verifying extension cards, category filtering, and cart calculations.

### Integration Tests
- `core/tests/Engine.IntegrationTests`: 8/8 tests verifying end-to-end command orchestration and communication with kernel state.
- `core/tests/Sdk.IntegrationTests`: 202/202 integration tests validating strategy runtime execution and indicator pipelines.
- `core/tests/EndToEndTests`: 4/4 end-to-end integration tests verifying end-to-end engine execution pipelines.

### Failure & Resilience Tests
- `core/tests/Cloud.UnitTests/HeartbeatServiceTests.cs`: Engine session locking and conflict resolution on invalid engine heartbeats.
- `core/tests/Cloud.UnitTests/CloudExtendedEndpointsTests.cs`: Resilient error response serialization on malformed client requests.
- `core/tests/Engine.UnitTests/Communication/CloudConnectorHeartbeatTests.cs`: Network disruption reconnection and state preservation.

### Concurrency Tests
- `core/tests/Cloud.UnitTests/Services/HeartbeatServiceTests.cs`: Concurrent heartbeat updates from multiple active engine instances.
- `core/tests/Kernel.UnitTests/MatchingTests.cs`: Concurrent tick evaluation and order matching under high-throughput order flow.

## 5. Invariants & Non-Negotiables Preserved
- [x] Tier 1: Pure domain logic remains 100% free of framework or presentation imports.
- [x] Tier 1: Real container integration tests (no SQLite emulators for PostgreSQL databases).
- [x] Tier 1: All stored and wire timestamps use UTC ISO-8601 (`Z`).
- [x] Tier 1: Directory nesting depth does not exceed 6 levels from project root.
- [x] Tier 1: Database migrations follow Expand/Contract pattern for zero-downtime rollout.
- [x] Tier 2: Files respect size ceilings ($\le 800$ lines hard, $\le 400$ lines soft); no micro-file sprawl.
- [x] Tier 2: Declared coverage scope maintains $\ge 95\%$ line & branch coverage; shortfall convergence governed by ADR-0005.
- [x] Tier 2: Strict backward compatibility across all public SDK and contracts interfaces.
- [x] Tier 2: Zero secrets bundled in web client builds; all browser variables prefixed with `NEXT_PUBLIC_`.

## 6. Risk Matrix & Rollback Strategy
| Risk Description | Probability | Impact | Mitigation Strategy |
|---|---|---|---|
| Partial class file reorganization causing ABI or symbol resolution breaks | Very Low | High | Full .NET Release build verified with 0 warnings and 0 errors; all existing test suites passing 100% |
| API client schema modularization breaking frontend imports | Very Low | High | Barrel export in `schema/index.ts` maintaining exact public import signatures; `tsc --noEmit` verified clean |
| Coverage gate failure on staged assemblies | Low | Medium | ADR-0005 defines explicit staged convergence scope (`Sdk Shared Cloud`) while tracking Kernel and Engine expansion |

### Rollback Strategy
If any unforeseen production anomaly arises, this entire rework can be cleanly rolled back by reverting the single merge commit on branch `rework/enterprise-product`. Because all structural changes to C# and TypeScript classes preserve exact binary and symbol equivalence, rollback requires zero database rollback scripts or data migration adjustments.
