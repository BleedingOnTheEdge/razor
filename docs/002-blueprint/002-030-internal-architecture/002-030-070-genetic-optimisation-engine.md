---
id: product:razor/blueprint/internal-architecture/genetic-optimisation-engine
parent: product:razor/blueprint/internal-architecture
title: Genetic Optimisation Engine
level: product
kind: blueprint
domains: [optimisation]
flows: [optimisation-run]
keywords:
  - genetic algorithm
  - chromosome
  - gene schema
  - tournament selection
  - crossover
  - mutation
  - elitism
  - stagnation
  - hyper mutation
  - save state
code_paths:
  - core/src/Kernel/Optimization/**
---

# Genetic Optimisation Engine

## Components

- **`GeneticOptimizer`** – Steppable GA implementing `IGeneticOptimizer`. Host controls generation flow.
- **`Chromosome`** – A single candidate solution. Contains a double[] gene array, fitness, generation index, seed. The sentinel `Chromosome.NotEvaluated` (`double.NegativeInfinity`) marks unevaluated chromosomes.
- **`GeneInjector`** – Static class in `Sdk.Shared` for extracting schemas, injecting genes into strategy properties and neural network models, and building complete chromosome arrays.
- **`OptimizationSpecification`** – Immutable configuration (population size, mutation rate, etc.) in `Kernel.Configuration`.
- **`GeneticOptimizerState`** – Serializable state for pause/resume.

## Chromosome Schema

A chromosome is a flat `double[]` built from:

1. **Strategy properties** decorated with `[Gene]` attributes (min, max, step, type). **Note:** The `Step` parameter is only valid for `Discrete` and `Categorical` gene types; for `Continuous`, `Structural`, and `Parametric` it must be `0`, enforced by the `GeneAttribute` constructor.
2. **Neural network parameters** (if an `INeuralNetworkModel` is active), appended after the property genes. The parameter count is obtained from `INeuralNetworkModel.ParameterCount`.

The schema is extracted via `GeneInjector.BuildCompleteSchema()`. The total gene count is deterministic.

## Initialization

- **Master seed** from `OptimizationSpecification.MasterSeed` (must be `≥ 0`).
- **Per‑individual seed** generated with `(masterSeed * 397) ^ index`, avoiding platform‑dependent `HashCode`.
- **RNG** is `CustomizedRandom` (portable xorshift128+). The `int` constructor rejects negative seeds to guarantee predictable sequences.
- Each gene is randomly chosen within its constraints using `GeneInjector.GenerateRandomGene()`.

## Evaluation

- Host calls `EvaluateAsync()` with a fitness function delegate.
- Evaluation is parallelised using `Parallel.ForEachAsync` with configurable `MaxDegreeOfParallelism`.
- A typical evaluator runs a full `BacktestRunner` with the chromosome's genes injected into the strategy. The engine invokes the `OnFitnessEvaluation` action hook for the chromosome (a plugin sets the fitness on the context), then the `OnChromosomeEvaluated` action hook once the fitness is known.
- Fitness values are assigned directly to each chromosome.

## Evolution

- **Selection:** Tournament selection (size `TournamentSize`) using the main RNG.
- **Crossover:** Uniform crossover with probability `CrossoverRate`. Genes come from parent1 or parent2.
- **Mutation:** Each gene has a `mutationRate` chance of being randomised. If hyper‑mutation is active, the rate is tripled (capped at 1.0).
- **Elitism:** The best `ElitismPct * PopulationSize` individuals are copied unchanged to the next generation.
- **Stagnation detection:** If the best fitness does not improve for `StagnationGenerationsBeforeHyper` consecutive generations, hyper‑mutation is activated to escape local optima.

## State Serialization and Checkpoints

`SaveState()` produces a `GeneticOptimizerState` record containing a deep clone of the entire population. `LoadState()` restores it. After loading, call `InvalidateFitness()` if the evaluation data has changed.

## Stepping, Checkpoints, and Interventions

The engine exposes fine-grained step-by-step control over optimization runs:

- **Stepping:** `StepComputation` advances the optimization by exactly one generation step and returns the resulting `ComputationCheckpoint`.
- **Checkpoint Inspection:** `GetCheckpoint` retrieves the checkpoint and complete population chromosome data at a given step.
- **State Modification:** `SetCheckpoint` replaces the optimizer state, invalidating fitness across modified chromosomes so they are re-evaluated on the next step or resume.
- **Fingerprinting:** Each checkpoint carries a deterministic SHA-256 fingerprint (and its parent's fingerprint), computed over the generation index, RNG states, individual indices, seeds, genes, and fitness values, enabling verification of pure determinism across runs.
- **Intervention Tracking:** Any external modification via `SetCheckpoint` requires a reason, marks the run as `Diverged = true`, and appends an immutable `InterventionRecord` tracking the step index, previous/new fingerprints, actor, timestamp, and rationale.

---
