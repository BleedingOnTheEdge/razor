---
id: product:razor/blueprint/future-features/trading-execution
parent: product:razor/blueprint/future-features
title: Trading & Execution
level: product
kind: blueprint
---

# Trading & Execution

- **Smart Order Routing (SOR)** – Meta‑adapter that routes orders across multiple brokers based on best bid/ask. Implemented as an `IAdapterCapability` that aggregates child adapters.
- **Iceberg / Hidden Orders** – Randomise large orders into smaller market slices. Exposed as hook plugins that register on `backtest.order.before_execute` and `live.order.before_send`, splitting volume and scheduling slices.
- **TWAP / VWAP Execution Algorithms** – Built‑in execution strategies triggered by strategy order parameters. Hook plugins can register on the execution hooks to implement custom slicing logic.
- **Post‑Only Limit Orders** – Flag orders to guarantee maker rebates, cancelling/re‑pricing if they would cross the spread. Implemented as an order parameter respected by the adapter.
- **Local Order Book SL/TP** – Maintain stop‑loss/take‑profit levels engine‑side and fire market orders when triggered. Hook plugins on `backtest.position.sl_tp_check` (future hook point) can implement trailing stops.
- **Cross‑Margin Portfolio Sizing** – Size positions based on total portfolio risk rather than isolated symbol equity. Hook plugins on `backtest.order.validation` or `live.order.validation` can enforce portfolio‑level risk limits.
- **Kill‑Switch Triggers** – Global equity drop thresholds that instantly liquidate and disconnect adapters. Implemented as a hook plugin with action hooks on `live.equity.changed`.
- **OCO (One‑Cancels‑Other) Orders** – Link a stop‑loss and limit order so that filling one cancels the other. Implemented by the broker or via adapter logic.
- **Trailing Stops** – Dynamic stop‑loss that moves with the price. Hook plugin on `backtest.tick.after` modifies SL on open positions.
- **Bracket Orders** – Entry, stop‑loss, and take‑profit combined into an atomic group.
- **Multi‑Leg Orders** – Support spread trading, pairs trading, and other multi‑instrument orders.
- **Partial Fills Simulation** – Realistic fill simulation that takes order‑book depth into account.
- **Market Impact Models** – Slippage models that adjust for order size relative to available liquidity. Implemented within the adapter's `IMarketCalculator`.

---
