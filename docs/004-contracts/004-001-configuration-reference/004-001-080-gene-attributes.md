---
id: product:razor/contracts/configuration-reference/gene-attributes
parent: product:razor/contracts/configuration-reference
title: 8. Gene Attributes
level: product
kind: contract
---

# 8. Gene Attributes

**Type:** `GeneAttribute` (attribute)  
**Namespace:** `Razor.Core.Sdk.Shared`

Used to decorate strategy properties for GA optimisation.

## Constructor Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `min` | `double` | Minimum allowed value. |
| `max` | `double` | Maximum allowed value. |
| `step` | `double` | Discretisation step. Must be `0` for `Continuous`, `Structural`, and `Parametric` gene types. For `Discrete` and `Categorical` types, `step` must be **positive** (can be any double > 0). The constructor enforces these rules. |
| `type` | `GeneType` | `Continuous`, `Discrete`, `Categorical`, `Structural`, `Parametric`. |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `Name` | `string` | Friendly display name (optional). |
| `Order` | `int` | Deterministic ordering in chromosome (lower = earlier). |

## GeneType Values

- `Continuous` – range with no steps (step must be `0`).
- `Discrete` – stepped values (step must be `> 0`).
- `Categorical` – whole‑number choices (step must be `> 0`).
- `Structural` – topology genes (step must be `0`).
- `Parametric` – neural network weights (step must be `0`).

**Note:** The `step` parameter is only applicable to `Discrete` and `Categorical`. For all other types it must be `0`. The constructor will throw `ArgumentException` if this rule is violated.

---
