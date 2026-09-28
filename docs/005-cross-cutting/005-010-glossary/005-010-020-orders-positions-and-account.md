---
id: product:razor/cross-cutting/glossary/orders-positions-and-account
parent: product:razor/cross-cutting/glossary
title: Orders, Positions and Account
level: product
kind: cross-cutting
domains: [live-trading, backtesting]
keywords:
  - orders
  - positions
  - account
  - margin
  - leverage
  - execution
  - pnl
  - equity
  - stop-loss
  - slippage
---

# Orders, Positions and Account

**Broker**
In Razor, an abstraction of a trading account. `IBroker` (in `Sdk.Shared`) is implemented by `SimulatedBroker` (for backtesting) and `LiveBroker` (for real trading).

**Cross Margin**
A margin mode where all open positions share the same margin pool.

**Drawdown**
The percentage decline from a peak in equity. **Daily Drawdown** resets at the start of each UTC day.

**Equity**
Current account balance plus floating (unrealised) profit/loss.

**Execution Report**
A record (`ExecutionReport` in `Sdk.Shared`) from an adapter indicating a change in order state (filled, cancelled, etc.).

**IMarketCalculator**
Adapter‑provided interface for exchange‑specific math (margin, PnL, commission, funding, order triggering). Located in `Sdk.Shared`.

**Isolated Margin**
A margin mode where each position has its own separate margin allocation.

**Latency Ticks**
A simulated execution delay in the simulated broker, expressed in 100‑ns tick units. 0 = instant execution.

**Leverage**
The ratio of borrowed funds to margin. e.g., 100:1 leverage means a $1,000 margin controls a $100,000 position.

**Magic Number**
A unique integer that tags all orders from a particular strategy instance. Prevents interference between strategies.

**Margin**
The amount of capital required to open and maintain a leveraged position. **Free Margin** = Equity – Margin Used.

**Order**
A pending buy/sell request that has not yet triggered. Represented by the `Order` record in `Sdk.Shared`.

**Order Type**
Enum (`OrderType` in `Sdk.Shared`): `Buy`, `Sell`, `BuyLimit`, `SellLimit`, `BuyStop`, `SellStop`.

**Pending Order**
A limit or stop order that will trigger when the market reaches a specified price.

**Pending Order Trigger Mode**
Enum (`PendingOrderTriggerMode` in `Sdk.Shared`): `UseBidForBuy`, `UseAskForBuy`, `UseMidPrice`. Selects the reference price used to evaluate whether a pending order has triggered. It applies to pending **buy and sell** orders, both limit and stop — not to buy orders alone.

**PnL (Profit and Loss)**
The monetary gain or loss of a position.

**Position**
An open or closed trade, represented by an immutable `Position` record in `Sdk.Shared`.

**Reconciliation**
The process of synchronising the live broker's local state with the exchange's actual account state.

**Slippage**
The difference between the expected price of a trade and the price at which it is actually executed. Handled by the adapter's `IMarketCalculator` and order execution logic.

**Stop‑Loss (SL)**
A price level at which a losing position is automatically closed.

**Stop‑Out Level**
The margin level ratio (e.g., 0.5 = 50%) at which the broker force‑closes the worst position.

**Swap**
Overnight interest charged or earned for holding a position. Also called rollover or funding.

**Warm‑up**
An initial period of backtest data where signals are computed but no trades are placed, used to prime indicators. Controlled by `WarmupWindowCount` in `ExecutionSpecification`.
