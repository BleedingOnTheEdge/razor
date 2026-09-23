---
id: product:razor/blueprint/internal-architecture/data-flow-architecture
parent: product:razor/blueprint/internal-architecture
title: 3. Data Flow Architecture
level: product
kind: blueprint
---

# 3. Data Flow Architecture

Razor deals with ticks in two distinct modes, matching the principle that file‑based storage is only used when the volume demands it (backtesting/optimisation). The live path uses direct streaming with no file intermediary.

## 3.1 Historical Data Flow (Backtesting & Optimisation)

Used when the engine needs to replay large, static tick datasets.

```
Adapter.FetchHistoryToBinaryFileAsync()
        │
        ▼
  Binary file on disk  (magic/version header + raw Tick[])
        │
        ▼
  MemoryMappedTickList  (zero‑copy read‑only access)
        │
        ▼
  BorrowedTickData  (grouped streams + symbols)
        │
        ▼
  MergedTickTimeline  (single chronological stream)
        │
        ▼
  BacktestRunner / GA evaluator
        │
        ▼
  Disposal → NotifyFileSafeToDeleteAsync()
```

**Details:**

1. **Adapter fetches data:** The adapter implements `IAdapterCapability.FetchHistoryToBinaryFileAsync()`, downloading or converting historical data and writing it as a binary file using `BinaryDataMapper.WriteTicksToBinary()`. The file format is:
   - 8‑byte header: `uint32 magic = 0x53524843` ("CHRS"), `int32 version = 1`.
   - Followed by raw `Tick` structs (`[StructLayout(LayoutKind.Sequential, Pack=1)]`), each 33 bytes.
   - Ticks must be sorted by ascending `Time` (Principle 8). A debug assertion verifies this.

2. **Memory‑mapped access:** `MemoryMappedTickList` maps the file into virtual memory using `MemoryMappedFile`, bypassing the managed heap. It uses unsafe pointers for O(1) element access. The file is opened with `FileShare.Read` to allow concurrent reads. The finalizer releases only the raw pointer; managed handles (`MemoryMappedViewAccessor`, `MemoryMappedFile`) are finalized naturally by their own finalizers.

3. **Borrowed context:** `BorrowedTickData` holds an array of these mapped lists (one per symbol) and the corresponding file paths. It also holds a reference to the adapter via `IAdapterCapability`.

4. **Merge:** `MergedTickTimeline.EnumerateEvents()` uses a `PriorityQueue` to merge all streams into a single chronological sequence. Ties are broken by stream index for deterministic ordering. It enforces sorted input by throwing `InvalidOperationException` on out‑of‑order ticks.

5. **Execution:** The merged stream is consumed by `BacktestRunner` or the optimisation fitness evaluator.

6. **Cleanup:** After processing, `BorrowedTickData.DisposeAsync()` disposes the mapped lists (releasing the memory view) and calls `adapter.NotifyFileSafeToDeleteAsync()` for each file path. This enables adapter‑owned deletion (Principle 7).

## 3.2 Live Data Flow

Live ticks arrive asynchronously and are not stored in files.

```
Adapter (exchange WebSocket)
   │ OnTickReceived event (symbol, Tick)
   ▼
LiveBroker.OnTickReceived()
   │ (enqueues tick for processing)
   ▼
LiveBroker.ProcessTickAsync()
   │ (after feeding TickClock)
   ▼
TickClock.SetTickTime(tick.Time)
   │
   ├─→ Update broker state (prices, PnL, stop‑out, holding costs)
   ├─→ Periodic SyncStateAsync (balance/positions/orders)
   └─→ Strategy.OnTick(symbol, tick)
```

The adapter raises `IAdapterCapability.OnTickReceived`. The live broker subscribes, and each tick is enqueued to a dedicated processor thread. There is no file intermediary. The broker immediately updates its internal state and forwards the tick to the strategy, passing both the symbol and the tick data.

---
