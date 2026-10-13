---
id: product:razor/decisions/cloud-is-the-backend-name
parent: product:razor/decisions
title: The Cloud Backend Is Named Cloud
level: product
kind: decision
domains: [cloud, engine]
keywords:
  - cloud naming
  - Cloud.csproj
  - Razor.Cloud
  - Panel
  - backend
  - core/src/Cloud
  - built last
references:
  - product:razor/blueprint/internal-architecture/cloud-control-plane
  - product:razor/blueprint/internal-architecture/solution-structure
  - product:razor/blueprint/product-model/product-overview
---

# The Cloud Backend Is Named Cloud

## Context

Razor is delivered as a headless engine plus a cloud control plane, and the engine's backend counterpart
needed a name and a home in the solution. The frontend is a separate workstream that will consume that
backend.

## Decision

The engine's Cloud backend:

- is named exactly **`Cloud`** - not `Razor.Cloud`, and not `Panel`;
- lives in this repository as a project under **`core/src/Cloud`**;
- is the backend **the frontend will consume**;
- is built **after the engine work completes**.

**Status: live ruling.**

## Consequences

- The project file is `Cloud.csproj`, the assembly is `Cloud`, and the root namespace is `Cloud`
  (`product:razor/blueprint/internal-architecture/cloud-control-plane`).
- `Cloud` is versioned with the rest of the solution but is a standalone web application that does not
  reference the engine's project graph
  (`product:razor/blueprint/internal-architecture/solution-structure`).
- Cloud is the sole user-facing interface of the product: instance management, commands, scheduling,
  monitoring, reporting, configuration, secrets and extension deployment
  (`product:razor/blueprint/product-model/product-overview`).
- Any impact surface that names this backend must use `Cloud`; code paths for it are `core/src/Cloud/**`
  (`product:razor/blueprint/internal-architecture/cloud-control-plane`).

## Reasoning the Documents Give

- `product:razor/blueprint/internal-architecture/cloud-control-plane` states the naming and placement
  requirement directly, and treats it as a constraint: "The project is named exactly `Cloud`: the project
  file is `Cloud.csproj`, the assembly is `Cloud`, and the root namespace is `Cloud`."
- `product:razor/blueprint/internal-architecture/solution-structure` gives the architectural reason it is
  a standalone web application rather than part of the engine graph.
- `product:razor/blueprint/product-model/product-overview` gives the product reason it is the backend the
  frontend consumes: Cloud is the web-based control plane and the sole interface for interacting with
  engines.

**Not recorded in `docs/`:** the *ordering* part of the ruling ("built after the engine work completes")
and the explicit statement that the frontend will consume it are recorded in the repository router
`AGENT.md` ("It is the backend the frontend will consume, and it is built last"), which sits outside
`docs/` and is therefore not a graph node. No `docs/` document states the build order.

## Alternatives Considered

- `Razor.Cloud` and `Panel` - rejected by name in
  `product:razor/blueprint/internal-architecture/cloud-control-plane`, which is the only record of the
  alternatives.
