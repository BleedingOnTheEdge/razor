---
id: product:razor/blueprint/future-features/risk-compliance
parent: product:razor/blueprint/future-features
title: Risk & Compliance
level: product
kind: blueprint
---

# Risk & Compliance

- **Value at Risk (VaR) Modelling** – Historical and parametric VaR calculated in real time during live trading. Hook plugin on `live.equity.changed` and `live.tick.processed`.
- **Audit Trail Logging** – Immutable, write‑only SQLite logs of every broker API request for regulatory compliance. Hook plugin on `live.order.executed` and `live.order.rejected`.
- **Fat‑Finger Limits** – Hard‑coded maximum order sizes that override any strategy request. Hook plugin on `backtest.order.validation` / `live.order.validation`.
- **Margin Call Predictive Alerts** – Notify via Telegram/Email if the current drawdown trajectory will hit stop‑out within one hour. Hook plugin on `live.equity.changed`.
- **Wash Trading Prevention** – Reject orders that would execute against the strategy's own resting limit orders. Hook plugin on `live.order.validation`.

---
