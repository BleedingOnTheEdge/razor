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
- `.dockerignore`: Docker build exclusion manifest preserving distribution artifacts for container builds.
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
-`frontends/packages/ui-kit/src/components/ThemeToggle.tsx`: Supabase-style light/dark mode theme toggle with smooth CSS variable transitions.
- `frontends/packages/ui-kit/src/lib/utils.ts`: Utility for merging Tailwind and clsx classes.
- `frontends/packages/ui-kit/src/components/Dialog.tsx`: Supabase-style Radix UI Dialog primitives with dark mode near-black surface.
- `frontends/packages/ui-kit/src/components/DropdownMenu.tsx`: Supabase-style Radix UI DropdownMenu primitives.
- `frontends/packages/ui-kit/src/components/Tabs.tsx`: Supabase-style Radix UI Tabs primitives.
- `frontends/packages/ui-kit/src/components/Input.tsx`: Supabase-style dark-mode-native Input with emerald focus ring.
- `frontends/packages/ui-kit/src/components/Textarea.tsx`: Supabase-style dark-mode-native Textarea with emerald focus ring.
- `frontends/packages/ui-kit/src/components/Label.tsx`: Supabase-style accessible form Label component.
- `frontends/packages/ui-kit/src/components/Switch.tsx`: Supabase-style Radix UI Switch with emerald active track.
- `frontends/packages/ui-kit/src/components/Tooltip.tsx`: Supabase-style Radix UI Tooltip primitives.
- `frontends/packages/ui-kit/src/components/Separator.tsx`: Supabase-style Radix UI Separator hairline divider.
- `frontends/apps/cloud-dashboard/src/app/panel/runs/new/NewRunRiskSection.tsx`: Extracted safety guardrails section to comply with 800-line limit.
- `frontends/apps/cloud-dashboard/src/app/panel/runs/new/NewRunWalkForwardSection.tsx`: Extracted walk-forward window partitioning section to comply with 800-line limit.
- `frontends/apps/cloud-dashboard/src/components/reports/ExecutionGapsCard.tsx`: Modularized execution gaps card component to adhere to 800-line limit.
- `frontends/apps/cloud-dashboard/src/components/reports/ReportModals.tsx`: Modularized report modals group component to adhere to 800-line limit.
- `frontends/apps/cloud-dashboard/src/components/reports/ReportHeaderActions.tsx`: Modularized report header actions component to adhere to 800-line limit.
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
- `core/tests/Cloud.UnitTests/ProfileServiceSlotAssignmentTests.cs`: Unit test suite verifying automatic marketplace extension provisioning and heartbeat connectivity reporting.
- `frontends/apps/cloud-dashboard/src/app/maintenance/page.tsx`: Dedicated Maintenance and Command Console page for dispatching engine commands with correlation logs and presets.
- `frontends/apps/cloud-dashboard/src/components/layout/MobileBottomNav.tsx`: Apple Design 5-item mobile bottom navigation bar with off-canvas sidebar drawer trigger.
- `frontends/apps/cloud-dashboard/src/app/panel/runs/new`: Dedicated full-page Flow Run Launcher with deterministic configuration form.
- `frontends/apps/cloud-dashboard/src/components/instances/CommandEventDetailModal.tsx`: Modal for inspecting dispatched engine command payloads, parameters, and results.
- `core/src/Cloud/Endpoints/CancelRunEndpoint.cs`: FastEndpoints controller for cancelling an active or paused flow run.
- `frontends/apps/cloud-dashboard/src/app/panel/reports/[id]/windows/page.tsx`: Walk-Forward window splits and out-of-sample degradation analysis page.
- `frontends/apps/cloud-dashboard/src/app/panel/reports/[id]/windows/[windowIndex]/page.tsx`: Individual Walk-Forward window granular performance and chromosome DNA page.
- `frontends/apps/cloud-dashboard/src/components/layout/PublicNav.tsx`: Public header and footer navigation with dynamic authentication state.
- `frontends/apps/cloud-dashboard/src/app/about/page.tsx`: About page detailing quantitative architecture, low-latency execution, and non-custodial design.
- `frontends/apps/cloud-dashboard/src/app/contact/page.tsx`: Operations and trading desk contact page with priority dispatch form.
- `frontends/apps/cloud-dashboard/src/app/terms/page.tsx`: Terms of Service, algorithmic risk disclosures, and software licensing boundaries.
- `frontends/apps/cloud-dashboard/src/app/docs/page.tsx`: Developer documentation for Slots and Hooks (strategies, broker adapters, fitness functions).
- `.github/CODEOWNERS`: Monorepo code ownership rules declaring core team governance.
- `PRODUCT_SKILL.md`: Enterprise product skill specification and project targets for Razor monorepo.
- `.runflare-account`: Runflare deployment active account configuration.
- `.runflareignore`: Runflare deployment build artifact ignore file.
- `Dockerfile`: Multi-stage production container build for unified Razor deployment.
- `Program.cs`: Root entrypoint for production monolithic host container.
- `core/nuget.config`: NuGet package source configuration for core services.
- `core/src/Cloud/Data/BundleDna.cs`: Entity model for trading strategy bundle DNA definitions.
- `core/src/Cloud/Data/BundleSnapshot.cs`: Snapshot data contract for trading strategy bundle exports.
- `core/src/Cloud/Data/MarketplaceAcquisition.cs`: Marketplace item licensing acquisition record.
- `core/src/Cloud/Data/TradingBundle.cs`: Entity model for trading bundle registry and lifecycle.
- `core/src/Cloud/Endpoints/BundleEndpoints.cs`: FastEndpoints controller for creating, querying, and snapshotting trading bundles.
- `core/src/Cloud/Services/BundleService.cs`: Domain service managing bundle validation, slots, and parameter generation.
- `core/tests/Cloud.UnitTests/BundleAndSchemaBranchCoverageTests.cs`: Unit test suite verifying edge cases and branch coverage for trading bundles.
- `core/tests/Cloud.UnitTests/BundleServiceAndEndpointsTests.cs`: Unit test suite for bundle lifecycle endpoints and slot mapping.
- `deploy/entrypoint.sh`: Container entrypoint script managing reverse proxy and service startup.
- `deploy/nginx.conf`: Nginx reverse proxy configuration for port routing.
- `frontends/apps/cloud-dashboard/src/app/bundles/new/page.tsx`: Bundles Studio interactive composition designer page.
- `frontends/apps/cloud-dashboard/src/app/bundles/page.tsx`: Trading bundles catalog and overview page.
- `frontends/apps/cloud-dashboard/src/app/marketplace/layout.tsx`: Marketplace layout wrapper with navigation tabs.
- `frontends/apps/cloud-dashboard/src/app/marketplace/page.tsx`: Embedded marketplace page inside operator dashboard.
- `frontends/apps/cloud-dashboard/src/app/panel/bundles/new/page.tsx`: Panel route for trading bundles creation.
- `frontends/apps/cloud-dashboard/src/app/panel/bundles/page.tsx`: Panel route for trading bundles index.
- `frontends/apps/cloud-dashboard/src/components/bundles/BundleSnapshotPanel.tsx`: UI component for inspecting and downloading bundle snapshot JSON.
- `frontends/apps/cloud-dashboard/src/components/bundles/ComponentSlotGrid.tsx`: Grid UI for assigning strategies, risk managers, and indicators to bundle slots.
- `frontends/apps/cloud-dashboard/src/components/bundles/DynamicParameterGenerator.tsx`: Interactive form generating dynamic parameter overrides for bundle strategies.
- `frontends/apps/cloud-dashboard/src/types/bundle.ts`: TypeScript contracts and type definitions for trading bundles.
- `frontends/apps/marketplace/src/app/payments/page.tsx`: Institutional payment and license checkout flow page.
- `mywebapp.csproj`: Root ASP.NET Core project definition for production host container.
- `nuget.config`: Root NuGet package configuration.
- `scripts/__init__.py`: Python package indicator for EP-OS monorepo automation scripts.
- `scripts/bin/ep`: Unified EP-OS CLI wrapper launcher script.
- `scripts/deploy-runflare.sh`: Runflare deployment CLI orchestrator supporting multi-account switching.
- `scripts/ep.py`: Enterprise Product CLI suite dispatcher (v1.0.0).
- `scripts/ep_adopt.py`: EP-OS automated adoption and project scaffolding engine.
- `scripts/ep_ast.py`: EP-OS AST inspection and refactoring primitives.
- `scripts/ep_context.py`: Monorepo context inspection and architectural profile loader.
- `scripts/ep_doctor.py`: Enterprise health diagnostics and self-healing runner.
- `scripts/ep_hooks.py`: Git hooks management, installation, and validation.
- `scripts/ep_ops.py`: Operational routines and gatekeeper commands.
- `scripts/ep_runner.py`: Multi-target test, lint, and build execution engine.
- `scripts/ep_scaffold.py`: Profile-compliant code generation and boilerplate scaffolding.
- `scripts/ep_security.py`: Secret scanning and credential exposure mitigation.
- `scripts/ep_session.py`: Agent session tracking and lineage auditing.
- `scripts/ep_stack.py`: Monorepo dependency graph and stack analysis.
- `scripts/ep_sync.py`: Synchronization engine between global skill and monorepo scripts.
- `scripts/ep_vcs.py`: Git branch promotion, PR verification, and change tracking.
- `scripts/prepare-wwwroot.py`: Next.js static asset compiler for container packaging.
- `frontends/apps/cloud-dashboard/src/app/auth/register/page.tsx`: Operator and workspace user registration form with validation and direct /panel redirection.
- `frontends/apps/cloud-dashboard/src/app/register/page.tsx`: Re-export page for /register route.
- `frontends/apps/cloud-dashboard/src/test/auth-register.test.tsx`: Vitest suite verifying registration page rendering, password validation, API dispatch, and navigation.

### Modified Files
- `core/src/Cloud/Cloud.csproj`: Added FastEndpoints, Microsoft.AspNetCore.OpenApi, and project dependencies.
- `scripts/audit-runner.py`: Enhanced heuristic rules, non-UTC timestamp detection, and 10-dimension audit scorecard.
- `scripts/check-nc-items.py`: Updated NC item validation logic and expiration warnings.
- `scripts/validate-change-surface.py`: Added strict placeholder checks and wildcards detection in code surface.
- `scripts/verify-agent-manifests.py`: Enhanced AGENT.md frontmatter validation and SLO tier checks.
- `core/src/Cloud/Data/CloudDbContext.cs`: Added custom ValueConverter for UserRole mapping legacy 'Developer' entries to Trader.
- `core/src/Cloud/Data/CloudEnums.cs`: Cloud enums for roles, licenses, and command state.
- `core/src/Cloud/Data/User.cs`: Extended User entity with international phone numbers, secondary email, MFA toggles, and connected storage drives.
- `core/src/Cloud/Endpoints/FlowRunView.cs`: Added TotalReturn and DrawdownHit indicators for Flow Run views.
- `core/src/Cloud/Endpoints/ListInstanceCommandsEndpoint.cs`: Added command payload and response serialization for inspection modals.
- `core/src/Cloud/Endpoints/TicketEndpoints.cs`: Enhanced ticket sorting, filtering, and paging endpoints.
- `core/src/Cloud/Services/CommandService.cs`: Enhanced command persistence with detailed event payloads and execution results.
- `core/src/Cloud/Services/FlowOrchestrator.cs`: Added deterministic rerun, cancel run, and clone-from support in flow run pipelines.
- `core/src/Cloud/Services/TicketService.cs`: Support for operator triage, descending order message logs, and multi-parameter filtering.
- `core/src/Cloud/Services/UserService.cs`: Enhanced user profile updates and impersonation support.
- `core/src/Engine/Kernel/KernelService.Optimization.cs`: GA parameter optimization with convergence progression telemetry.
- `core/src/Engine/Kernel/KernelService.Live.cs`: Resilient fallback to MockPaperTradingAdapter and MeanRevertingPairsStrategy/TrendFollowingStrategy.
- `core/src/Engine/Management/Tasks/BacktestConfiguration.cs`: Configuration models for backtest runs with initial capital and symbol specifications.
- `core/src/Engine/Management/Tasks/ConfigurationParser.cs`: JSON configuration parser for multi-format run payloads.
- `core/src/Engine/Management/Tasks/LiveConfiguration.cs`: Configuration models for live execution risk targets and drawdown boundaries.
- `core/tests/Cloud.UnitTests/AuthEndpointsTests.cs`: Unit tests for authentication and token validation.
- `core/tests/Cloud.UnitTests/CloudBranchCoverageTests.cs`: Branch coverage test suites for cloud endpoints.
- `core/tests/Cloud.UnitTests/CloudGovernanceBranchTests.cs`: Branch coverage test suites for governance and RBAC rules.
- `frontends/apps/cloud-dashboard/src/app/admin/ClusterSettingsForm.tsx`: Unified cluster settings form with messenger webhooks, SMS providers, and subscription tier matrices.
- `frontends/apps/cloud-dashboard/src/app/auth/login/page.tsx`: High-contrast institutional login form with role switching.
- `frontends/apps/cloud-dashboard/src/app/globals.css`: Institutional high-contrast light mode styling and global button text-wrap: nowrap !important rule.
- `frontends/apps/cloud-dashboard/src/app/panel/runs/page.tsx`: Flow runs directory with Total Return, Drawdown Hit badges, and New Run redirection.
- `frontends/apps/cloud-dashboard/src/app/panel/runs/new/page.tsx`: Full-page Flow Run Launcher with dynamic gene controls, Tick default, and unbounded walk-forward split validation.
- `frontends/apps/cloud-dashboard/src/app/panel/reports/[id]/page.tsx`: Full run report page with bracket stripping and cancel run support.
- `frontends/apps/cloud-dashboard/src/app/panel/reports/[id]/generations/page.tsx`: Full generations grid with server-side pagination.
- `frontends/apps/cloud-dashboard/src/app/panel/reports/[id]/generations/[genId]/page.tsx`: Full generation detail page.
- `frontends/apps/cloud-dashboard/src/app/panel/reports/[id]/generations/[genId]/populations/[popId]/page.tsx`: Full chromosome evaluator page.
- `frontends/apps/cloud-dashboard/src/app/panel/reports/[id]/trades/page.tsx`: Full trade fill directory.
- `frontends/apps/cloud-dashboard/src/app/panel/reports/[id]/trades/[ticket]/page.tsx`: Full trade fill telemetry page.
- `frontends/apps/cloud-dashboard/src/app/runs`: Detailed flow run execution and audit report view.
- `frontends/apps/cloud-dashboard/src/app/tickets/page.tsx`: Incident triage console with lazy message loading and status transitions.
- `frontends/apps/cloud-dashboard/src/components/instances/tabs/InstanceExtensionsTab.tsx`: Extension slot configuration with modal assignment triggers.
- `frontends/apps/cloud-dashboard/src/components/instances/tabs/InstanceOverviewTab.tsx`: Engine overview tab with opcode commands and status summary.
- `frontends/apps/cloud-dashboard/src/components/instances/tabs/InstanceStreamsTab.tsx`: Live stream event feed with tail-lock autoscroll.
- `frontends/apps/cloud-dashboard/src/components/instances/tabs/InstanceTelemetryTab.tsx`: Real-time telemetry charts and execution gauges.
- `frontends/apps/cloud-dashboard/src/components/layout/header.tsx`: Removed 'Razor Cloud Control Plane' text; cleaned up topbar.
- `frontends/apps/cloud-dashboard/src/components/layout/sidebar.tsx`: Replaced engine sockets/Cloud API footer with mini profile.
- `frontends/apps/cloud-dashboard/src/components/live/EmergencyStopModal.tsx`: High-visibility emergency kill switch confirmation modal.
- `frontends/apps/cloud-dashboard/src/components/live/LiveManagerContent.tsx`: Live trading operations console with real-time controls and position flattening.
- `frontends/apps/cloud-dashboard/src/components/live/LivePositionsTable.tsx`: Tabular open position monitor with 1-click flatten controls.
- `frontends/apps/cloud-dashboard/src/components/live/LiveRiskConfigModal.tsx`: Dynamic circuit breaker risk limit configuration modal.
- `frontends/apps/cloud-dashboard/src/components/live/LiveStatsSummary.tsx`: Real-time institutional PnL and risk summary gauges.
- `frontends/apps/cloud-dashboard/src/components/live/LiveTradeHistoryTable.tsx`: Executed fill history table with granular trade inspection.
- `frontends/apps/cloud-dashboard/src/components/optimization/GenerationDetailModal.tsx`: Genetic algorithm generation inspection modal.
- `frontends/apps/cloud-dashboard/src/components/optimization/PopulationBacktestModal.tsx`: Individual chromosome DNA backtest launcher modal.
- `frontends/apps/cloud-dashboard/src/components/reports/DetailedMetricsGrid.tsx`: Institutional quantitative KPI metrics grid.
- `frontends/apps/cloud-dashboard/src/components/reports/report-content.tsx`: Stripped brackets, added Cancel Run, added Generations (Dev) button.
- `frontends/apps/cloud-dashboard/src/components/reports/TradeHistoryTable.tsx`: Full trade fills ledger.
- `frontends/apps/cloud-dashboard/src/components/reports/WinningDnaCard.tsx`: Decoded Strategy Parameters key-value table wrapping parameter names.
- `frontends/packages/api-client/src/schema/paths-runs.ts`: Added /api/runs/{runId}/cancel endpoint schema.
- `frontends/apps/cloud-dashboard/src/components/reports/GenerationalConvergenceChart.tsx`: Convergence diversity and fitness trajectory charts.
- `frontends/apps/cloud-dashboard/src/components/reports/TradeHistoryTable.tsx`: Full trade fill execution ledger with entry/exit timestamps.
- `frontends/apps/cloud-dashboard/src/components/reports/WinningDnaCard.tsx`: Winning strategy DNA parameters and JSON export card.
- `frontends/apps/cloud-dashboard/src/components/tickets/CreateTicketModal.tsx`: Modal for creating and dispatching operations support tickets.
- `frontends/apps/cloud-dashboard/src/components/trades/GranularTradeDetailModal.tsx`: Granular price ladder, venue, and audit telemetry modal.
- `frontends/apps/cloud-dashboard/src/components/ui/ActionDropdown.tsx`: Portaled actions dropdown preventing table overflow clipping.
- `frontends/apps/cloud-dashboard/src/context/auth-context.tsx`: Context provider with impersonation session switching and storage sync.
- `frontends/packages/api-client/src/schema/types.ts`: TypeScript schema types for platform settings, users, and ticket payloads.
- `.gitignore`: Added root ignores for compiled native binaries (/bin/, /artifacts/, /publish/).
- `core/src/Engine/AGENT.md`: Added nx publish engine target delegation.
- `core/src/Engine/Engine.csproj`: Added single-file self-contained publish configuration defaults.
- `core/src/Engine/project.json`: Added publish target delegating to node scripts/build-engine.mjs.
- `package.json`: Added helper scripts for dev orchestration, direct engine execution, and test running.
- `core/src/Cloud/Endpoints/GetInstanceEndpoint.cs`: Injected EngineSessionRegistry to synchronize real-time socket connectivity and fresh heartbeats with IsConnected response state.
- `core/src/Cloud/Endpoints/ListInstancesEndpoint.cs`: Factored recent heartbeat timestamp freshness into IsConnected status calculation.
- `core/src/Cloud/Services/ProfileService.cs`: Added self-healing auto-provisioning of ExtensionManifestEntry for valid marketplace extensions on slot configuration.
- `frontends/apps/cloud-dashboard/src/app/layout.tsx`: Pure light mode enforcement; removed dark class and styled background for zero dark flash.
- `frontends/apps/marketplace/src/app/layout.tsx`: Pure light mode enforcement; removed dark class and styled background for zero dark flash.
- `frontends/packages/ui-kit/src/components/ThemeToggle.tsx`: Neutralized to light mode enforcer with zero visual rendering.
- `frontends/packages/ui-kit/src/components/Badge.tsx`: Added outline variant support for subtle enterprise status tags.
- `frontends/apps/cloud-dashboard/src/components/instances/SlotAssignmentModal.tsx`: Upgraded slot configuration UX with direct marketplace link and installed manifest badges.
- `frontends/apps/cloud-dashboard/src/components/layout/sidebar.tsx`: Added off-canvas sliding mobile drawer and maintenance navigation entry.
- `frontends/apps/cloud-dashboard/src/components/layout/dashboard-shell.tsx`: Integrated off-canvas drawer toggle state and fixed 5-item mobile bottom navigation.
- `frontends/apps/cloud-dashboard/src/components/layout/header.tsx`: Added mobile hamburger navigation trigger.
- `frontends/apps/marketplace/src/app/page.tsx`: Added contextual target engine install workflow and tablist accessibility roles.
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
- `frontends/apps/cloud-dashboard/src/app/runs/[id]/page.tsx`: Flow run audit and performance detail view.
- `frontends/apps/cloud-dashboard/src/components/instances/instance-detail-content.tsx`: Decomposed from 698 lines down to 443 lines via extracted modals.
- `frontends/apps/cloud-dashboard/src/components/lineage/lineage-content.tsx`: Decomposed from 655 lines down to 312 lines via extracted modals and node views.
- `frontends/apps/cloud-dashboard/src/components/reports/report-content.tsx`: Decomposed from 512 lines down to 414 lines via `CompleteRunModal.tsx`.
- `frontends/apps/marketplace/src/app/login/page.tsx`: Marketplace authentication portal with quick demo personas.
- `frontends/apps/marketplace/src/app/tickets/page.tsx`: Decomposed from 504 lines down to 396 lines via `CreateTicketModal.tsx`.
- `frontends/apps/marketplace/src/components/items/item-detail-content.tsx`: Decomposed from 517 lines down to 340 lines via extracted card and modal components.
- `frontends/packages/api-client/src/index.ts`: Bundler-compatible extensionless module imports for Next.js webpack compatibility.
- `frontends/packages/api-client/src/schema/index.ts`: Bundler-compatible extensionless module imports for Next.js webpack compatibility.
- `frontends/packages/ui-kit/package.json`: Updated exports configuration for component primitives.
- `frontends/packages/ui-kit/src/index.ts`: Export barrel for all presentation components.
- `frontends/packages/ui-kit/tsconfig.json`: Strict TypeScript build configuration for component library.

- `core/src/Cloud/CloudApplication.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Data/EngineShare.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Data/FlowRun.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Data/LineageEnums.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Data/PagedResult.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/AcquireMarketplaceItemEndpoint.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/AuthEndpoints.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/CommunityEndpoints.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/CompleteRunEndpoint.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/EngineSharingEndpoints.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/ExportRunReportXlsxEndpoint.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/GenerationEndpoints.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/GetMarketplaceItemEndpoint.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/HealthEndpoint.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/ListMarketplaceItemsEndpoint.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/ListReportsEndpoint.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/ListRunsEndpoint.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/ManagementApiKeyMiddleware.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/RegisterEngineEndpoint.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/StartRunEndpoint.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/StreamClientEventsEndpoint.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/SubmitCommandEndpoint.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Endpoints/TradeEndpoints.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Services/EngineAuthenticationService.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Services/EngineRegistrationService.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Services/FlowRunExcelExportService.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Services/LineageContracts.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Services/LineageService.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Services/MarketplaceService.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/Services/RunReportService.cs`: Cloud backend controllers and domain services.
- `core/src/Cloud/appsettings.Development.json`: Cloud backend controllers and domain services.
- `core/src/Engine/Communication/CloudConnector.Heartbeat.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Communication/CloudConnector.Messaging.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Core/Credentials.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Extensions/ExtensionCatalog.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Extensions/ExtensionManager.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Extensions/IExtensionManager.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/CommandDispatcher.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/CommandHandlerBase.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/Handlers/DeployExtensionHandler.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/Handlers/GetLiveMetricsHandler.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/Handlers/GetLiveStateHandler.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/Handlers/InjectGenesHandler.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/Handlers/PauseLiveHandler.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/Handlers/ResumeLiveHandler.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/Handlers/RunBacktestHandler.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/Handlers/SetLiveConfigHandler.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/Handlers/StartOptimizationHandler.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/Handlers/StopLiveHandler.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Engine/Management/Commands/ICommandHandler.cs`: Strategy engine handlers and runtime tasks.
- `core/src/Kernel/Hooks/FitnessEvaluationContext.cs`: Enterprise product component update.
- `core/src/Kernel/Reporting/ReportGenerator.cs`: Enterprise product component update.
- `core/src/Sdk/Slots/Adapter/MockPaperTradingAdapter.cs`: Enterprise product component update.
- `core/src/Sdk/Slots/Strategy/MeanRevertingPairsStrategy.cs`: Enterprise product component update.
- `core/src/Sdk/Slots/Strategy/TrendFollowingStrategy.cs`: Enterprise product component update.
- `core/src/Shared/Helpers.cs`: Enterprise product component update.
- `core/src/Shared/MemoryMappedTickList.cs`: Enterprise product component update.
- `core/tests/Cloud.UnitTests/CloudEngineSocketTests.cs`: Unit and integration test suites.
- `core/tests/Cloud.UnitTests/CommunityAndTicketingTests.cs`: Unit and integration test suites.
- `core/tests/Cloud.UnitTests/Lineage/FlowOrchestratorTests.cs`: Unit and integration test suites.
- `core/tests/Cloud.UnitTests/ManifestAndCommandTests.cs`: Unit and integration test suites.
- `core/tests/Cloud.UnitTests/TestSupport/CloudTestContext.cs`: Unit and integration test suites.
- `core/tests/Engine.UnitTests/Management/Commands/CommandDispatcherTests.cs`: Unit and integration test suites.
- `core/tests/Engine.UnitTests/Management/Tasks/OptimizationCheckpointTests.cs`: Unit and integration test suites.
- `core/tests/Engine.UnitTests/Management/Tasks/TaskManagerTests.cs`: Unit and integration test suites.
- `core/tests/Sdk.UnitTests/Shared/MeanRevertingPairsStrategyTests.cs`: Unit and integration test suites.
- `core/tests/Sdk.UnitTests/Shared/TrendFollowingStrategyTests.cs`: Unit and integration test suites.
- `frontends/apps/cloud-dashboard/next.config.mjs`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/instances/[id]/live/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/instances/[id]/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/live/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/login/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/admin/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/instances/[id]/live/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/instances/[id]/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/instances/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/layout.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/live/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/maintenance/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/profile/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/reports/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/runs/[id]/lineage/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/runs/[id]/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/settings/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/tickets/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/panel/trades/[ticket]/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/app/reports/[id]/page.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/components/instances/ShareEngineModal.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/components/reports/EquityCurveChart.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/components/ui/ServerPagination.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/components/ui/toast.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/hooks/use-sse-stream.ts`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/lib/api-client.ts`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/test/auth-login.test.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/test/instances.test.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/test/lineage.test.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/test/live.test.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/test/report.test.tsx`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/src/test/setup.ts`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/cloud-dashboard/tailwind.config.ts`: Cloud dashboard operator console and sub-pages.
- `frontends/apps/marketplace/next.config.mjs`: Marketplace application routes and components.
- `frontends/apps/marketplace/src/app/community/[id]/page.tsx`: Marketplace application routes and components.
- `frontends/apps/marketplace/src/app/globals.css`: Marketplace application routes and components.
- `frontends/apps/marketplace/src/app/items/[id]/page.tsx`: Marketplace application routes and components.
- `frontends/apps/marketplace/src/components/layout/navbar.tsx`: Marketplace application routes and components.
- `frontends/apps/marketplace/src/components/ui/toast.tsx`: Marketplace application routes and components.
- `frontends/apps/marketplace/src/lib/api-client.ts`: Marketplace application routes and components.
- `frontends/apps/marketplace/src/test/setup.ts`: Marketplace application routes and components.
- `frontends/apps/marketplace/tailwind.config.ts`: Marketplace application routes and components.
- `frontends/packages/api-client/src/schema/paths.ts`: Enterprise product component update.
- `samples/Directory.Build.props`: Sample trading strategies and broker adapters.
- `samples/Plugins/Adapters/MT5/MT5.csproj`: Sample trading strategies and broker adapters.
- `samples/Plugins/Adapters/MT5/Mt5Adapter.cs`: Sample trading strategies and broker adapters.
- `samples/Plugins/Adapters/MT5/Mt5AdapterConfiguration.cs`: Sample trading strategies and broker adapters.
- `samples/Plugins/Adapters/MT5/Mt5BridgeClient.cs`: Sample trading strategies and broker adapters.
- `samples/Plugins/Adapters/MT5/Mt5MarketCalculator.cs`: Sample trading strategies and broker adapters.
- `samples/Plugins/Adapters/Nobitex/Class1.cs`: Sample trading strategies and broker adapters.
- `samples/Plugins/Adapters/Nobitex/Nobitex.csproj`: Sample trading strategies and broker adapters.
- `samples/Plugins/Adapters/Nobitex/NobitexAdapter.cs`: Sample trading strategies and broker adapters.
- `samples/Plugins/Adapters/Nobitex/NobitexAdapterConfiguration.cs`: Sample trading strategies and broker adapters.
- `samples/Plugins/Adapters/Nobitex/NobitexMarketCalculator.cs`: Sample trading strategies and broker adapters.
- `samples/Plugins/Strategies/CfdSmtDivergence/CfdSmtDivergence.csproj`: Sample trading strategies and broker adapters.
- `samples/Plugins/Strategies/CfdSmtDivergence/CfdSmtDivergenceStrategy.cs`: Sample trading strategies and broker adapters.
- `samples/Plugins/Strategies/CfdSmtDivergence/Class1.cs`: Sample trading strategies and broker adapters.
- `samples/Samples.sln`: Sample trading strategies and broker adapters.

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
