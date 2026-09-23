---
id: product:razor/contracts/configuration-reference/validation-principles
parent: product:razor/contracts/configuration-reference
title: 13. Validation Principles
level: product
kind: contract
---

# 13. Validation Principles

- Every specification record has a `Validate()` method throwing `ConfigurationException`.
- No critical parameter is silently defaulted (Principle 9).
- All parsing uses `TryParse`‑style methods with clear error messages.
- Fitness evaluation is performed by hook plugins via the `optimization.fitness.evaluate` hook, not by a built‑in `IFitnessModel`.
- Slippage and commission are adapter‑internal concerns, handled through the adapter's `IMarketCalculator` and `SymbolProperties`, not through a user‑supplied `ISimulationFriction`.
- All seeds used for deterministic randomness must be non‑negative; negative values are rejected.
- Duplicate symbols in `RequestedSymbols` are forbidden and will cause validation failure.

---
