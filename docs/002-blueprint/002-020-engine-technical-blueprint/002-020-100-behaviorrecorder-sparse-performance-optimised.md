---
id: product:razor/blueprint/engine-technical-blueprint/behaviorrecorder-sparse-performance-optimised
parent: product:razor/blueprint/engine-technical-blueprint
title: 11. BehaviorRecorder (Sparse, Performance‑Optimised)
level: product
kind: blueprint
---

# 11. BehaviorRecorder (Sparse, Performance‑Optimised)

## 11.1 Purpose

Record **only** the necessary data for RL training: the strategy's state at decision points, the action taken, and the resulting reward.

## 11.2 What Is Recorded (Per Record)

- `TimestampUtc` – UTC time of the decision.
- `SessionId` – unique ID for the backtest/live session.
- `State` – a dictionary of indicator values, positions, equity, etc.
- `Action` – `Buy`, `Sell`, `Close`, `Modify`, `None`.
- `Reward` – change in equity since the last recorded state.

## 11.3 Storage & Flush to Cloud

- **Local file:** Compressed binary (MessagePack + GZip) in `behavior_logs/`.
- **Flush:** Engine flushes to Cloud periodically (interval configured via Cloud).
- **After successful upload:** Local file is deleted.

## 11.4 Performance Optimisations

- **No‑op if disabled.**
- **Batching:** Records buffered in memory and flushed to disk asynchronously.
- **Compression:** GZip on the fly.
- **Low‑priority I/O.**

---
