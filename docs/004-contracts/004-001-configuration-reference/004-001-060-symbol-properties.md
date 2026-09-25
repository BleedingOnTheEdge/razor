---
id: product:razor/contracts/configuration-reference/symbol-properties
parent: product:razor/contracts/configuration-reference
title: 6. Symbol Properties
level: product
kind: contract
---

# 6. Symbol Properties

**Type:** `SymbolProperties` (record)  
**Namespace:** `Razor.Core.Sdk.Shared`

Adapters return this object per symbol; it defines exchange‑specific contract details. **All fields are required.** Adapters must explicitly set every property.

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `AssetClass` | `AssetClass` | Market category (Forex, CryptoSpot, Equity, …). |
| `MarginMode` | `MarginMode` | Cross or Isolated margin. |
| `PendingTrigger` | `PendingOrderTriggerMode` | Which price triggers pending orders — applies to pending buy **and** sell orders (limit and stop). |
| `MarginCurrency` | `string` | Currency for margin calculations. |
| `ContractSize` | `double` | Size of one standard contract. |
| `TickSize` | `double` | Minimum price increment. |
| `TickValue` | `double` | Monetary value of one tick. |
| `MinVolume` | `double` | Minimum order volume. |
| `MaxLeverage` | `double` | Maximum allowed leverage for this symbol. |
| `SwapLong` | `double` | Daily swap rate for long positions (percentage or absolute). |
| `SwapShort` | `double` | Daily swap rate for short positions. |
| `SwapRolloverHourUtc` | `int` | UTC hour at which swap is charged. |
| `TripleSwapDayMultiplier` | `double` | Multiplier for triple‑swap days (typically Wednesdays). |
| `FundingRate` | `double` | Perpetual contract funding rate (per period). |
| `InitialMarginRate` | `double` | Fraction of position value required as initial margin. |
| `MaintenanceMarginRate` | `double` | Fraction below which liquidation may occur. |
| `MakerFeeRate` | `double` | Fee for maker orders. |
| `TakerFeeRate` | `double` | Fee for taker orders. |
| `HoldingCostIntervalTicks` | `long` | Interval between holding cost calculations in 100‑ns ticks. |

## Enums Used

- `AssetClass`: `Forex`, `CryptoSpot`, `CryptoPerpetual`, `Equity`, `Future`, `CFD`
- `MarginMode`: `Cross`, `Isolated`
- `PendingOrderTriggerMode`: `UseBidForBuy`, `UseAskForBuy`, `UseMidPrice`

## Validation

- `MarginCurrency` must not be empty.
- `ContractSize`, `TickSize`, `TickValue`, `MinVolume`, `MaxLeverage` must all be `> 0`.
- `SwapRolloverHourUtc` must be between `0` and `23`.
- `TripleSwapDayMultiplier` must be `≥ 0`.
- `InitialMarginRate` and `MaintenanceMarginRate` must be in `(0, 1]`.
- `MakerFeeRate` and `TakerFeeRate` must be in `[0, 1]`.
- `HoldingCostIntervalTicks` must be `> 0`.

---
