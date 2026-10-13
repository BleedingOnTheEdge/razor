---
id: product:razor/blueprint/engine-technical-blueprint/behavior-recorder
parent: product:razor/blueprint/engine-technical-blueprint
title: Behavior Recorder
level: product
kind: blueprint
domains: [engine, data]
keywords:
  - behaviorrecorder
  - reinforcement learning
  - decision records
  - sparse recording
  - messagepack
  - gzip
  - behaviour logs
references:
  - product:razor/blueprint/engine-technical-blueprint/logging-and-telemetry
  - product:razor/blueprint/internal-architecture
code_paths:
  - core/src/Engine/Services/BehaviorRecorder/**
---

# Behavior Recorder

## Purpose

Record **only** what reinforcement-learning training needs: the strategy's state at a decision point,
the action taken, and the resulting reward. Not a full trace - a decision log.

## What a record contains

| Field | Meaning |
|---|---|
| `TimestampUtc` | When the decision was taken |
| `SessionId` | The backtest or live session it belongs to |
| `StrategyName` | The strategy that generated the record |
| `State` | Indicator values, positions, equity, and similar |
| `Action` | A free-form `string` describing what happened at the decision point. The engine's own snapshot hook emits `Snapshot`; the strategy sets the trading values, typically `Buy`, `Sell`, `Close` or `None`. Open-ended - not a closed enum. |
| `Reward` | Change in equity since the previous recorded state |

## Storage and flush

- **Local:** a compressed binary file (MessagePack plus GZip) under `behavior_logs/`.
- **Flush:** the engine uploads to the Cloud periodically, at an interval the Cloud configures.
- **After a successful upload the local file is deleted**, so behaviour logs do not accumulate on the
  client's disk.

## Performance discipline

- **No-op when disabled** - recording is off entirely unless switched on.
- **Batching** - records buffer in memory and flush to disk asynchronously.
- **Compression** - GZip on the fly.
- **Low-priority I/O** - recording never competes with live trading.

The design follows from the same rule as the rest of the engine: the recording path must not be
observable from the trading path.
