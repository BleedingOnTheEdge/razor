---
id: product:razor/blueprint/frontends/architecture
parent: product:razor/blueprint/frontends
title: Frontend Architecture
level: product
kind: blueprint
domains:
  - cloud
  - marketplace
  - security
  - reporting
keywords:
  - nextjs
  - app router
  - react 19
  - hexagonal architecture
  - ports and adapters
  - ddd
  - server components
  - client components
  - sse streaming
  - real-time
  - utc conversion
  - internationalisation
  - accessibility
  - wcag
references:
  - product:razor/blueprint/product-model
  - product:razor/blueprint/internal-architecture
code_paths:
  - frontends/**
test_paths:
  - frontends/apps/cloud-dashboard/**
  - frontends/apps/marketplace/**
  - frontends/packages/**
---

# Frontend Architecture

## Architectural Thesis

Razor frontends serve two distinct stakeholder workflows across the trading engine ecosystem:
1. **Operator SaaS Control Plane (`cloud-dashboard`)**: A mission-critical, low-latency operational interface for algorithmic traders and fund operators to monitor engine health, configure extension profile slots, dispatch commands, and inspect real-time execution lineage and audit interventions.
2. **Curated Extension Marketplace (`marketplace`)**: An accessible, discoverable catalogue for algorithmic trading extensions (adapters, strategies, indicators, neural networks, and hook plugins), licensing acquisition, and deployment coordination.

Both applications reside in a unified monorepo managed by **Nx** and **pnpm workspaces**, built on **Next.js 15 (App Router)** and **React 19** with strict TypeScript.

## Technology Stack

| Layer | Selection | Justification |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Enterprise-standard React framework offering hybrid rendering (React Server Components for data prefetching and Client Components for low-latency stateful controls), route handlers, and streaming layouts. |
| **Runtime & Language** | Node.js 22 LTS, TypeScript 5.7+ | Strict typing across the boundary, zero-alloc contract alignment, and end-to-end type safety. |
| **Package & Task Orchestration** | pnpm 12 workspaces + Nx 20 | Hard-linked package deduplication with strict isolation boundaries (pnpm), combined with Nx computational caching, project graph analysis, and affected task execution. |
| **Styling & Design Tokens** | Tailwind CSS 3.4+ | Utility-first, predictable dark-palette design tokens with zero runtime CSS-in-JS overhead. |
| **UI Primitives** | Radix UI | Headless, accessible primitives fulfilling WCAG 2.2 AA requirements (accessible keyboard interaction, ARIA attributes, focus management). |
| **Icons** | Lucide React | Clean, scalable icon system matching enterprise density. |
| **Data Fetching & State** | TanStack Query v5 + `@razor/api-client` | Deduplicated query caching, optimistic mutation, window focus refetching, and typed OpenAPI contracts. |
| **Real-Time Stream** | Native `EventSource` (SSE) | Server-Sent Events over HTTP connecting to `/api/events/stream` for domain event distribution with automatic reconnect. |

## Hexagonal Architecture & Domain-Driven Design (DDD)

In compliance with Enterprise Directives 3.6 (DDD) and 3.7 (Hexagonal Architecture), the frontend code is structured into clear domain, port, and adapter layers:

```text
frontends/
├── packages/
│   ├── contracts/            <- Core Domain: Entities, Enums, Value Objects, Domain Events
│   ├── api-client/           <- Secondary Adapter: Typed OpenAPI HTTP client (Outbound Port)
│   └── ui-kit/               <- Formatting Port & Adapters: Multi-cultural formatting, status tokens
└── apps/
    ├── cloud-dashboard/      <- Primary Adapter: Operator UI application
    └── marketplace/          <- Primary Adapter: Marketplace UI application
```

### 1. Domain Layer (`@razor/contracts`)
The domain layer defines pure TypeScript interfaces and types with zero framework dependencies:
- **Entities & Payloads**: `FlowRunPayload`, `LineageNodePayload`, `RunReportPayload`, `MarketplaceItemPayload`.
- **Value Enums**: `EngineInstanceStatus`, `ExtensionKind`, `CommandStatus`, `RunKind`, `RunStatus`, `RunRelation`, `RunContinuity`, `RankingMetric`.
- **Domain Events**: `ClientEvent<T>` representing immutable domain events broadcast by the Cloud control plane.

### 2. Ports (Interfaces)
- **`IApiClientPort`**: Contract for asynchronous HTTP queries and mutations against Cloud endpoints.
- **`IEventStreamPort`**: Contract for subscribing to real-time domain event streams.
- **`IFormatterPort`**: Contract for multi-cultural, locale-aware formatting of currencies, percentages, dates, and cryptographic hashes.

### 3. Adapters (Implementations)
- **HTTP Adapter (`@razor/api-client`)**: Implements `IApiClientPort` using `openapi-fetch`, automatically injecting authentication headers (`X-Cloud-Management-Key`) and producing strongly typed results.
- **SSE Stream Adapter (`useSseStream`)**: Implements `IEventStreamPort` using native browser `EventSource` with exponential backoff reconnect logic.
- **Formatters (`@razor/ui-kit`)**: Implements `IFormatterPort` using standard `Intl.DateTimeFormat` and `Intl.NumberFormat`.

## Temporal and Multi-Cultural Discipline (Rules 9.11 & 9.19)

### 1. UTC Storage & Frontend Conversion (Rule 9.11)
- The backend stores and transmits all timestamps in strict **UTC ISO-8601** strings (`2026-10-12T02:00:00Z`).
- The frontend **never** manipulates raw date strings; instead, it passes UTC strings through `formatTimestamp()`, which resolves the user's local browser timezone and preferred locale dynamically.

### 2. Multi-Cultural Support (Rule 9.19)
- **Currency**: `formatCurrency(amount, currency)` uses `Intl.NumberFormat` with locale-aware symbol placement and fractional precision.
- **Percentages**: `formatPercentage(ratio)` standardizes positive sign indicators (`+12.50%`) and decimal precision.
- **RTL Readiness**: Layouts use logical CSS properties (`ms-*`, `me-*`, `start-*`, `end-*`) or bi-directional flex/grid layouts to respect right-to-left locales.

## Accessibility Standards (WCAG 2.2 AA — Rule 9.18)

1. **Color Contrast**: All text elements meet a minimum contrast ratio of 4.5:1 against their backgrounds (zinc-950/zinc-900 backgrounds with zinc-100/zinc-200 text). Status badges use high-contrast foreground text with complementary translucent borders and fills.
2. **Keyboard Navigation**: All interactive elements (buttons, inputs, links, tabs) maintain distinct `:focus-visible` focus rings (`outline-cyan-500`).
3. **Semantic Landmarks**: Pages utilize `<header>`, `<nav>`, `<aside>`, `<main>`, and `<footer>` elements.
4. **Live Regions**: Real-time event notifications utilize `aria-live="polite"` to avoid disorienting screen readers during rapid high-frequency event ingestion.

## Build and Workspace Task Pipeline (Rule 7.1)

All frontend builds and validations execute through **Nx**:
```bash
nx run-many -t build    # Typechecks packages and builds Next.js applications
nx run-many -t lint     # Validates syntax and style across all packages and apps
nx run-many -t test     # Executes frontend test suites
```
Computational cache hashes inputs across package boundaries, ensuring instant rebuilds when shared packages are unchanged.
