---
id: product:razor/contracts/configuration-reference/validation-and-exceptions
parent: product:razor/contracts/configuration-reference
title: Validation and Exceptions
level: product
kind: contract
domains: [engine, sdk]
keywords:
  - validation
  - validation principles
  - configuration exception
  - adapter exception
  - strategy exception
  - optimization exception
  - engine exception
references:
  - product:razor/contracts/configuration-reference/hook-system
  - product:razor/contracts/configuration-reference/market-data-types
  - product:razor/cross-cutting/principles/configuration-is-source-of-truth-strict-validation
code_paths:
  - core/src/Sdk/Shared/Exceptions.cs
---

# Validation and Exceptions

## Validation Principles

- Every specification record has a `Validate()` method throwing `ConfigurationException`.
- No critical parameter is silently defaulted (Principle 9, `product:razor/cross-cutting/principles/configuration-is-source-of-truth-strict-validation`).
- All parsing uses `TryParse`-style methods with clear error messages.
- Fitness evaluation is performed by hook plugins via the `optimization.fitness.evaluate` hook, not by a built-in `IFitnessModel`.
- Slippage and commission are adapter-internal concerns, handled through the adapter's `IMarketCalculator` and `SymbolProperties`, not through a user-supplied `ISimulationFriction`.
- All seeds used for deterministic randomness must be non-negative; negative values are rejected.
- Duplicate symbols in `RequestedSymbols` are forbidden and will cause validation failure.

## Common Exceptions

| Exception | Namespace | Description |
|-----------|-----------|-------------|
| `ConfigurationException` | `Sdk.Shared` | Thrown when a specification contains invalid values. |
| `AdapterException` | `Sdk.Shared` | Thrown when an adapter operation fails. |
| `StrategyException` | `Sdk.Shared` | Thrown when a strategy encounters an error. |
| `OptimizationException` | `Sdk.Shared` | Thrown during GA optimisation failures. |
| `EngineException` | `Engine.Core.Exceptions` | Base exception for engine-specific errors. |
