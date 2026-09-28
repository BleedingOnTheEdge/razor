---
id: product:razor/contracts/configuration-reference/market-data-types
parent: product:razor/contracts/configuration-reference
title: Market Data Types
level: product
kind: contract
domains: [sdk, data]
flows: [backtest-run, live-trading-session]
keywords:
  - symbol properties
  - tick size
  - contract size
  - margin
  - swap
  - timeframe
  - data action policy
  - retention policy
references:
  - product:razor/contracts/extension-developer-guide/developing-an-adapter
code_paths:
  - core/src/Sdk/Shared/SymbolProperties.cs
  - core/src/Sdk/Shared/TimeFrame.cs
  - core/src/Sdk/Shared/DataActionPolicy.cs
---

# Market Data Types

The shared value types and enums that describe instruments, aggregation periods, and tick-data retention. All three live in `Sdk.Shared`.

## Symbol Properties

**Type:** `SymbolProperties` (record)
**Namespace:** `Sdk.Shared`

Adapters return this object per symbol; it defines exchange-specific contract details. **All fields are required except `HoldingCostIntervalTicks`**, which defaults to 24 hours (`TimeSpan.TicksPerDay`); adapters must explicitly set every other property.

| Field | Type | Description |
|-------|------|-------------|
| `AssetClass` | `AssetClass` | Market category (Forex, CryptoSpot, Equity, ...). |
| `MarginMode` | `MarginMode` | Cross or Isolated margin. |
| `PendingTrigger` | `PendingOrderTriggerMode` | Which price triggers pending orders - applies to pending buy **and** sell orders (limit and stop). |
| `MarginCurrency` | `string` | Currency for margin calculations. |
| `ContractSize` | `double` | Size of one standard contract. |
| `TickSize` | `double` | Minimum price increment. |
| `TickValue` | `double` | Monetary value of one tick. |
| `MinVolume` | `double` | Minimum order volume. |
| `MaxLeverage` | `double` | Maximum allowed leverage for this symbol. |
| `SwapLong` | `double` | Daily swap rate for long positions (percentage or absolute). |
| `SwapShort` | `double` | Daily swap rate for short positions. |
| `SwapRolloverHourUtc` | `int` | UTC hour at which swap is charged. |
| `TripleSwapDayMultiplier` | `double` | Multiplier for triple-swap days (typically Wednesdays). |
| `FundingRate` | `double` | Perpetual contract funding rate (per period). |
| `InitialMarginRate` | `double` | Fraction of position value required as initial margin. |
| `MaintenanceMarginRate` | `double` | Fraction below which liquidation may occur. |
| `MakerFeeRate` | `double` | Fee for maker orders. |
| `TakerFeeRate` | `double` | Fee for taker orders. |
| `HoldingCostIntervalTicks` | `long` | Interval between holding cost calculations in 100-ns ticks. |

### Enums Used

- `AssetClass`: `Forex`, `CryptoSpot`, `CryptoPerpetual`, `Equity`, `Future`, `CFD`
- `MarginMode`: `Cross`, `Isolated`
- `PendingOrderTriggerMode`: `UseBidForBuy`, `UseAskForBuy`, `UseMidPrice`

### Validation

- `MarginCurrency` must not be empty.
- `ContractSize`, `TickSize`, `TickValue`, `MinVolume`, `MaxLeverage` must all be `> 0`.
- `SwapRolloverHourUtc` must be between `0` and `23`.
- `TripleSwapDayMultiplier` must be `≥ 0`.
- `InitialMarginRate` and `MaintenanceMarginRate` must be in `(0, 1]`.
- `MakerFeeRate` and `TakerFeeRate` must be in `[0, 1]`.
- `HoldingCostIntervalTicks` must be `> 0`.

## TimeFrame

**Type:** `TimeFrame` (enum)
**Namespace:** `Sdk.Shared`

The integer value equals the duration in minutes.

| Member | Value (min) | Description |
|--------|-------------|-------------|
| `Tick` | `0` | No aggregation; raw tick stream. |
| `M1` | `1` | 1 minute. |
| `M5` | `5` | 5 minutes. |
| `M15` | `15` | 15 minutes. |
| `M30` | `30` | 30 minutes. |
| `H1` | `60` | 1 hour. |
| `H2` | `120` | 2 hours. |
| `H3` | `180` | 3 hours. |
| `H4` | `240` | 4 hours. |
| `H6` | `360` | 6 hours. |
| `H12` | `720` | 12 hours. |
| `D1` | `1440` | 1 day. |
| `D2` | `2880` | 2 days. |
| `D3` | `4320` | 3 days. |
| `W1` | `10080` | 1 week. |
| `MN1` | `43200` | 1 month (30 days). |

## Data Action Policy

**Type:** `DataActionPolicy` (enum)
**Namespace:** `Sdk.Shared`

The retention policy for a historical tick-data file after the task that requested it completes.

| Value | Meaning |
|-------|---------|
| `KeepUntilExit` | File stays until engine process ends. |
| `DeleteAfterTask` | Deleted immediately after backtest/optimisation completes. |
| `PersistentCache` | Kept for future reuse. Adapter manages cleanup. |
