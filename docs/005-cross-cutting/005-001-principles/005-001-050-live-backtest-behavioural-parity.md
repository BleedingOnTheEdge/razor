---
id: product:razor/cross-cutting/principles/live-backtest-behavioural-parity
parent: product:razor/cross-cutting/principles
title: 5. Live‑Backtest Behavioural Parity
level: product
kind: cross-cutting
---

# 5. Live‑Backtest Behavioural Parity
**The simulated broker and live broker must produce identical market‑to‑account effects for the same tick sequence.**  
Any divergence is a bug.

- Both brokers must use the same `IMarketCalculator` implementation for margin, PnL, commission, swap/funding, and holding cost.
- The order execution pipeline (market/limit/stop orders, SL/TP monitoring, stop‑out logic) must be structurally identical between sim and live.
- The live broker may contain additional reconciliation and reconnection logic, but never alternative trading math.
- Unit tests must compare sim‑vs‑live broker outputs for equivalent synthetic tick feeds.

---
