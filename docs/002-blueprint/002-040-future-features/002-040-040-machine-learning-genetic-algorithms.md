---
id: product:razor/blueprint/future-features/machine-learning-genetic-algorithms
parent: product:razor/blueprint/future-features
title: Machine Learning & Genetic Algorithms
level: product
kind: blueprint
---

# Machine Learning & Genetic Algorithms

- **NEAT (NeuroEvolution of Augmenting Topologies)** – Evolve network structure (nodes/layers) alongside weights. Implemented as an `INeuralNetworkModel` slot capability. The model's `ParameterCount` dynamically varies per chromosome.
- **LSTM & Transformer Network Support** – Recurrent topologies for time‑series memory, loadable as `INeuralNetworkModel` implementations (likely via ONNX).
- **SHAP Value Export** – Post‑optimisation analysis showing which genes/parameters impacted fitness most. Hook plugin on `optimization.completed`.
- **Island Model GA** – Multiple isolated populations run in parallel, exchanging "immigrant" chromosomes to maintain diversity. Internal GA enhancement.
- **Adaptive Mutation Rates (1/5th Rule)** – Dynamically scale the mutation rate based on recent success rate. Internal GA enhancement; hook plugins can observe via `optimization.generation.completed`.
- **Out‑of‑Sample Walk‑Forward API** – Automatically transition into out‑of‑sample testing after an anchored GA completes. Cloud‑orchestrated; the engine's GA and backtest primitives are called in sequence.
- **Gene Constraint Dependencies** – Allow one gene's `Max` to depend dynamically on another's current value (e.g. `FastPeriod < SlowPeriod`). Extension of the `[Gene]` attribute.

---
