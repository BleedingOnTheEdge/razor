---
id: product:razor/cross-cutting/principles/determinism-is-mandatory
parent: product:razor/cross-cutting/principles
title: 2. Determinism is Mandatory
level: product
kind: cross-cutting
---

# 2. Determinism is Mandatory
**Given the same inputs, Razor must produce bit‑identical output on every run, across all supported environments, within the same .NET major version (and across versions when a portable RNG is used).**

- All randomness in backtesting, optimisation, and gene initialisation must be seeded deterministically from a user‑supplied master seed.
- `System.Random` may be used **only** when perfect cross‑version reproducibility is not required. For GA operations that must be auditable across .NET runtime updates, a custom portable pseudo‑random number generator (`CustomizedRandom`) is required. This generator must be serialisable so that optimisation state can be saved and resumed exactly.
- The GA's individual seed generation must not rely on `HashCode` (which changes between .NET versions). Instead, use the master seed plus a deterministic, stable hash (e.g., a pre‑generated sequence from the portable RNG).
- System clock (`DateTime.UtcNow`, `Environment.TickCount64`, etc.) must never influence trading or backtest logic. (See Principle 3.)
- A "golden test" suite must exist that executes deterministic scenarios and fails if the output hash changes.
- Determinism is non‑negotiable: if it breaks, Razor is unusable for strategy validation.

---
