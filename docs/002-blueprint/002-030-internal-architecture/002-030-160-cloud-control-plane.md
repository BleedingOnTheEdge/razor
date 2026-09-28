---
id: product:razor/blueprint/internal-architecture/cloud-control-plane
parent: product:razor/blueprint/internal-architecture
title: Cloud Control Plane
level: product
kind: blueprint
domains: [cloud]
keywords:
  - cloud
  - control plane
  - saas
  - dashboards
  - provisioning
  - command surface
  - profiles
  - multi tenancy
references:
  - product:razor/blueprint/product-model
  - product:razor/blueprint/engine-technical-blueprint
code_paths:
  - core/src/Cloud/**
---

# Cloud Control Plane

Cloud is the SaaS control plane for Razor. It is the only component that talks to many engines at
once, and the only place where the product's user-facing state lives.

## Surface

- Sends commands to engine instances and receives their progress and results.
- Stores all product data: runs, results, progress, reports and provenance.
- Provides dashboards for monitoring, reporting and configuration.
- Manages user accounts, licences and extension deployment.
- Stores user profiles holding the active adapter, strategy, indicators and hook-plugin
  selections per engine instance.

## Placement

Cloud is implemented in this repository at `core/src/Cloud`, and is versioned with the rest of
the solution. The project is named exactly `Cloud`: the project file is `Cloud.csproj`, the
assembly is `Cloud`, and the root namespace is `Cloud`.

It is built as a web application (`Microsoft.NET.Sdk.Web`) with `FastEndpoints` for its endpoint
layer and Entity Framework Core over PostgreSQL for persistence. Unlike `Engine`, it does not
reference the engine's project graph; see
`product:razor/blueprint/internal-architecture/solution-structure`.

## Scope

The control plane covers:

- The Engine wire protocol: command, response, progress and transfer messages, and the engine
  handshake that authenticates an instance.
- The persistence model for runs, results, progress, reports and profiles.
- The command and profile surface the dashboards drive.
- Instance provisioning: registering an engine instance and binding it to a user and profile.

On top of that surface, Cloud **orchestrates flows** by decomposing them into engine primitive
operations and tracking the resulting runs. The simple backtest, simple optimisation and
walk-forward analysis flows are specified as flow documents under `product:razor/flows`, not as
engine features; the engine exposes only the primitives each flow is built from.

## Relationship to the Engine

Cloud owns everything a user sees. The engine is headless, so it owns execution and nothing else:
it never renders a report, never holds user accounts, and never persists product state beyond the
narrow local set described in
`product:razor/blueprint/engine-technical-blueprint/state-persistence`. What Cloud must be able
to reconstruct is specified by
`product:razor/blueprint/product-model/control-monitoring`.
