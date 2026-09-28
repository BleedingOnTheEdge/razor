---
id: product:razor/contracts/extension-developer-guide/developing-an-adapter/data-providers
parent: product:razor/contracts/extension-developer-guide/developing-an-adapter
title: Data Providers
level: product
kind: contract
domains: [data, extensions]
flows: [extension-development]
keywords:
  - historical data provider
  - live data provider
  - binary tick file
  - memory mapped
  - tick synthesizer
  - synthetic ticks
  - subscribe
  - unsubscribe
  - retention
references:
  - product:razor/contracts/configuration-reference/market-data-types
---

# Data Providers

## Historical Data

The adapter's `FetchHistoryToBinaryFileAsync` method downloads or converts historical tick data and stores it in a binary file that Razor can memory-map.

**Implementation steps:**

1. **Download data** from your broker's API (e.g., REST). You can also convert candles/bars into synthetic ticks using `TickSynthesizer.BarsToTicks()`.
2. **Write to binary file** using `BinaryDataMapper.WriteTicksToBinary()`. The ticks must be sorted by ascending `Time`.
3. **Return a `HistoricalDataResponse`** with the full file path, success status, and record count.

**Binary file format:** The file starts with an 8-byte header (`uint magic = 0x53524843`, `int version = 1`), followed by raw `Tick` structs (`[StructLayout(LayoutKind.Sequential, Pack=1)]`). The engine opens the file via `MemoryMappedTickList`; you do not need to implement reading - only writing.

**File lifecycle:** The engine calls `NotifyFileSafeToDeleteAsync()` after it has finished reading the file. Only then may you delete it, based on your retention policy (`DataActionPolicy`, defined in `product:razor/contracts/configuration-reference/market-data-types`). Do not delete the file before receiving that notification.

**Example:**

```csharp
public async Task<HistoricalDataResponse> FetchHistoryToBinaryFileAsync(
    HistoricalDataRequest request, CancellationToken ct)
{
    Bar[] bars = await FetchBarsAsync(request.Symbol, request.StartTime, request.EndTime, ct);
    Tick[] ticks = TickSynthesizer.BarsToTicks(bars);
    string path = Path.Combine(DataDirectory, $"{request.Symbol}_{request.StartTime:yyyyMMdd}.chrs");
    BinaryDataMapper.WriteTicksToBinary(path, ticks);
    return new HistoricalDataResponse
    {
        Symbol = request.Symbol,
        Success = true,
        BinaryFilePath = path,
        TotalRecords = ticks.Length
    };
}
```

## Live Data

Stream real-time tick data directly into the engine.

**Implementation steps:**

- Connect to the broker's WebSocket stream for the given symbol.
- For each tick update, construct a `Tick` struct and raise `OnTickReceived?.Invoke(symbol, tick)`.
- The engine calls `SubscribeAsync` once per symbol; maintain a subscription list and prevent duplicates.
- `UnsubscribeAsync` should disconnect from that symbol's stream.

**Thread safety:** The engine may call subscribe/unsubscribe from multiple threads. Ensure your adapter is thread-safe.
