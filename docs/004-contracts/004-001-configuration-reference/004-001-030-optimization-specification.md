---
id: product:razor/contracts/configuration-reference/optimization-specification
parent: product:razor/contracts/configuration-reference
title: Optimization Specification
level: product
kind: contract
domains: [optimisation]
flows: [optimisation-run]
keywords:
  - optimization specification
  - master seed
  - generations
  - population size
  - mutation rate
  - crossover rate
  - elitism
  - tournament size
  - stagnation
  - hyper mutation
references:
  - product:razor/contracts/configuration-reference/hook-system
code_paths:
  - core/src/Kernel/Configuration/OptimizationSpecification.cs
---

# Optimization Specification

**Type:** `OptimizationSpecification` (immutable record)
**Namespace:** `Kernel.Configuration`

The optimisation pipeline uses the hook system for fitness evaluation. No `FitnessModel` field is present in the specification; instead, the engine invokes the `optimization.fitness.evaluate` hook after each chromosome evaluation, and the Cloud or a hook plugin computes the fitness score (see `product:razor/contracts/configuration-reference/hook-system`).

## Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `MasterSeed` | `int` | Yes | - | Master seed for the entire GA run. Guarantees reproducibility. Must be non-negative. |
| `Generations` | `int` | Yes | - | Number of generations to evolve. Must be `> 0`. |
| `PopulationSize` | `int` | Yes | - | Individuals per generation. Must be `≥ 4`. |
| `MutationRate` | `double` | Yes | - | Base probability of gene mutation. `[0, 1]`. |
| `CrossoverRate` | `double` | Yes | - | Probability that a gene comes from the first parent. `[0, 1]`. |
| `ElitismPct` | `double` | Yes | - | Fraction of best individuals preserved unchanged. `[0, 1]`. |
| `TournamentSize` | `int` | Yes | - | Number of individuals competing in selection. Must be `≥ 2`. |
| `StagnationGenerationsBeforeHyper` | `int` | No | `3` | Generations without improvement before hyper-mutation activates. `≥ 1`. |
| `MaxParallelThreads` | `int` | No | `0` | Maximum parallel threads for chromosome evaluation. `0` = `Environment.ProcessorCount - 1`. |

## Validation

- `Generations > 0`, `PopulationSize ≥ 4`.
- `0 ≤ MutationRate ≤ 1`, `0 ≤ CrossoverRate ≤ 1`, `0 ≤ ElitismPct ≤ 1`.
- `TournamentSize ≥ 2`.
- `StagnationGenerationsBeforeHyper ≥ 1`.
- `MasterSeed` must be `≥ 0`. Negative seeds are rejected to guarantee deterministic and predictable sequences.
- `MaxParallelThreads ≥ 0`.

## Example

```json
{
    "MasterSeed": 42,
    "Generations": 50,
    "PopulationSize": 100,
    "MutationRate": 0.1,
    "CrossoverRate": 0.5,
    "ElitismPct": 0.05,
    "TournamentSize": 3,
    "StagnationGenerationsBeforeHyper": 3,
    "MaxParallelThreads": 0
}
```
