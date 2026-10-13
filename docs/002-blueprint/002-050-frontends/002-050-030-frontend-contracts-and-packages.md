---
id: product:razor/blueprint/frontends/contracts-and-packages
parent: product:razor/blueprint/frontends
title: Frontend Contracts and Shared Packages
level: product
kind: blueprint
domains:
  - cloud
  - marketplace
  - extensions
  - sdk
keywords:
  - shared packages
  - contracts
  - domain types
  - api client
  - openapi fetch
  - ui kit
  - design tokens
  - formatters
  - badges
references:
  - product:razor/blueprint/frontends/architecture
code_paths:
  - frontends/packages/**
test_paths:
  - frontends/packages/**
---

# Frontend Contracts and Shared Packages

## Overview & Scope

The `frontends/packages/` workspace hosts shared libraries consumed across all Razor frontend applications (`cloud-dashboard` and `marketplace`). These libraries enforce domain boundaries, guarantee type safety against backend OpenAPI contracts, and provide standardized UI design tokens and formatting primitives.

```text
frontends/packages/
├── contracts/       <- Domain models, value enums, SSE client events
├── api-client/      <- OpenAPI typed fetch client wrapper
└── ui-kit/          <- Multi-cultural formatters, status badges, design tokens
```

## Package Specifications

### 1. `@razor/contracts`
Provides core TypeScript domain definitions mirroring the .NET backend models in `core/src/Kernel` and `core/src/Cloud`:

- **Enums & Value Types**:
  - `EngineInstanceStatus`: `'Pending' | 'Active' | 'Draining' | 'Decommissioned'`
  - `ExtensionKind`: `'Adapter' | 'Strategy' | 'Indicator' | 'NeuralNetwork' | 'HookPlugin'`
  - `CommandStatus`: `'Queued' | 'Dispatched' | 'Delivered' | 'Completed' | 'Failed' | 'TimedOut'`
  - `RunKind`: `'Backtest' | 'Optimization' | 'WalkForward'`
  - `RunStatus`: `'Pending' | 'Running' | 'Paused' | 'Completed' | 'Failed' | 'Cancelled'`
  - `RunRelation`: `'Original' | 'Appended' | 'Branched' | 'Spliced'`
  - `RunContinuity`: `'Contiguous' | 'Gapped'`
  - `RankingMetric`: `'NetProfit' | 'SharpeRatio' | 'TotalReturn' | 'MaxDrawdown' | 'Fitness'`

- **Real-Time Client Events**:
  - `ClientEvent<T>`: Schema for Server-Sent Events distributed over `/api/events/stream`.
  - Checkpoint specifications: `ForkPoint`, `InterventionSpecification`, `GapSpecification`, and `ReportAggregateMetrics`.

### 2. `@razor/api-client`
Provides an OpenAPI-typed fetch client based on `openapi-fetch`:
- **Paths Definition**: Strongly typed schema covering all Cloud endpoints (`/api/instances`, `/api/commands`, `/api/runs`, `/api/marketplace/items`).
- **Client Factory**:
  ```typescript
  export function createRazorClient(config: RazorClientConfig): RazorClient
  ```
  Injects base URL, authentication headers (`X-Cloud-Management-Key`), and supports custom fetch implementations for server or client environments.
- **Code Generation**: Automated generation via `openapi-typescript` pointing directly to the Cloud OpenAPI definition (`/swagger/v1/swagger.json`).

### 3. `@razor/ui-kit`
Provides zero-dependency UI helpers, financial formatters, and status badge token generators:

- **Formatters (Rules 9.11 & 9.19)**:
  - `formatCurrency(amount, currency)`: Locale-aware financial currency display.
  - `formatPercentage(ratio, withSign)`: Signed decimal percentage formatter.
  - `formatTimestamp(isoString)`: Dynamic UTC-to-local timezone converter.
  - `formatHash(hash, length)`: Truncated cryptographic hash formatter.

- **Status Token Generators**:
  - `getInstanceStatusBadge(status)`: Classes for engine health badges.
  - `getRunStatusBadge(status)`: Classes for run execution states.
  - `getRunRelationBadge(relation)`: Classes for lineage relationship badges.
  - `getCommandStatusBadge(status)`: Classes for command lifecycle stages.
  - `getExtensionKindBadge(kind)`: Classes for marketplace and manifest slot badges.
