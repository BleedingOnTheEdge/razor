---
id: product:razor/blueprint/project-overview/what-razor-is
parent: product:razor/blueprint/project-overview
title: What Razor Is
level: product
kind: blueprint
keywords:
  - what is razor
  - product definition
  - optimisation engine
  - automated trading
  - cloud control
  - private engine
  - extension marketplace
  - public sdk
references:
  - product:razor/blueprint/product-model
  - product:razor/blueprint/engine-technical-blueprint
---

# What Razor Is

Razor is an **institutional-grade strategy optimisation and automated trading engine**. At its
heart it uses computational intelligence - genetic algorithms, neural networks and rigorous
statistical analysis - to evolve and refine trading strategies automatically. It is not a broker
and not a charting platform: it is the analytical brain that sits on top of a trader's existing
execution infrastructure and makes it systematic, measurable and continuously improving.

## The gap it fills

Professional algorithmic trading has long been split between two extremes.

- **Retail-grade tools** (MetaTrader, TradingView, NinjaTrader) are easy to start with but quickly
  become restrictive. Backtesting is often bar-based, optimisation is rudimentary, and reporting
  rarely goes beyond a trade list. Serious traders outgrow them within months.
- **Institutional systems** (in-house frameworks, Deltix, AlgoTrader) offer the rigour professionals
  need, but at staggering cost and with a dedicated engineering team required to build and maintain
  them. For independent quants, small funds, and professional teams without a seven-figure
  technology budget, they are out of reach.

Between these extremes there was no widely available product delivering **institutional-grade
optimisation, live monitoring and rich reporting in a single, remotely managed package**. Razor
occupies that space.

## How the parts fit together

A trader installs a lightweight Razor Engine on a server they control - Windows or Linux - and the
engine connects to the brokerage or platform they already use (MetaTrader, cTrader, Binance,
Interactive Brokers, and others) through small extension modules called **adapters**.

Everything else happens through the **Razor Cloud** control panel, from a browser:

- configure a strategy and launch an optimisation run;
- watch the genetic algorithm evolve thousands of candidate solutions in real time;
- review performance reports - equity curves, drawdown analysis, risk-adjusted metrics;
- deploy the optimised strategy for live trading and monitor it, without touching the server.

All heavy computation - backtesting tick records, evaluating populations, training neural networks -
runs on the trader's own hardware. The Cloud provides the interface, the scheduling, the storage and
the remote control. This split keeps trading logic and broker credentials inside the trader's
environment while still offering the convenience of a managed service.

## The ecosystem

Razor is built to be extended rather than modified:

- **Public SDK (`Sdk`)** - a NuGet package of contracts only: interfaces, base classes, enums and
  helpers. Developers build extensions without touching engine internals.
- **Extension Marketplace** - a separate service for discovering, licensing and distributing
  adapters, strategies, indicators, hook plugins and neural-network models. Developers can monetise
  their work; users can find and install it.
- **Cloud-first architecture** - configuration, scheduling and reporting live in the Cloud, and the
  Engine is a thin execution node. Deployment, updates and management stay simple as a result.

The same engine binary serves both development and production; only the licence permission set
differs, so moving from testing to live trading is seamless.
