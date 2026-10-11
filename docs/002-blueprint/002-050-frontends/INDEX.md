---
id: product:razor/blueprint/frontends
parent: product:razor/blueprint
title: Razor Frontends
level: product
kind: blueprint
domains:
  - cloud
  - marketplace
  - security
  - reporting
  - licensing
  - extensions
  - sdk
keywords:
  - frontends
  - nextjs
  - app router
  - react 19
  - cloud dashboard
  - marketplace
  - contracts
  - api client
  - ui kit
---

# Razor Frontends

The frontend applications and shared contract packages that provide the operational and marketplace surfaces for the Razor trading ecosystem.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/blueprint/frontends/architecture | Architecture of the frontend monorepo: Next.js 15, App Router, Hexagonal ports and adapters, multi-cultural i18n, and WCAG 2.2 AA accessibility. | cloud, marketplace, security, reporting | | frontends/** |
| product:razor/blueprint/frontends/cloud-dashboard | Operator SaaS Control Plane: engine fleet directory, profile slot configuration, command dispatching, real-time SSE stream, and lineage explorer. | cloud, engine, backtesting, live-trading, optimisation, reporting, security | onboarding, live-trading-session, backtest-run, optimisation-run, reporting | frontends/apps/cloud-dashboard/** |
| product:razor/blueprint/frontends/marketplace | Extension Marketplace: curated discovery, multi-slot filtering, licensing acquisition, and automatic engine distribution. | marketplace, cloud, licensing, extensions | extension-deployment, onboarding | frontends/apps/marketplace/** |
| product:razor/blueprint/frontends/contracts-and-packages | Shared packages: `@razor/contracts` domain types, `@razor/api-client` OpenAPI wrapper, and `@razor/ui-kit` design tokens and formatters. | cloud, marketplace, extensions, sdk | | frontends/packages/** |
