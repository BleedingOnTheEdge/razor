---
id: product:razor/flows
title: Razor Flows
level: product
kind: contract
domains: [backtesting, cloud, engine, extensions, live-trading, operations, optimisation, reporting, sdk, security]
flows: [backtest-run, engine-update, extension-deployment, extension-development, live-trading-session, onboarding, optimisation-run, reporting, strategy-development, walk-forward-analysis]
keywords:
  - flows
  - cross-domain flows
  - change entry point
  - end-to-end
  - impact entry point
---

# Razor Flows

Routing only. One document per end-to-end flow, each a route through the domain documents that specify
the parts it touches. A flow does not restate domain behaviour; it names the sequence, the component that
owns each step, what is persisted and reported, and what fails - and links to the document that specifies
each part.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/flows/backtest-run | Cloud-issued historical replay: request, validation, task, data, run loop, teardown, reporting. | backtesting, cloud, data, engine, live-trading, operations, sdk | backtest-run | |
| product:razor/flows/engine-update | Remote binary replacement: advertise, download, verify, compatibility gate, stage, restart, roll back. | cloud, engine, extensions, operations, security | engine-update | |
| product:razor/flows/extension-deployment | Cloud-selected activation: scan, manifest, validate, activate, hot reload, rollback. | cloud, engine, extensions, operations, sdk, security | extension-deployment | |
| product:razor/flows/extension-development | Building and locally testing an extension against the public Sdk. | data, engine, extensions, sdk | extension-development | |
| product:razor/flows/live-trading-session | A live session: start, tick and order path, monitoring, offline continuation, reconciliation, stop. | backtesting, cloud, data, engine, extensions, live-trading, operations, sdk, security | live-trading-session | |
| product:razor/flows/onboarding | From account and licence to a verified, Online engine. | cloud, engine, extensions, licensing, live-trading, operations, security | onboarding | |
| product:razor/flows/optimisation-run | Cloud-issued genetic optimisation: specification, population, evaluation, evolution, pause/resume, results. | backtesting, cloud, engine, optimisation, sdk | optimisation-run | |
| product:razor/flows/reporting | Raw result, progress, log, metric and behaviour data streamed to the Cloud, which stores and renders it. | cloud, engine, reporting | reporting | |
| product:razor/flows/strategy-development | The strategy-specific route: slot, lifecycle, indicators, gene schema, local exercise. | engine, extensions, optimisation, sdk | strategy-development | |
| product:razor/flows/walk-forward-analysis | A Cloud-orchestrated sequence of optimisation windows followed by out-of-sample backtests over the engine's primitives. | backtesting, cloud, engine, optimisation, reporting, sdk | walk-forward-analysis | |

## Reading a flow document

Each flow document answers, in order: who or what starts it, the sequence of steps across components,
which component owns each step, what is persisted and reported, what can fail and what happens then, and
which documents specify each participating part. Where a detail belongs to a domain, the flow links to
that domain's document by id rather than repeating it; when a flow has a step no document specifies, the
document records the gap instead of inventing the step.

## Relationship to the domain documents

The `flows` metadata on the blueprint, contract and operational documents already records which documents
participate in each flow; the domain span in the global map (`docs/INDEX.md`) is derived from those
documents' domains. A flow document adds the route: the order of participation, not new behaviour.
