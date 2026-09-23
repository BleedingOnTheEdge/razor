---
id: product:razor/contracts/configuration-reference/adapter-capability-interface
parent: product:razor/contracts/configuration-reference
title: 10. Adapter Capability Interface
level: product
kind: contract
---

# 10. Adapter Capability Interface

**Type:** `IAdapterCapability` (interface)  
**Namespace:** `Razor.Core.Sdk.Slots.Adapter`

Replaces the previous `IAdapter`, `IHistoricalDataProvider`, `ILiveDataProvider`, and `IExecutionProvider` interfaces. An adapter declares which sub‑capabilities it supports via boolean flags.

## Capability Flags

| Flag | Type | Description |
|------|------|-------------|
| `SupportsHistoricalData` | `bool` | Whether this adapter can provide historical tick data. |
| `SupportsLiveData` | `bool` | Whether this adapter can stream live tick data. |
| `SupportsExecution` | `bool` | Whether this adapter can execute orders. |

## Core Members

| Member | Type | Description |
|--------|------|-------------|
| `Name` | `string` | Human‑readable adapter name. |
| `Calculator` | `IMarketCalculator` | Exchange‑specific financial calculator. |
| `IsConnected` | `bool` | Whether the adapter is currently connected. |

## Connection

| Member | Description |
|--------|-------------|
| `Task<bool> ConnectAsync(CancellationToken)` | Establishes the underlying connection. |
| `Task DisconnectAsync()` | Gracefully disconnects. |

## Historical Data

| Member | Description |
|--------|-------------|
| `Task<HistoricalDataResponse> FetchHistoryToBinaryFileAsync(...)` | Fetches history and writes it to a binary file. |
| `Task DeleteHistoryFileAsync(string)` | Deletes a previously cached binary file. |
| `Task NotifyFileSafeToDeleteAsync(string)` | Called by Razor after it has finished reading the binary file. |

## Live Data

| Member | Description |
|--------|-------------|
| `Task SubscribeAsync(string)` | Subscribes to tick updates for the given symbol. |
| `Task UnsubscribeAsync(string)` | Unsubscribes from tick updates. |
| `event Action<string, Tick> OnTickReceived` | Raised for every received tick. |

## Execution

| Member | Description |
|--------|-------------|
| `Task<AdapterOrderResponse> ExecuteOrderAsync(AdapterOrderRequest)` | Submits a new order. |
| `Task<AdapterOrderResponse> ModifyOrderAsync(long, double?, double?, double?)` | Modifies an existing order. |
| `Task<AdapterOrderResponse> ClosePositionAsync(long, double?)` | Closes a position (or partially closes it). |
| `Task<AdapterOrderResponse> CancelAsync(long)` | Cancels a pending order. |
| `Task<(double Balance, double Equity)> GetAccountInfoAsync(...)` | Returns current account balance and equity. |
| `Task<IReadOnlyList<Position>> GetActivePositionsAsync()` | Returns all currently open positions. |
| `Task<IReadOnlyList<Order>> GetPendingOrdersAsync()` | Returns all currently pending orders. |
| `Task<SymbolProperties?> GetSymbolPropertiesAsync(string, ...)` | Fetches symbol properties from the exchange. |
| `event Action<ExecutionReport> OnExecutionUpdate` | Raised when a dynamic execution update is received. |

## Symbol Support

| Member | Description |
|--------|-------------|
| `TimeFrame[]? GetSupportedTimeframes(string)` | Returns supported timeframes, or null if all are supported. |

---
