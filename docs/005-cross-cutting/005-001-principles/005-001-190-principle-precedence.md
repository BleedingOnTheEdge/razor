---
id: product:razor/cross-cutting/principles/principle-precedence
parent: product:razor/cross-cutting/principles
title: 19. Principle Precedence
level: product
kind: cross-cutting
domains: [engine]
keywords:
  - principle 19
  - precedence
  - principle conflict
  - architecture board
references:
  - product:razor/cross-cutting/principles/determinism-is-mandatory
  - product:razor/cross-cutting/principles/tick-only-core-no-bar-dependencies
  - product:razor/cross-cutting/principles/internal-clock-no-system-time-in-trading-logic
  - product:razor/cross-cutting/principles/live-backtest-behavioural-parity
  - product:razor/cross-cutting/principles/market-exchange-asset-agnosticism
  - product:razor/cross-cutting/principles/configuration-is-source-of-truth-strict-validation
  - product:razor/cross-cutting/principles/sorted-tick-data-contract
---

# 19. Principle Precedence
When conflicts arise between these principles, the following precedence order applies (higher number overrides lower when absolutely necessary):

1. Determinism (Principle 2, `product:razor/cross-cutting/principles/determinism-is-mandatory`)
2. Tick‑Only Core (Principle 4, `product:razor/cross-cutting/principles/tick-only-core-no-bar-dependencies`)
3. Internal Clock (Principle 3, `product:razor/cross-cutting/principles/internal-clock-no-system-time-in-trading-logic`)
4. Live‑Backtest Parity (Principle 5, `product:razor/cross-cutting/principles/live-backtest-behavioural-parity`)
5. Market Agnosticism (Principle 1, `product:razor/cross-cutting/principles/market-exchange-asset-agnosticism`)
6. Configuration Validation (Principle 9, `product:razor/cross-cutting/principles/configuration-is-source-of-truth-strict-validation`)
7. Sorted Data Contract (Principle 8, `product:razor/cross-cutting/principles/sorted-tick-data-contract`)
8. All others.

**No principle can be violated without an explicit, documented exception approved by the Razor architecture board.**

---
