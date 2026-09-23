---
id: product:razor/blueprint/internal-architecture/determinism-infrastructure
parent: product:razor/blueprint/internal-architecture
title: 15. Determinism Infrastructure
level: product
kind: blueprint
---

# 15. Determinism Infrastructure

## 15.1 Random Number Generation

`CustomizedRandom` is a custom xorshift128+ implementation that guarantees identical sequences across .NET versions and platforms. It is used for:

- GA population initialisation
- GA selection, crossover, and mutation
- Deterministic gene initialisation for backtests
- Synthetic tick generation (optional)

`System.Random` is never used in any path that affects backtest output or optimisation results. Negative seeds are rejected by `CustomizedRandom`'s `int` constructor to avoid confusion.

## 15.2 Seeding Strategy

- A **master seed** is provided by the user (through configuration). All randomness derives from this seed. It must be non‑negative.
- Per‑individual GA seeds are generated with `(masterSeed * 397) ^ index` — stable across .NET versions.
- Backtest gene seeds are generated from the nullable `GeneInitializationSeed` in `ExecutionSpecification`.

## 15.3 System Clock Prohibition

No trading logic accesses `DateTime.UtcNow` or `Environment.TickCount64`. The only exceptions are the `SystemClock` used for order guards, telemetry, and logging, all of which are non‑trading concerns.

## 15.4 Golden Tests

A separate test suite (CI gate) executes a full backtest twice with identical inputs and compares the hash of the serialised trade history. Any difference fails the build. This validates determinism across code changes and .NET updates.

---
