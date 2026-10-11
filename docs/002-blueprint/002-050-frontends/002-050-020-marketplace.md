---
id: product:razor/blueprint/frontends/marketplace
parent: product:razor/blueprint/frontends
title: Razor Extension Marketplace
level: product
kind: blueprint
domains:
  - marketplace
  - cloud
  - licensing
  - extensions
flows:
  - extension-deployment
  - onboarding
keywords:
  - marketplace
  - extensions
  - plugins
  - strategies
  - adapters
  - indicators
  - neural networks
  - hooks
  - licensing
  - license acquisition
  - catalogue
references:
  - product:razor/blueprint/frontends/architecture
  - product:razor/blueprint/product-model
code_paths:
  - frontends/apps/marketplace/**
test_paths:
  - frontends/apps/marketplace/**
---

# Razor Extension Marketplace

## Overview & Scope

The **Razor Extension Marketplace** (`frontends/apps/marketplace`) is the public and operator-facing catalogue for discovering, inspecting, licensing, and distributing extensions across the Razor trading ecosystem. It provides algorithmic traders and developers with a curated ecosystem of:
- **Adapters**: Exchange and broker execution gateways (Binance, Bybit, Interactive Brokers).
- **Strategies**: Systematic alpha models, trend-following systems, and mean-reversion algorithms.
- **Indicators**: Technical and quantitative signal calculation units.
- **Neural Networks**: Deep learning models adhering to `INeuralNetworkModel`.
- **Hook Plugins**: Risk overlays, transaction cost modeling, and compliance monitors.

The application is built on **Next.js 15 (App Router)** utilizing Universal Server-Side Rendering (SSR) and Incremental Static Regeneration (ISR) to optimize catalogue search indexing, high-performance page loads, and transactional security.

## Core Capabilities & Route Map

| Route | Purpose | Key Data Sources |
|---|---|---|
| `/` | Catalogue explorer: multi-slot filtering, full-text search, curation badge filters, and pricing display. | `GET /api/marketplace/items` |
| `/items/[id]` | Extension detail view: full specification, author details, SDK compatibility, download statistics, and acquisition modal. | `GET /api/marketplace/items/{id}` |
| `/items/[id]/acquire` | License acquisition flow: generates license key and notifies Cloud control plane for instant engine deployment. | `POST /api/marketplace/items/{id}/acquire` |

## Key Architectural Modules

### 1. Extension Discovery & Filtering (`/`)
- **Slot Taxonomy Filter**: Tabs filtering by `ExtensionKind` (`Adapter`, `Strategy`, `Indicator`, `NeuralNetwork`, `HookPlugin`).
- **Curated Quality Badging**: Highlights extensions audited by the core engineering team with verified deterministic execution benchmarks.
- **Financial Formatting**: Displays pricing via `@razor/ui-kit`'s `formatCurrency()`, handling free (`$0.00`) and commercial extensions.
- **Search & Query Parameters**: Synchronizes search queries with URL search params (`?kind=Strategy&query=momentum`) for shareable, bookmarkable search results.

### 2. Extension Specification & Compatibility (`/items/[id]`)
- **Compatibility Verification**: Compares the extension's required `sdkVersion` against the target Engine's runtime version to prevent runtime type mismatch or missing symbols.
- **Author Provenance**: Author attribution and cryptographic code signature status.
- **Documentation & Parameters**: Technical parameter descriptions and input schema required for engine configuration.

### 3. License Acquisition & Distribution Flow (`/items/[id]/acquire`)
- **Acquisition Request**: Operator selects their target account and engine instance.
- **License Generation**: Invokes `POST /api/marketplace/items/{itemId}/acquire` against the Cloud backend.
- **Automatic Cloud Deployment**: Upon successful acquisition, Cloud associates the license key with the account, allowing the connected engine instance to download and activate the extension via its profile slot.

## Multi-Cultural & Accessibility Standards

- All currency amounts are formatted according to the operator's locale (Rule 9.19).
- Item cards and interactive modals adhere to WCAG 2.2 AA (Rule 9.18), providing accessible dialog triggers, focus traps, and ESC key dismissal.
