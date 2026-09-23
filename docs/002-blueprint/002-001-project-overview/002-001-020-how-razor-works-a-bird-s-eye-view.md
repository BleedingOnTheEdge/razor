---
id: product:razor/blueprint/project-overview/how-razor-works-a-bird-s-eye-view
parent: product:razor/blueprint/project-overview
title: 3. How Razor Works – A Bird's‑Eye View
level: product
kind: blueprint
---

# 3. How Razor Works – A Bird's‑Eye View

A trader installs the Razor Engine on their own server – a Windows or Linux machine they control. The engine connects to the trader's existing broker or trading platform (MetaTrader, cTrader, Binance, Interactive Brokers, etc.) through small extension modules called adapters.

The trader then opens the **Razor Cloud** dashboard in a web browser. From this single interface, they can:

- Configure a trading strategy and launch an optimisation run.
- Watch the genetic algorithm evolve thousands of candidate solutions in real time.
- Review detailed performance reports, including equity curves, drawdown analysis, and risk‑adjusted metrics.
- Deploy the optimised strategy for live trading and monitor its every move – positions, orders, equity, margin – without ever touching the server.

All heavy computation – backtesting millions of tick records, evaluating populations of strategies, training neural networks – happens on the trader's hardware. The Cloud provides the interface, the scheduling, the data storage, and the remote‑control capability. This architecture keeps trading logic and sensitive credentials within the trader's own environment while providing the convenience of a fully managed cloud service.

Developers build strategies, adapters, indicators, hook plugins, and neural network models using a clean public SDK (`Sdk`). The same engine binary serves both development and production; the only difference is the license permission set, making the transition from testing to live seamless.

---
