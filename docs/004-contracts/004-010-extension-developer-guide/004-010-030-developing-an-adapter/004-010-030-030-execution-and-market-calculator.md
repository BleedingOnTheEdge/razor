---
id: product:razor/contracts/extension-developer-guide/developing-an-adapter/execution-and-market-calculator
parent: product:razor/contracts/extension-developer-guide/developing-an-adapter
title: Execution and Market Calculator
level: product
kind: contract
domains: [sdk, extensions]
flows: [extension-development]
keywords:
  - execution provider
  - execute order
  - modify order
  - cancel order
  - close position
  - execution report
  - market calculator
  - imarketcalculator
  - normalization
  - commission
  - slippage
  - friction
references:
  - product:razor/contracts/configuration-reference/market-data-types
---

# Execution and Market Calculator

## Execution

**Key methods:**

- `ExecuteOrderAsync`: Translates an `AdapterOrderRequest` into a broker-specific order. Returns immediately with a ticket; subsequent fills come through `OnExecutionUpdate`.
- `ModifyOrderAsync`, `CancelAsync`, `ClosePositionAsync`: delegate to the broker API.
- `GetAccountInfoAsync`: returns current balance and equity.
- `GetActivePositionsAsync`, `GetPendingOrdersAsync`: return broker-side lists.
- `GetSymbolPropertiesAsync`: returns exchange-specific metadata (`SymbolProperties` record). This is crucial - it tells Razor how to calculate margins, tick sizes, swap rates, etc. You must fill all fields accurately.

**The `OnExecutionUpdate` event:** Raise this whenever an order fills, partially fills, cancels, etc. The engine maintains its own state from these reports. The event handler signature is `Action<ExecutionReport>`; ensure you raise it asynchronously and catch exceptions internally (the engine will log them, but your adapter should not crash).

**Thread-safety:** The engine may call multiple execution methods concurrently (e.g., while a tick is being processed). Use locks where necessary.

## Market Calculator

The `Calculator` property returns an instance of `IMarketCalculator` (in `Sdk.Shared`). You must implement this interface with exchange-specific math.

```csharp
public interface IMarketCalculator
{
    double NormalizeVolume(SymbolProperties props, double requestedVolume);
    double NormalizePrice(SymbolProperties props, double requestedPrice);
    double CalculateRequiredMargin(SymbolProperties props, double price, double volume, double leverage);
    double CalculatePnL(SymbolProperties props, double entryPrice, double currentPrice, double volume, OrderType type);
    double CalculateCommission(SymbolProperties props, double price, double volume);
    double CalculateSwap(SymbolProperties props, double volume, OrderType type, long openTime, long closeTime);
    double CalculateFunding(SymbolProperties props, double volume, double openPrice, OrderType type, long currentTime, long lastFundingTime);
    bool IsPendingOrderTriggered(SymbolProperties props, OrderType pendingType, double bid, double ask, double orderPrice);
    double CalculateHoldingCost(SymbolProperties props, double volume, double openPrice, OrderType type, long fromTime, long toTime);
    double CalculateSlippage(SymbolProperties props, OrderType type, double volume, double price);
}
```

**How it's used:** Both the simulated and live broker call these methods to maintain consistent accounting. The calculator must be **stateless** (pure functions) and **deterministic**.

**Example margin calculation (crypto perpetual):**

```csharp
public double CalculateRequiredMargin(SymbolProperties props, double price, double volume, double leverage)
    => (price * volume * props.ContractSize) / leverage * props.InitialMarginRate;
```

**Important:** All price/volume normalization must round to the exchange's tick size. Failure to do so will cause rejections and parity mismatches.

Slippage and commission are adapter-internal. The `IMarketCalculator` provides `CalculateCommission` and `CalculateSlippage`; slippage is handled by the adapter's order execution logic. The engine does not use a separate `ISimulationFriction` - the adapter owns all friction.
