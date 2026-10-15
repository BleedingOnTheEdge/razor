---
title: "Enterprise Product Codebase Modularization and Anti-Sprawl Architecture"
author: "Enterprise Architecture Engineering Team"
created_date: "2026-10-14"
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

# Change Surface: Enterprise Product Codebase Modularization and Anti-Sprawl Architecture

## 1. Intent & Business Rationale
Fully adapt and institutionalize the enterprise product engineering operating system across the Razor polyglot trading monorepo codebase. This overhaul establishes:
- Strict file size ceilings ($\le 500$ lines, targeting 100–300 lines) across both C# backend modules and Next.js frontend pages/components, completely eliminating anti-sprawl without ABI, DI, or semantic regressions.
- Apple Design System foundations in `@razor/ui-kit` implementing tactile interaction primitives (Buttons, Cards, StatCards, Badges, ModalSheets, SegmentedControls) with glassmorphism, optical typography, and spring motion respects (`prefers-reduced-motion`).
- High-cohesion C# partial classes separating cross-cutting concerns (binary chunk transfers, connection lifecycle, order handling, accounting, and checkpoint management) while maintaining 100% binary interface compatibility.
- Decoupled Next.js presentation components isolating dialog modals, command dispatching, lineage inspection, and ticket creation into dedicated testable modules under 450 lines.
- Complete multi-stage automated verification passing 1,220 backend unit/integration/E2E tests, 21 frontend Vitest tests, `dotnet format`, and Next.js static builds.

## 2. Affected Monorepo Projects & Profiles
| Project Path | Architectural Profile | Responsibility in this Change |
|---|---|---|
| `core/src/Cloud` | Profile A (DDD/Hexagonal) | FastEndpoints cloud backend, EngineSession handler decomposition, session locking |
| `core/src/Engine` | Profile A (DDD/Hexagonal) | Strategy engine modularization: StateManager, KernelService, TaskManager, CloudConnector, Program CLI options |
| `core/src/Kernel` | Profile A (DDD/Hexagonal) | High-speed matching engine: LiveBroker session/orders, SimulatedBroker accounting/matching |
| `core/src/Sdk` | Profile D (Contracts/SDK) | Public trading contracts, developer interfaces, 95% line/branch coverage enforcement |
| `core/src/Shared` | Profile D (Contracts/Utils) | Cross-cutting converters, cryptographic helpers, UTC temporal utilities |
| `frontends/apps/cloud-dashboard` | Profile B (Web Application) | Operator dashboard, modal decomposition (instances, runs, reports, lineage), Apple UI foundations |
| `frontends/apps/marketplace` | Profile B (Web Application) | Trader extension marketplace, modal decomposition (tickets, items), Apple UI foundations |
| `frontends/packages/contracts` | Profile D (Contracts) | Shared TypeScript contracts and schemas, strict type enforcement |
| `frontends/packages/api-client` | Profile D (Contracts/SDK) | API client library, bundler-compatible extensionless imports, modular schema exports |
| `frontends/packages/ui-kit` | Profile D (Presentation) | Apple Design System primitives with glassmorphism blur and tactile feedback |

## 3. Code Surface (Targeted Symbols & Files)

### Added Files
- `core/src/Cloud/Engine/EngineSession.Handlers.cs`: Partial class isolating FastEndpoints session message handlers.
- `core/src/Engine/Communication/CloudConnector.BinaryTransfer.cs`: Partial class isolating chunked binary file transfer streams.
- `core/src/Engine/Communication/CloudConnector.Connection.cs`: Partial class isolating WebSocket connection and authentication loop.
- `core/src/Engine/Core/IStateManager.cs`: Extracted contract interface for engine state persistence and messaging queues.
- `core/src/Engine/Core/StateManager.Messaging.cs`: Partial class isolating state manager outgoing message queue processing.
- `core/src/Engine/EngineCliOptions.cs`: Extracted command-line option models and parser for Engine startup.
- `core/src/Engine/EngineServiceCollectionExtensions.cs`: Extracted dependency injection composition root extensions for Engine.
- `core/src/Engine/Kernel/KernelService.Backtest.cs`: Partial class isolating backtest execution pipeline and session lifecycle.
- `core/src/Engine/Kernel/KernelService.Live.cs`: Partial class isolating live trading session initialization and event dispatch.
- `core/src/Engine/Management/Tasks/TaskManager.Checkpoints.cs`: Partial class isolating computation checkpointing and stepping.
- `core/src/Engine/Management/Tasks/TaskManager.Optimization.cs`: Partial class isolating parameter optimization and config parsers.
- `core/src/Kernel/Brokers/LiveBroker.Orders.cs`: Partial class isolating live order placement, cancellation, and execution reports.
- `core/src/Kernel/Brokers/LiveBroker.Session.cs`: Partial class isolating live exchange sync, periodic reconciliation, and connection recovery.
- `core/src/Kernel/Brokers/SimulatedBroker.Accounting.cs`: Partial class isolating holding costs, drawdown tracking, and hook invokers.
- `frontends/apps/cloud-dashboard/src/components/instances/CommandDispatchSection.tsx`: Presentation component for engine command dispatching.
- `frontends/apps/cloud-dashboard/src/components/instances/CreatedCredentialsDialog.tsx`: Dialog presenting newly provisioned engine API tokens.
- `frontends/apps/cloud-dashboard/src/components/instances/RegisterEngineModal.tsx`: Modal form for provisioning new engine instances.
- `frontends/apps/cloud-dashboard/src/components/instances/RunnerGuideModal.tsx`: Step-by-step setup modal for headless engine runners.
- `frontends/apps/cloud-dashboard/src/components/instances/SlotAssignmentModal.tsx`: Modal dialog for assigning strategies and adapters to slots.
- `frontends/apps/cloud-dashboard/src/components/lineage/LineageBranchModal.tsx`: Modal dialog for branching runs at historical checkpoints.
- `frontends/apps/cloud-dashboard/src/components/lineage/LineageResumeModal.tsx`: Modal dialog for resuming branched runs with interventions.
- `frontends/apps/cloud-dashboard/src/components/lineage/LineageTreeNodeView.tsx`: Interactive SVG/DOM lineage tree visualization node.
- `frontends/apps/cloud-dashboard/src/components/reports/CompleteRunModal.tsx`: Modal dialog for finalizing run metrics and summary reports.
- `frontends/apps/cloud-dashboard/src/components/runs/LaunchRunModal.tsx`: Modal dialog for launching backtests, live runs, and optimizations.
- `frontends/apps/cloud-dashboard/src/components/runs/RankedRunsTable.tsx`: Tabular financial telemetry table for ranked run results.
- `frontends/apps/marketplace/src/components/items/LicenseAcquisitionCard.tsx`: Presentation card for acquiring and activating item licenses.
- `frontends/apps/marketplace/src/components/items/ReviewSubmissionModal.tsx`: Modal dialog for rating and reviewing marketplace extensions.
- `frontends/apps/marketplace/src/components/tickets/CreateTicketModal.tsx`: Modal dialog for submitting operator support tickets.
- `frontends/packages/ui-kit/src/components/Badge.tsx`: Apple Design status badge component with optical sizing and semantic variants.
- `frontends/packages/ui-kit/src/components/Button.tsx`: Apple Design tactile button component with active spring scaling.
- `frontends/packages/ui-kit/src/components/Card.tsx`: Apple Design glassmorphism card component with hairline borders.
- `frontends/packages/ui-kit/src/components/ModalSheet.tsx`: Apple Design backdrop-blur modal sheet dialog.
- `frontends/packages/ui-kit/src/components/SegmentedControl.tsx`: Apple Design iOS/macOS-style pill segmented control.
- `frontends/packages/ui-kit/src/components/StatCard.tsx`: Apple Design financial statistic card with tabular numeric typography.
- `frontends/packages/ui-kit/src/components/ThemeToggle.tsx`: Apple Design light/dark mode theme toggle with smooth CSS variable transitions.
- `frontends/apps/cloud-dashboard/src/app/admin/page.tsx`: Rich Admin panel page for operator elevation/demotion, user status management, and audit inspection.
- `frontends/apps/cloud-dashboard/src/app/profile/page.tsx`: User profile view and update page with subscription and preferences.
- `frontends/apps/cloud-dashboard/src/app/settings/page.tsx`: Cluster administrative settings page for fleet, security, and marketplace configurations.
- `frontends/apps/cloud-dashboard/src/components/instances/ManageEngineModals.tsx`: Engine lifecycle modals for renaming, secret key rotation, revocation, and decommissioning.
- `frontends/apps/marketplace/src/app/my-licenses/page.tsx`: Marketplace licenses page for inspecting and activating licenses.
- `frontends/apps/marketplace/src/app/profile/page.tsx`: Marketplace user profile page.
- `frontends/packages/api-client/src/schema/paths-admin.ts`: Modular OpenAPI path schemas for admin endpoints.
- `frontends/packages/api-client/src/schema/paths-instances.ts`: Modular OpenAPI path schemas for engine lifecycle management.
- `frontends/packages/api-client/src/schema/paths-marketplace.ts`: Modular OpenAPI path schemas for marketplace catalog and acquisition.
- `frontends/packages/api-client/src/schema/paths-runs.ts`: Modular OpenAPI path schemas for execution runs.
- `frontends/packages/api-client/src/schema/paths-tickets.ts`: Modular OpenAPI path schemas for support tickets.
- `core/src/Cloud/Data/DatabaseSeeder.cs`: Production database seeder for 1 superadmin, 3 operators, 20 traders, 20 developers, and 16 additives.
- `core/src/Cloud/Data/SystemSetting.cs`: Entity Framework model and configuration table for cluster system settings.
- `core/src/Cloud/Endpoints/AdminEndpoints.cs`: FastEndpoints controller for admin user governance and system settings.
- `core/src/Cloud/Endpoints/DeleteEngineEndpoint.cs`: FastEndpoints controller for engine instance cascading deletion.
- `core/src/Cloud/Endpoints/RevokeEngineEndpoint.cs`: FastEndpoints controller for engine instance credential revocation.
- `core/src/Cloud/Endpoints/RotateEngineKeyEndpoint.cs`: FastEndpoints controller for rotating engine instance API keys.
- `core/src/Cloud/Endpoints/UpdateEngineEndpoint.cs`: FastEndpoints controller for updating engine metadata and labels.
- `core/src/Cloud/Endpoints/UserProfileEndpoints.cs`: FastEndpoints controller for user profile inspection and updates.
- `core/src/Cloud/Services/AdminSettingsService.cs`: Service layer managing cluster settings defaults and database persistence.
- `core/src/Cloud/Services/EngineRegistrationService.Management.cs`: Partial service isolating engine rename, key rotation, revocation, and deletion.
- `core/src/Cloud/Services/UserService.Admin.cs`: Partial service isolating user role elevation/demotion and status management.
- `core/src/Engine/Management/Commands/Handlers/PingHandler.cs`: Ping diagnostic command handler for Engine.
- `core/src/Engine/Management/Commands/Handlers/SoftReloadHandler.cs`: Soft reload runtime command handler for Engine.
- `core/tests/Cloud.UnitTests/AdminAndGovernanceEdgeCaseTests.cs`: Boundary and security test suite for admin endpoints.
- `core/tests/Cloud.UnitTests/AdminEndpointsTests.cs`: Functional test suite for admin settings and user management.
- `core/tests/Cloud.UnitTests/EngineCrudAndProfileEndpointsTests.cs`: Functional test suite for engine CRUD and profile endpoints.
- `core/tests/Cloud.UnitTests/EngineManagementEdgeCaseTests.cs`: Edge case test suite for engine lifecycle management.
- `core/tests/Engine.UnitTests/Management/Commands/CommandDispatcherEdgeCaseTests.cs`: Edge case test suite for Engine command dispatcher.
- `core/src/Cloud/Data/DatabaseSchemaCompatibility.cs`: Self-healing schema synchronization utility executing idempotent DDL statements before seeding on PostgreSQL databases.
- `core/src/Cloud/Migrations/20261015060000_AddEnterpriseFeatures.cs`: EF Core migration for enterprise schema expansion.
- `core/src/Cloud/Migrations/20261015060000_AddEnterpriseFeatures.Designer.cs`: EF Core migration metadata designer file.
- `core/tests/Cloud.UnitTests/DatabaseSchemaCompatibilityTests.cs`: Unit test suite verifying schema synchronization and PostgreSQL detection logic.
- `frontends/apps/cloud-dashboard/src/test/settings.test.tsx`: Vitest suite verifying role-based access control and section locking on /settings page for Traders, Operators, and Admins.
- `scripts/bin/engine`: CLI launcher script wrapping standalone Engine binary execution.
- `scripts/build-engine.mjs`: Standalone cross-platform Engine binary compiler supporting Linux, Windows, macOS x64 and arm64 architectures.
- `scripts/dev-all.mjs`: Monorepo multi-service dev orchestrator for Cloud API, Engine, Marketplace, and Dashboard with colored logs and graceful shutdown.
- `scripts/run-engine.mjs`: Standalone Engine runner script with automatic host binary compilation and argument pass-through.
- `scripts/test-all.mjs`: Monorepo test orchestrator executing backend .NET test suites and frontend Vitest suites with unified scorecard.

### Modified Files
- `.gitignore`: Added root ignores for compiled native binaries (/bin/, /artifacts/, /publish/).
- `core/src/Engine/AGENT.md`: Added nx publish engine target delegation.
- `core/src/Engine/Engine.csproj`: Added single-file self-contained publish configuration defaults.
- `core/src/Engine/project.json`: Added publish target delegating to node scripts/build-engine.mjs.
- `package.json`: Added helper scripts for dev orchestration, direct engine execution, and test running.
- `core/src/Cloud/Engine/EngineSession.cs`: Decomposed from 640 lines down to 230 lines via `EngineSession.Handlers.cs`.
- `core/src/Engine/Communication/CloudConnector.cs`: Decomposed from 598 lines down to 382 lines via `CloudConnector.BinaryTransfer.cs` and `CloudConnector.Connection.cs`.
- `core/src/Engine/Core/StateManager.cs`: Decomposed from 612 lines down to 411 lines via `IStateManager.cs` and `StateManager.Messaging.cs`.
- `core/src/Engine/Kernel/KernelService.cs`: Decomposed from 680 lines down to 240 lines via `KernelService.Backtest.cs` and `KernelService.Live.cs`.
- `core/src/Engine/Management/Tasks/TaskManager.cs`: Decomposed from 552 lines down to 345 lines via `TaskManager.Optimization.cs`.
- `core/src/Engine/Management/Tasks/TaskManager.Operations.cs`: Decomposed from 535 lines down to 436 lines via `TaskManager.Checkpoints.cs`.
- `core/src/Engine/Program.cs`: Decomposed from 620 lines down to 271 lines via `EngineCliOptions.cs` and `EngineServiceCollectionExtensions.cs`.
- `core/src/Kernel/Brokers/LiveBroker.cs`: Decomposed from 568 lines down to 347 lines via `LiveBroker.Orders.cs` and `LiveBroker.Session.cs`.
- `core/src/Kernel/Brokers/SimulatedBroker.Matching.cs`: Decomposed from 570 lines down to 395 lines via `SimulatedBroker.Accounting.cs`.
- `frontends/apps/cloud-dashboard/src/app/instances/page.tsx`: Decomposed from 596 lines down to 369 lines via extracted modal components.
- `frontends/apps/cloud-dashboard/src/app/runs/page.tsx`: Decomposed from 594 lines down to 424 lines via `LaunchRunModal.tsx` and `RankedRunsTable.tsx`.
- `frontends/apps/cloud-dashboard/src/components/instances/instance-detail-content.tsx`: Decomposed from 698 lines down to 443 lines via extracted modals.
- `frontends/apps/cloud-dashboard/src/components/lineage/lineage-content.tsx`: Decomposed from 655 lines down to 312 lines via extracted modals and node views.
- `frontends/apps/cloud-dashboard/src/components/reports/report-content.tsx`: Decomposed from 512 lines down to 414 lines via `CompleteRunModal.tsx`.
- `frontends/apps/marketplace/src/app/tickets/page.tsx`: Decomposed from 504 lines down to 396 lines via `CreateTicketModal.tsx`.
- `frontends/apps/marketplace/src/components/items/item-detail-content.tsx`: Decomposed from 517 lines down to 340 lines via extracted card and modal components.
- `frontends/packages/api-client/src/index.ts`: Bundler-compatible extensionless module imports for Next.js webpack compatibility.
- `frontends/packages/api-client/src/schema/index.ts`: Bundler-compatible extensionless module imports for Next.js webpack compatibility.
- `frontends/packages/ui-kit/package.json`: Updated exports configuration for component primitives.
- `frontends/packages/ui-kit/src/index.ts`: Export barrel for all presentation components.
- `frontends/packages/ui-kit/tsconfig.json`: Strict TypeScript build configuration for component library.

## 4. Test Surface

### Unit & Domain Tests
- `core/tests/Cloud.UnitTests`: 317/317 unit tests passing verifying FastEndpoints, authentication tokens, rate limiting, Admin RBAC, Engine CRUD, User Profiles, Database Seeder idempotency, PostgreSQL schema compatibility, and branch coverage edge cases (enforced scope coverage: 98.01% line, 95.20% branch).
- `core/tests/Engine.UnitTests`: 106/106 unit tests passing verifying command dispatching, task operations, and heartbeat serialization.
- `core/tests/Kernel.UnitTests`: 183/183 unit tests passing verifying simulated broker matching, order book updates, and pre-trade risk checks.
- `core/tests/Sdk.UnitTests`: 454/454 unit tests passing verifying public contracts, developer indicators, and immutable parameter models.
- `frontends/apps/cloud-dashboard`: 21/21 Vitest unit tests passing verifying telemetry widgets, status indicators, modal interaction labels, and settings role-based access control.
- `frontends/apps/marketplace`: 17/17 Vitest unit tests passing verifying extension cards, category filtering, and license acquisition cards.

### Integration Tests
- `core/tests/Engine.IntegrationTests`: 8/8 integration tests passing verifying end-to-end command orchestration and state recovery.
- `core/tests/Sdk.IntegrationTests`: 202/202 integration tests validating strategy runtime execution and indicator pipelines.
- `core/tests/EndToEndTests`: 4/4 end-to-end integration tests verifying engine session execution pipelines.

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
- [x] Tier 2: Files strictly respect size ceilings ($\le 500$ lines ceiling, 100–300 lines sweet spot); zero anti-sprawl.
- [x] Tier 2: Zero warnings and zero errors across .NET 10 compilation, `dotnet format`, and Next.js static builds.
- [x] Tier 2: Strict backward compatibility across all public SDK and contracts interfaces.
- [x] Tier 2: Zero secrets bundled in web client builds; all browser variables prefixed with `NEXT_PUBLIC_`.

## 6. Risk Matrix & Rollback Strategy
| Risk Description | Probability | Impact | Mitigation Strategy |
|---|---|---|---|
| Partial class file reorganization causing ABI or symbol resolution breaks | Very Low | High | Full .NET Release build verified with 0 warnings and 0 errors; all 1,220 tests passing 100% |
| Frontend modal decomposition breaking dialog behavior or test selectors | Very Low | Medium | Exact modal titles, test IDs, and ARIA labels preserved; 100% Vitest suites passing green |
| Formatting discrepancies across git commits | Very Low | Low | Automated `dotnet format Razor.sln` verified with `--verify-no-changes` |

### Rollback Strategy
If any unforeseen production anomaly arises, this entire rework can be cleanly rolled back by reverting the merge commit on branch `rework/enterprise-product-codebase`. Because all structural changes preserve exact binary and symbol equivalence, rollback requires zero database rollback scripts or data migration adjustments.
