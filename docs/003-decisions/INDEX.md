---
id: product:razor/decisions
title: Razor Decisions
level: product
kind: decision
domains: [backtesting, cloud, engine, live-trading, operations, optimisation, reporting]
keywords:
  - decisions
  - rulings
  - binding decisions
  - architecture rulings
---

# Razor Decisions

Routing only. The product and architecture rulings that are already made and binding: each states the
decision, its status as a live ruling, the reasoning the documents give, and the documents that carry its
consequences. A decision overrides the documents below it within its scope.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/decisions/cloud-is-the-backend-name | The Cloud backend is named exactly `Cloud`, lives at `core/src/Cloud`, is the frontend's backend, and is built last. | cloud, engine | | |
| product:razor/decisions/cloud-owns-the-flows | Cloud orchestrates the flows; the engine exposes primitives only. | backtesting, cloud, engine, optimisation | backtest-run, optimisation-run, walk-forward-analysis | |
| product:razor/decisions/live-trading-continues-offline | Live trading continues on the last known configuration while the Cloud is unreachable. | cloud, engine, live-trading, operations | live-trading-session | |
| product:razor/decisions/reporting-is-complete-and-permanent | Reporting is fully granular and permanent: every run, result and progress record. | cloud, engine, reporting | reporting | |
| product:razor/decisions/intervened-runs-remain-reportable | Intervened and resumed runs stay reportable with provenance; gaps are recorded, never hidden. | backtesting, cloud, engine, optimisation, reporting | optimisation-run, live-trading-session, reporting | |
| product:razor/decisions/scheduling-is-authored-in-the-cloud | The Cloud authors timings and cron; the engine executes them. | cloud, engine, operations | optimisation-run, live-trading-session, engine-update | |
| product:razor/decisions/coverage-gate-is-ninety-five-percent | 95% line and branch coverage on a declared scope, enforced in CI. | engine, operations | | |
