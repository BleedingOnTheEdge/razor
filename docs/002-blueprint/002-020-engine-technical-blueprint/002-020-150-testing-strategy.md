---
id: product:razor/blueprint/engine-technical-blueprint/testing-strategy
parent: product:razor/blueprint/engine-technical-blueprint
title: 16. Testing Strategy
level: product
kind: blueprint
---

# 16. Testing Strategy

## 16.1 Unit Tests

- Test each component in isolation: command dispatcher, task manager, extension manager, state manager, cloud connector, schedule manager.

## 16.2 Integration Tests

- Test Engine as a whole: startup, authentication, full command flow, multi‑task concurrency, offline retry, extension reload.

## 16.3 Cross‑Project Integration Tests

- Engine + Kernel: run backtest via Engine, verify results; live trading with mock adapter.

## 16.4 Performance/Load Tests

- Simulate heavy optimisation while live trading; measure CPU/memory, task switching overhead.

---
