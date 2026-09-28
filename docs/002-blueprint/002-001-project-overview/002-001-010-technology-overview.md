---
id: product:razor/blueprint/project-overview/technology-overview
parent: product:razor/blueprint/project-overview
title: Technology Overview
level: product
kind: blueprint
keywords:
  - genetic algorithm
  - ga
  - neural network
  - ann
  - onnx
  - lstm
  - reinforcement learning
  - hooks
  - tick data
  - determinism
  - statistical analytics
references:
  - product:razor/blueprint/internal-architecture
  - product:razor/blueprint/engine-technical-blueprint
---

# Technology Overview

Razor is built on a deterministic software foundation designed for scientific accuracy and
reproducibility: every backtest and every optimisation produces identical results given the same
starting conditions. That is a non-negotiable requirement for strategy validation, and it is
enforced rather than merely intended (see `blueprint/internal-architecture/determinism-infrastructure`).

The defining technologies are not separate products to be integrated; they are one coherent engine
reached through a unified interface.

## Genetic algorithms

A population-based optimisation method inspired by biological evolution. Thousands of strategy
variations are generated, evaluated against historical data, and the strongest are bred together
over successive generations. Mutation and crossover introduce diversity while elitism preserves the
best solutions. Razor's implementation adds stagnation detection and hyper-mutation so that results
are robust rather than curve-fitted; walk-forward analysis is Cloud-orchestrated from repeated
backtest and optimisation commands, not an engine feature.

## Artificial neural networks

Deep-learning models that can be embedded directly in a strategy. They learn patterns from tick data
and market conditions, producing signals that rule-based logic captures poorly. A unified
parameter-vector interface (`INeuralNetworkModel`) keeps the engine compatible with feed-forward,
ONNX, LSTM and reinforcement-learning architectures, and the genetic algorithm can optimise a
network's weights alongside the strategy's own parameters - co-evolving the whole system.

## Hooks

A priority-based extensibility mechanism, modelled on WordPress. Hook plugins register filter
callbacks that transform or reject data, and action callbacks that observe events, at 42 named hook
points across the backtest, live, optimisation and reporting pipelines. Custom risk
management, notifications, metrics, reporting and trailing stops all become possible without
modifying the engine.

## Tick-only core

All operations consume raw tick data rather than bars. OHLC statistics are aggregated on demand from
the tick stream, which maximises fidelity and flexibility, lets strategies react to every price
movement, and keeps high-frequency and low-latency approaches viable.

## Statistical analytics

A metrics library computes Sharpe, Sortino and Calmar ratios, profit factor, win rate and maximum
drawdown, both at portfolio level and per symbol. Correlation matrices show how strategies interact,
and Monte Carlo analysis tests robustness under randomly reordered trades.
