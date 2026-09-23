---
id: product:razor/contracts/configuration-reference/live-specification
parent: product:razor/contracts/configuration-reference
title: 4. Live Specification
level: product
kind: contract
---

# 4. Live Specification

**Type:** `LiveSpecification` (immutable record)  
**Namespace:** `Razor.Core.Kernel.Configuration`

The live trading specification defines the parameters for a live trading session. Continuous optimisation is orchestrated by Razor Cloud; the Cloud sends the engine commands to start/stop optimisation runs based on the user's profile settings.

## Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `MagicNumber` | `int` | Yes | — | Unique number to tag orders from this strategy instance. Must be `> 0`. |
| `OrderGuardTimeoutSeconds` | `int` | No | `5` | Window (in seconds) during which duplicate orders are rejected. Must be `> 0`. |

## Validation

- `MagicNumber > 0`.
- `OrderGuardTimeoutSeconds > 0`.

## Example

```json
{
    "MagicNumber": 123456,
    "OrderGuardTimeoutSeconds": 10
}
```

---
