---
id: product:razor/cross-cutting/principles/live-trading-robustness
parent: product:razor/cross-cutting/principles
title: 13. Live Trading Robustness
level: product
kind: cross-cutting
---

# 13. Live Trading Robustness
**The live engine must never silently fail or desynchronise from the exchange.**

- The live broker must periodically reconcile account state (balance, positions, orders) with the adapter, independent of ticks.
- After a connection loss and successful reconnection, a full state reconciliation is mandatory before processing further ticks.
- Adapter implementations must be thread‑safe, as they may be called from multiple threads concurrently (tick events, timer sync, command execution). This requirement is documented on the `IAdapterCapability` contract.
- In‑flight order guards prevent duplicate submission; they must use monotonic time, not wall‑clock time.
- All exceptions in the live tick callback must be caught, logged, and must never crash the process. Fire‑and‑forget operations must observe exceptions via a fault logger.
- Health checks must report connectivity, last tick age, and optimisation status; they must be instance‑based (not global static) to support future multi‑engine deployments in separate processes.

---
