---
id: product:razor/contracts/configuration-reference/slot-capability-interfaces
parent: product:razor/contracts/configuration-reference
title: Slot Capability Interfaces
level: product
kind: contract
domains: [sdk, extensions]
flows: [extension-development]
keywords:
  - slot capabilities
  - adapter capability
  - strategy capability
  - neural network model
  - iadaptercapability
  - istrategycapability
  - ineuralnetworkmodel
  - capability flags
references:
  - product:razor/contracts/configuration-reference/market-data-types
code_paths:
  - core/src/Sdk/Slots/**
---

# Slot Capability Interfaces

**Namespace:** `Sdk.Slots`

Slots are the capability points an extension can occupy. Each slot has one public interface, and the
engine discovers implementations by directory (see
`product:razor/contracts/extension-developer-guide/deployment`). Three slot types exist: adapter,
strategy and neural network model.

## Adapter: `IAdapterCapability`

**Namespace:** `Sdk.Slots.Adapter`

Replaces the previous `IAdapter`, `IHistoricalDataProvider`, `ILiveDataProvider`, and `IExecutionProvider` interfaces. An adapter declares which sub-capabilities it supports via boolean flags.

### Capability Flags

| Flag | Type | Description |
|------|------|-------------|
| `SupportsHistoricalData` | `bool` | Whether this adapter can provide historical tick data. |
| `SupportsLiveData` | `bool` | Whether this adapter can stream live tick data. |
| `SupportsExecution` | `bool` | Whether this adapter can execute orders. |

The engine queries these flags at startup and only invokes methods for supported capabilities. If an unsupported method is called, throw `NotSupportedException`. A data-only adapter sets `SupportsHistoricalData` and `SupportsLiveData` to `true` and `SupportsExecution` to `false`.

### Core Members

| Member | Type | Description |
|--------|------|-------------|
| `Name` | `string` | Human-readable adapter name. |
| `Calculator` | `IMarketCalculator` | Exchange-specific financial calculator. |
| `IsConnected` | `bool` | Whether the adapter is currently connected. |

### Connection

| Member | Description |
|--------|-------------|
| `Task<bool> ConnectAsync(CancellationToken cancellationToken)` | Establishes the underlying connection. |
| `Task DisconnectAsync()` | Gracefully disconnects. |

### Historical Data

| Member | Description |
|--------|-------------|
| `Task<HistoricalDataResponse> FetchHistoryToBinaryFileAsync(HistoricalDataRequest request, CancellationToken cancellationToken)` | Fetches history and writes it to a binary file. |
| `Task DeleteHistoryFileAsync(string filePath)` | Deletes a previously cached binary file. |
| `Task NotifyFileSafeToDeleteAsync(string filePath)` | Called by Razor after it has finished reading the binary file. |

### Live Data

| Member | Description |
|--------|-------------|
| `Task SubscribeAsync(string symbol)` | Subscribes to tick updates for the given symbol. |
| `Task UnsubscribeAsync(string symbol)` | Unsubscribes from tick updates. |
| `event Action<string, Tick> OnTickReceived` | Raised for every received tick. |

### Execution

| Member | Description |
|--------|-------------|
| `Task<AdapterOrderResponse> ExecuteOrderAsync(AdapterOrderRequest request)` | Submits a new order. |
| `Task<AdapterOrderResponse> ModifyOrderAsync(long ticket, double? sl = null, double? tp = null, double? price = null)` | Modifies an existing order's SL, TP, or limit/stop price. |
| `Task<AdapterOrderResponse> ClosePositionAsync(long ticket, double? volume = null)` | Closes a position (or partially closes it). |
| `Task<AdapterOrderResponse> CancelAsync(long ticket)` | Cancels a pending order. |
| `Task<(double Balance, double Equity)> GetAccountInfoAsync(CancellationToken cancellationToken = default)` | Returns current account balance and equity. |
| `Task<IReadOnlyList<Position>> GetActivePositionsAsync()` | Returns all currently open positions. |
| `Task<IReadOnlyList<Order>> GetPendingOrdersAsync()` | Returns all currently pending orders. |
| `Task<SymbolProperties?> GetSymbolPropertiesAsync(string symbol, CancellationToken cancellationToken = default)` | Fetches symbol properties from the exchange. |
| `event Action<ExecutionReport> OnExecutionUpdate` | Raised when a dynamic execution update is received. |

### Symbol Support

| Member | Description |
|--------|-------------|
| `TimeFrame[]? GetSupportedTimeframes(string symbol)` | Returns supported timeframes, or null if all are supported. |

## Strategy: `IStrategyCapability`

**Namespace:** `Sdk.Slots.Strategy`

Replaces the previous `IStrategy` interface. Strategies are slot capabilities discovered in the `Strategies/` directory.

### Lifecycle

| Member | Description |
|--------|-------------|
| `Task OnConfigureAsync(StrategySpecification spec)` | Called once before any data is processed. Receives immutable configuration. |
| `Task OnStartAsync(IIndicatorRegistry indicators)` | Called at the start of a run. The indicator registry is ready. |
| `void OnTick(string symbol, Tick tick)` | Called for every tick in chronological order. The `symbol` identifies the instrument. Must be purely synchronous to guarantee determinism. |
| `Task OnStopAsync()` | Called at the end of a run. |

### Gene Support

| Member | Description |
|--------|-------------|
| `int TotalGeneCount` | Total number of genes in the chromosome (property genes + neural network parameters). |
| `void InjectGenes(double[] genes)` | Injects a chromosome's gene values into the strategy. |
| `double[] ExportGenes()` | Exports the current gene values from the strategy. |

### Neural Network

| Member | Description |
|--------|-------------|
| `bool RequiresNeuralNetwork` | Whether this strategy requires a neural network model. |
| `INeuralNetworkModel? NeuralNetwork { get; set; }` | The neural network model, set by the engine before initialization. |

## Neural Network Model: `INeuralNetworkModel`

**Namespace:** `Sdk.Slots.NeuralNetwork`

Neural networks are slot capabilities. The engine activates an `INeuralNetworkModel` instance from the `NeuralNetworks/` directory when the active strategy declares `RequiresNeuralNetwork = true`. The model supports feed-forward, ONNX, LSTM, RL, and other architectures through a unified parameter-vector interface compatible with the GA.

### Members

| Member | Type | Description |
|--------|------|-------------|
| `ModelType` | `string` | Human-readable model type identifier (e.g., `"FeedForward"`, `"ONNX"`, `"RL-DQN"`). |
| `InputSize` | `int` | Number of input features the model expects. |
| `OutputSize` | `int` | Number of output values the model produces. |
| `ParameterCount` | `int` | Total number of double parameters (weights, biases, etc.) that the GA includes in the chromosome. |
| `Predict` | `double[] Predict(double[] inputs)` | Performs a forward pass and returns predictions. |
| `LoadParameters` | `void LoadParameters(double[] genes)` | Loads a flat parameter vector into the model's internal structure. |
| `ExportParameters` | `double[] ExportParameters()` | Exports the current parameters as a flat array. |
| `Reset` | `void Reset()` | Resets any internal state. Called before each backtest or evaluation run. |
| `SerializeState` | `byte[] SerializeState()` | Serializes the full model state for save/restore. |
| `DeserializeState` | `void DeserializeState(byte[] state)` | Deserializes the model state from a previously saved snapshot. |
