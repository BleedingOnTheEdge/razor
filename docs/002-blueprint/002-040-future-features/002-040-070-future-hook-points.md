---
id: product:razor/blueprint/future-features/future-hook-points
parent: product:razor/blueprint/future-features
title: Future Hook Points
level: product
kind: blueprint
---

# Future Hook Points

The following hook points are candidates for addition in future minor releases:

| Proposed Hook | Pipeline | Type | Description |
|---------------|----------|------|-------------|
| `backtest.position.sl_tp_check` | Backtest | Action | Called when a tick triggers a SL/TP check before execution. |
| `live.position.sl_tp_check` | Live | Action | Called when a tick triggers a SL/TP check before sending to exchange. |
| `backtest.warmup_completed` | Backtest | Action | Called when warm‑up period ends. |
| `live.connection_lost` | Live | Action | Called when the adapter disconnects. |
| `live.connection_restored` | Live | Action | Called after successful reconnection. |
| `optimization.best_improved` | Optimisation | Action | Called when a new best fitness is found. |

---
