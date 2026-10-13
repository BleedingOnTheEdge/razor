---
id: product:razor/cross-cutting/glossary/market-data-and-instruments
parent: product:razor/cross-cutting/glossary
title: Market Data and Instruments
level: product
kind: cross-cutting
domains: [data, engine]
keywords:
  - market data
  - instruments
  - ticks
  - bars
  - ohlcv
  - prices
  - bid
  - ask
  - tick data files
  - market time
  - wall-clock time
---

# Market Data and Instruments

**Agnosticism (Market/Exchange/Asset)**
The principle that Razor's core engine contains no knowledge of any particular market type. All exchange‑specific logic resides in adapters.

**Ask**
The price at which a seller is willing to sell. In a tick, `Ask` is the lowest offer price.

**Asset Class**
A category of financial instrument: `Forex`, `CryptoSpot`, `CryptoPerpetual`, `Equity`, `Future`, `CFD`.

**Bar (OHLCV)**
Open, High, Low, Close, Volume data for a fixed timeframe (e.g., 1‑hour candle). Razor is tick‑only; bars are only used in adapters for data conversion.

**Bid**
The price at which a buyer is willing to buy. In a tick, `Bid` is the highest bid price.

**Binary Tick File**
A file format (`.chrs`) used by adapters to store historical tick data. Starts with a header (`CHRS` magic, version 1) followed by raw `Tick` structs.

**Blittable**
A data type that has an identical memory layout in managed and unmanaged code. `Tick` is blittable, allowing direct memory‑mapped I/O.

**BorrowedTickData**
A disposable wrapper that groups memory‑mapped tick streams and their file paths. On disposal, it notifies the adapter that the files may be safely deleted.

**Data Action Policy**
Enum (`DataActionPolicy` in `Sdk.Shared`) that defines whether binary tick files are kept, deleted, or cached after use. Values: `KeepUntilExit`, `DeleteAfterTask`, `PersistentCache`.

**IClock**
Abstraction for time. `TickClock` provides market time; `SystemClock` provides wall‑clock time.

**Memory‑Mapped File**
A file whose contents are mapped directly into virtual memory, allowing zero‑copy access. Used for large historical tick files via `MemoryMappedTickList`.

**OHLCV**
Open, High, Low, Close, Volume. Bar data; Razor computes OHLC on‑demand from ticks via `TickWindow`.

**Price Type**
Enum (`PriceType` in `Sdk.Shared`) for OHLC aggregation: `Bid`, `Ask`, or `Mid`.

**Symbol Properties**
Exchange‑specific metadata for a trading symbol (tick size, contract size, margin rates, etc.). Located in `Sdk.Shared`.

**SystemClock**
An `IClock` implementation providing wall‑clock time for non‑trading purposes (order guards, telemetry, logging).

**Tick**
A single price update: timestamp, bid, ask, volume. The fundamental data unit in Razor.

**Tick Clock**
An `IClock` implementation driven by tick timestamps. Used for all trading calculations.

**Tick Window**
A sliding ring buffer of recent ticks per symbol. Provides on‑demand OHLC aggregation. Located in `Sdk.Shared`.

**Tick‑Only Core**
The principle that Razor never processes bars natively; all operations use raw ticks.

**TickSynthesizer**
A static helper class in `Sdk.Shared` that converts bar data into synthetic tick arrays and computes stream metrics.

**TimeFrame**
An enum in `Sdk.Shared` representing aggregation periods: `Tick`, `M1`, `M5`, `H1`, `D1`, etc.

**Wall‑Clock Time**
Real‑world time, as opposed to tick‑driven market time. Used only for scheduling, telemetry, and health checks.
