---
id: product:razor/blueprint/future-features/data-analytics-research
parent: product:razor/blueprint/future-features
title: Data, Analytics & Research
level: product
kind: blueprint
---

# Data, Analytics & Research

- **L2/L3 Order Book Replay** – Support `DepthTick` structs for DOM‑based backtesting. Adapters with depth support register additional tick types.
- **Footprint / Volume Profile Generation** – Synthesise volume profiles locally from raw ticks. Implemented as indicators.
- **Synthetic Spread Symbols** – Define virtual symbols (e.g. `EURUSD‑GBPUSD`) that generate synthetic ticks. Implemented as a specialised indicator.
- **Walk‑Forward 3D Surface Plots** – Export JSON for Plotly.js to render 3D optimisation landscapes. Hook plugin on `optimization.generation.completed`.
- **Trade Correlation Matrix** – Show overlapping exposure times between strategies/symbols after a backtest. Hook plugin on `backtest.completed`.
- **Slippage Heatmaps** – Track expected slippage by time‑of‑day and volume. Hook plugin on `backtest.order.after_execute`.
- **Custom Tick Synthesizer Profiles** – User‑defined tick generation behaviour (random walk vs. historical spread) for legacy bar conversion.
- **Cloud‑Hosted Tick Datalake** – Central repository streaming historical MMF chunks to engines via gRPC.
- **Cloud Storage Adapters** – Read historical data directly from AWS S3, Azure Blob, etc.
- **Multi‑Exchange Data Aggregation** – Composite adapter that merges liquidity from multiple exchanges for a single symbol.
- **Data Quality Checks** – Automatic validation for gaps, spikes, and staleness before backtesting or live use.
- **Tick Data Compression & Streaming** – Compressed binary format; stream from cloud storage without full download.
- **Monte Carlo Simulation** – Randomised backtest variations to assess strategy robustness. Implemented as Cloud‑orchestrated logic using repeated backtest calls.
- **Sensitivity Analysis** – Vary individual parameters and measure performance impact. Cloud‑orchestrated.
- **Custom Report Templates** – User‑definable report layouts (HTML, PDF) with charts and statistics. Hook plugins on `report.before_generate` and `report.after_generate`.

---
