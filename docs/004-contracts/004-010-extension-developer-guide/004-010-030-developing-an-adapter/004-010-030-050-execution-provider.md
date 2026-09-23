---
id: product:razor/contracts/extension-developer-guide/developing-an-adapter/execution-provider
parent: product:razor/contracts/extension-developer-guide/developing-an-adapter
title: 4.5 Execution Provider
level: product
kind: contract
---

# 4.5 Execution Provider

**Key methods:**

- `ExecuteOrderAsync`: Translates an `AdapterOrderRequest` into a broker‑specific order. Returns immediately with a ticket; subsequent fills come through `OnExecutionUpdate`.
- `ModifyOrderAsync`, `CancelAsync`, `ClosePositionAsync`: delegate to the broker API.
- `GetAccountInfoAsync`: returns current balance and equity.
- `GetActivePositionsAsync`, `GetPendingOrdersAsync`: return broker‑side lists.
- `GetSymbolPropertiesAsync`: returns exchange‑specific metadata (`SymbolProperties` record). This is crucial – it tells Razor how to calculate margins, tick sizes, swap rates, etc. You must fill all fields accurately.

**The `OnExecutionUpdate` event:** Raise this whenever an order fills, partially fills, cancels, etc. The engine maintains its own state from these reports. The event handler signature is `Action<ExecutionReport>`; ensure you raise it asynchronously and catch exceptions internally (the engine will log them, but your adapter should not crash).

**Thread‑safety:** The engine may call multiple execution methods concurrently (e.g., while a tick is being processed). Use locks where necessary.
