---
id: product:razor/blueprint/internal-architecture/configuration-specification-system
parent: product:razor/blueprint/internal-architecture
title: 9. Configuration & Specification System
level: product
kind: blueprint
---

# 9. Configuration & Specification System

All configuration is represented by immutable `record` types that implement a `Validate()` method. A `ConfigurationException` is thrown for invalid input. There are no silent defaults for critical parameters (Principle 9).

**Specifications in `Razor.Core.Kernel.Configuration`:**

- `ExecutionSpecification` – date range, warmup, latency, max positions, stop‑out, parallelism, gene seed (nullable `int?`).
- `OptimizationSpecification` – master seed (`≥ 0`), population/generations, mutation/crossover rates, elitism, tournament size. No walk‑forward fields (orchestration is Cloud‑managed). No `FitnessModel` field (fitness is computed via hooks).
- `LiveSpecification` – magic number, order guard timeout. Continuous optimisation fields removed (Cloud‑orchestrated).

**Specifications in `Razor.Core.Sdk.Shared`:**

- `StrategySpecification` – initial balance, leverage, symbols/timeframes. No `FrictionModel` (adapter‑internal) or `FitnessModel` (hook‑based). Duplicate symbols are rejected.

Each has a static `CreateValidated(...)` factory that performs validation immediately.

**Parsing:** The engine never parses user input (timeframes, etc.) from strings—this is the responsibility of the Cloud. The kernel receives already‑parsed types.

---
