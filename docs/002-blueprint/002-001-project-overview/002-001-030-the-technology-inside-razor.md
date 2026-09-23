---
id: product:razor/blueprint/project-overview/the-technology-inside-razor
parent: product:razor/blueprint/project-overview
title: 4. The Technology Inside Razor
level: product
kind: blueprint
---

# 4. The Technology Inside Razor

Razor is built on a modern, deterministic software foundation designed for scientific accuracy and reproducibility. Every backtest, every optimisation, produces identical results given the same starting conditions – a non‑negotiable requirement for strategy validation.

Its core technologies include:

- **Genetic Algorithms (GA)** – A population‑based optimisation method inspired by biological evolution. Thousands of strategy variations are generated, evaluated against historical data, and the best performers are "bred" together over successive generations. Mutations and cross‑over operations introduce diversity, while elitism preserves the strongest solutions. Razor's GA includes advanced features like stagnation detection, hyper‑mutation, and walk‑forward analysis, ensuring robust, non‑curve‑fitted results.

- **Artificial Neural Networks (ANN)** – Deep learning models that can be embedded directly into trading strategies. These networks learn patterns from tick data and market conditions, providing signals that traditional rule‑based logic cannot easily capture. Razor supports a unified parameter‑vector interface (`INeuralNetworkModel`) compatible with feed‑forward, ONNX, LSTM, and RL architectures. The GA can optimise the network's weights alongside the strategy's parameters, co‑evolving the entire system.

- **Hooks System** – A priority‑based extensibility mechanism inspired by WordPress. Hook plugins can register filter callbacks (to transform or reject data) and action callbacks (to observe events) at over 50 named hook points throughout the backtest, live, optimisation, and report pipelines. This enables custom risk management, notifications, metrics, reporting, trailing stops, and more—all without modifying the engine.

- **Tick‑Only Core** – All operations use raw tick data, not bars. OHLC statistics are aggregated on‑demand from the tick stream, ensuring maximum fidelity and flexibility. This design allows strategies to react to every price movement and supports high‑frequency and low‑latency trading strategies.

- **Advanced Statistical Analytics** – A comprehensive metrics library computes Sharpe, Sortino, and Calmar ratios, profit factor, win rate, and maximum drawdown, both at the portfolio level and per‑symbol. Correlation matrices show how strategies interact, while Monte Carlo analysis tests robustness under random trade sequences.

These technologies are not separate products requiring integration; they are a single, coherent engine that the trader accesses through a unified interface.

---
