---
id: product:razor/cross-cutting/principles/testing-determinism-verification
parent: product:razor/cross-cutting/principles
title: 12. Testing & Determinism Verification
level: product
kind: cross-cutting
domains: [engine, backtesting]
keywords:
  - principle 12
  - testing
  - determinism verification
  - golden file test
  - integration tests
references:
  - product:razor/cross-cutting/principles/determinism-is-mandatory
---

# 12. Testing & Determinism Verification
**Razor must be accompanied by a comprehensive test suite that proves correctness, stability, and determinism.**

- Unit tests must cover all public interfaces, edge cases, and mathematical calculations (margin, drawdown, Sharpe ratio).
- Integration tests must run full pipelines (backtest, simulated live) with mock adapters and known datasets.
- The golden‑file determinism test must execute a full backtest twice and compare the hash of the trade history (or serialised result) – any mismatch fails CI.
- All new features must include tests that pass before merge.

---
