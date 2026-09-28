---
id: product:razor/blueprint/product-model
title: Product Model
level: product
kind: blueprint
domains: [engine, cloud, marketplace, sdk]
keywords:
  - product model
  - components
  - deployment
  - licensing
  - workflows
  - communication
  - security
  - configuration
  - control
  - monitoring
  - extensibility
  - roadmap
  - branding
references:
  - product:razor/blueprint/project-overview
  - product:razor/contracts/configuration-reference
  - product:razor/blueprint/engine-technical-blueprint
  - product:razor/blueprint/future-features
---

# Product Model

The authoritative definition of the Razor product: what it is made of, how it is deployed and
licensed, how users work with it, and how it communicates. All business, development and operational
decisions must align with this section.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/blueprint/product-model/product-overview | The four components and what each is responsible for. | engine, cloud, marketplace, sdk | | |
| product:razor/blueprint/product-model/deployment-distribution | How the engine reaches clients and what each side is responsible for. | engine | engine-update | |
| product:razor/blueprint/product-model/licensing-subscriptions | Tiers, feature gates and instance keys. | licensing | onboarding | |
| product:razor/blueprint/product-model/user-workflows | The developer and production journeys end to end. | | onboarding, extension-development, strategy-development, live-trading-session | |
| product:razor/blueprint/product-model/communication-security | The engine-cloud channel, binary protection and secrets. | security | | core/src/Engine/Communication/**, core/src/Engine/Core/SecurityManager.cs |
| product:razor/blueprint/product-model/configuration-management | Why the Cloud is the single source of truth for configuration. | cloud | | |
| product:razor/blueprint/product-model/control-monitoring | The command model, monitoring surface and reporting split. | cloud | backtest-run, optimisation-run, live-trading-session, reporting | core/src/Engine/Management/Commands/** |
| product:razor/blueprint/product-model/extensibility-overview | Where extension happens, and which contract governs it. | extensions | extension-development | |
| product:razor/blueprint/product-model/roadmap | Version-by-version delivery. | | | |
| product:razor/blueprint/product-model/branding | The product names. | | | |
| product:razor/blueprint/product-model/appendix-a-supported-commands | The command registry for v1.0.0 LTS. | engine | | core/src/Engine/Management/Commands/CommandIds.cs |
