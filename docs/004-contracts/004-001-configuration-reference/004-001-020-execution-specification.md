---
id: product:razor/contracts/configuration-reference/execution-specification
parent: product:razor/contracts/configuration-reference
title: 2. Execution Specification
level: product
kind: contract
---

# 2. Execution Specification

**Type:** `ExecutionSpecification` (immutable record)  
**Namespace:** `Razor.Core.Kernel.Configuration`

Controls the backtest or optimisation run environment.

## Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `StartDate` | `DateTime` | Yes | — | First tick timestamp (UTC, inclusive). |
| `EndDate` | `DateTime` | Yes | — | Last tick timestamp (UTC, inclusive). Must be `> StartDate`. |
| `MaxParallelThreads` | `int` | No | `0` (auto) | Maximum threads for GA evaluation. `0` = `Environment.ProcessorCount - 1`. |
| `LatencyTicks` | `long` | No | `0` | Simulated execution delay in 100‑ns ticks. `0` = instant fill. |
| `WarmupWindowCount` | `int` | No | `0` | Number of initial tick windows to skip for signal generation. |
| `MaxOpenPositions` | `int` | Yes | — | Hard limit on concurrent positions. Must be `> 0`. |
| `StopOutLevel` | `double` | Yes | — | Stop‑out margin ratio (e.g., `0.5` = 50%). Must be `> 0` and `≤ 1`. |
| `GeneInitializationSeed` | `int?` | No | `null` | Seed for deterministic gene initialization when no explicit genes are provided. `null` means no seed was explicitly supplied. |

> **Note:** The `ExecutionSpecification` does **not** contain a `HistoricalDataPolicy` field. Data retention is controlled at the `BorrowedTickData` level via the `DataActionPolicy` parameter passed to its constructor. The `DataActionPolicy` enum values are `KeepUntilExit`, `DeleteAfterTask`, and `PersistentCache`.

## Validation

- `EndDate > StartDate`.
- `WarmupWindowCount ≥ 0`.
- `MaxOpenPositions > 0`.
- `0 < StopOutLevel ≤ 1`.
- `MaxParallelThreads ≥ 0`.
- `GeneInitializationSeed` must be non‑negative when provided.

## Example

```json
{
    "StartDate": "2024-01-01T00:00:00Z",
    "EndDate": "2024-12-31T23:59:59Z",
    "WarmupWindowCount": 100,
    "MaxOpenPositions": 5,
    "StopOutLevel": 0.5,
    "LatencyTicks": 0,
    "MaxParallelThreads": 0,
    "GeneInitializationSeed": 12345
}
```

---
