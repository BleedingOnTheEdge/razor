---
id: product:razor/blueprint/product-model/extensibility-overview
parent: product:razor/blueprint/product-model
title: Extensibility Overview
level: product
kind: blueprint
domains: [extensions]
flows: [extension-development]
keywords:
  - extensibility
  - hooks
  - filters
  - actions
  - hook pipelines
  - priorities
  - slots
  - plugins
references:
  - product:razor/contracts/configuration-reference/hook-system
  - product:razor/blueprint/internal-architecture
---

# Extensibility Overview

Razor is extended rather than modified. Two mechanisms carry all of it, and each has a single
authoritative contract - this document states the product-level shape and points at them.

## Hooks

The hook system customises engine behaviour without touching the core. A hook plugin implements
`IHookManifest` and registers callbacks at named hook points with priorities.

- **Filter hooks** transform or reject data flowing through a pipeline - order validation, tick
  filtering - registering through `IFilterRegistration<T>`.
- **Action hooks** observe events without modifying data - notifications, metrics - registering
  through `IActionRegistration<T>` or `IActionRegistration`.

Hooks attach to four pipelines - backtest, live, optimisation, and report - and each exposes hook
contexts carrying the data a callback may read. Callbacks run in a deterministic order: priority
first (lower is earlier), then plugin name alphabetically, then registration order.

> The complete hook catalogue, the registration interfaces, the context shapes and the priority rules
> are contract material and live in
> `product:razor/contracts/configuration-reference/hook-system`. How the hook system is
> implemented inside the engine is in `product:razor/blueprint/internal-architecture`. Neither is
> repeated here.

## Slots

Slots are the capability points an extension can occupy. There are three, each with a public
interface, and loading is by directory (see the table in
`product:razor/blueprint/product-model/product-overview`): adapters, strategies and neural-network
models. Indicators and hook plugins load alongside them.

Together, hooks and slots are what make adapters, strategies, indicators, hook plugins and
neural-network models pluggable without any change to the engine binary.
