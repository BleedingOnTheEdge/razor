---
id: product:razor/contracts/extension-developer-guide/developing-an-adapter/live-data-provider
parent: product:razor/contracts/extension-developer-guide/developing-an-adapter
title: 4.4 Live Data Provider
level: product
kind: contract
---

# 4.4 Live Data Provider

Stream real‑time tick data directly into the engine.

**Implementation steps:**

- Connect to the broker's WebSocket stream for the given symbol.
- For each tick update, construct a `Tick` struct and raise `OnTickReceived?.Invoke(symbol, tick)`.
- The engine calls `SubscribeAsync` once per symbol; maintain a subscription list and prevent duplicates.
- `UnsubscribeAsync` should disconnect from that symbol's stream.

**Thread safety:** The engine may call subscribe/unsubscribe from multiple threads. Ensure your adapter is thread‑safe.
