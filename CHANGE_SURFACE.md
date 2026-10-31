---
title: "Core Memory, Determinism, Precision, and Resilience Overhaul"
author: "sinavali"
created_date: "2026-10-31"
target_branch: "fix/core-memory-and-resilience"
risk_level: "MEDIUM"
affected_projects:
  - "core"
---

# Change Surface: Core Memory, Determinism, Precision, and Resilience Overhaul

## 1. Intent & Business Rationale
Remediate core trading engine memory management, time precision, determinism, and exception resilience:
- Fix pointer handle leak on finalization in `MemoryMappedTickList` and add `FileShare.Read` for concurrent readers (Issue #92).
- Eliminate non-deterministic PRNG and system clock leaks in `MockPaperTradingAdapter` by introducing deterministic seedable generation and time provider abstraction (Issue #93).
- Prevent sub-second precision truncation in `TimeHelpers` with millisecond and microsecond conversions (Issue #94).
- Replace bare `catch` blocks swallowing exceptions across backend services with explicit typed exception filters and structured resilience (Issue #95).
- Expand `IOptimizer` lifecycle contracts and implement `OnnxNeuralNetworkAdapter` implementing `INeuralNetworkModel` (Issue #96).

## 2. Affected Monorepo Projects
- `core`

## 3. Code Surface
### Modified Files
- `core/src/Cloud/Endpoints/FlowRunView.cs`
- `core/src/Cloud/Services/CommandService.cs`
- `core/src/Cloud/Services/FlowOrchestrator.cs`
- `core/src/Cloud/Services/RunReportService.cs`
- `core/src/Engine/Communication/BinaryTransferManager.cs`
- `core/src/Engine/Communication/CloudConnector.cs`
- `core/src/Engine/Management/Commands/Handlers/RunBacktestHandler.cs`
- `core/src/Engine/Management/Commands/Handlers/StartOptimizationHandler.cs`
- `core/src/Engine/Management/Tasks/BacktestConfiguration.cs`
- `core/src/Engine/Management/Tasks/LiveConfiguration.cs`
- `core/src/Engine/Services/Update/SelfUpdateManager.cs`
- `core/src/Kernel/Brokers/LiveBroker.Session.cs`
- `core/src/Kernel/Indicators/IndicatorRegistry.cs`
- `core/src/Kernel/NeuralNetworks/OnnxNeuralNetworkAdapter.cs`
- `core/src/Kernel/Optimization/IOptimizer.cs`
- `core/src/Kernel/Optimization/OptimizationRunner.cs`
- `core/src/Sdk/Slots/Adapter/MockPaperTradingAdapter.cs`
- `core/src/Shared/Helpers.cs`
- `core/src/Shared/MemoryMappedTickList.cs`
- `core/tests/Kernel.UnitTests/NeuralNetworks/OnnxNeuralNetworkAdapterTests.cs`
- `core/tests/Sdk.UnitTests/Shared/BinaryDataMapperTests.cs`
- `core/tests/Sdk.UnitTests/Shared/HelpersTests.cs`
- `core/tests/Sdk.UnitTests/Shared/MockPaperTradingAdapterTests.cs`

## 4. Test Surface
### Unit & Integration Suites
- `core/tests/Kernel.UnitTests/NeuralNetworks/OnnxNeuralNetworkAdapterTests.cs`
- `core/tests/Sdk.UnitTests/Shared/BinaryDataMapperTests.cs`
- `core/tests/Sdk.UnitTests/Shared/HelpersTests.cs`
- `core/tests/Sdk.UnitTests/Shared/MockPaperTradingAdapterTests.cs`

## 5. Invariants
- UTC timestamps preserved across all persistence models and conversions.
- Unmanaged pointer handles must be safely released during both normal disposal and GC finalization.
- Algorithmic simulations must be 100% deterministic given the same random seed.

## 6. Risk Matrix
- Rollback: Revert commits via standard git rollback.
- Blast radius bounded strictly to declared Code Surface.
