---
id: product:razor/contracts/extension-developer-guide/developing-an-adapter/market-calculator
parent: product:razor/contracts/extension-developer-guide/developing-an-adapter
title: 4.6 Market Calculator
level: product
kind: contract
---

# 4.6 Market Calculator

The `Calculator` property returns an instance of `IMarketCalculator` (in `Razor.Core.Sdk.Shared`). You must implement this interface with exchange‑specific math.

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

Slippage and commission are now adapter‑internal. The `IMarketCalculator` provides `CalculateCommission` and `CalculateSlippage`; slippage is handled by the adapter's order execution logic. The engine no longer uses a separate `ISimulationFriction` — the adapter owns all friction.
