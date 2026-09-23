---
id: product:razor/contracts/configuration-reference/strategy-specification
parent: product:razor/contracts/configuration-reference
title: 1. Strategy Specification
level: product
kind: contract
---

# 1. Strategy Specification

**Type:** `StrategySpecification` (immutable record)  
**Namespace:** `Razor.Core.Sdk.Shared`

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `InitialBalance` | `double` | Yes | Starting account balance in quote currency. |
| `Leverage` | `double` | Yes | Account‑wide leverage multiplier (e.g., 10, 50). Must be `> 0`. |
| `RequestedSymbols` | `ImmutableArray<SymbolRequest>` | Yes | List of symbols and their timeframes the strategy needs. At least one element required. Symbols must be unique (case‑insensitive). |

## Nested Type: `SymbolRequest`

| Field | Type | Description |
|-------|------|-------------|
| `Symbol` | `string` | Broker symbol (e.g., `"EURUSD"`, `"BTCUSDT"`). |
| `TimeFrames` | `ImmutableArray<TimeFrame>` | Timeframes the strategy consumes. Can include `Tick` if raw tick feed is desired. |

## Validation

- `InitialBalance` must be `> 0`.
- `Leverage` must be `> 0`.
- `RequestedSymbols` must not be empty.
- Each `SymbolRequest` must have a non‑empty `Symbol` and at least one `TimeFrame` (but `TimeFrame.Tick` alone is valid).
- Duplicate `Symbol` values (case‑insensitive) are not allowed. A `ConfigurationException` is thrown if the same symbol appears more than once.

## Example (JSON, as Cloud might send)

```json
{
    "InitialBalance": 10000.0,
    "Leverage": 100.0,
    "RequestedSymbols": [
        {
            "Symbol": "EURUSD",
            "TimeFrames": ["M1", "H1"]
        },
        {
            "Symbol": "BTCUSDT",
            "TimeFrames": ["Tick"]
        }
    ]
}
```

---
