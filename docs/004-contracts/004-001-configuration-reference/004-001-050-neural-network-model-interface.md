---
id: product:razor/contracts/configuration-reference/neural-network-model-interface
parent: product:razor/contracts/configuration-reference
title: 5. Neural Network Model Interface
level: product
kind: contract
---

# 5. Neural Network Model Interface

**Type:** `INeuralNetworkModel` (interface)  
**Namespace:** `Razor.Core.Sdk.Slots.NeuralNetwork`

Neural networks are slot capabilities. The engine activates an `INeuralNetworkModel` instance from the `NeuralNetworks/` directory when the active strategy declares `RequiresNeuralNetwork = true`. The model supports feed‑forward, ONNX, LSTM, RL, and other architectures through a unified parameter‑vector interface compatible with the GA.

## Members

| Member | Type | Description |
|--------|------|-------------|
| `ModelType` | `string` | Human‑readable model type identifier (e.g., `"FeedForward"`, `"ONNX"`, `"RL-DQN"`). |
| `InputSize` | `int` | Number of input features the model expects. |
| `OutputSize` | `int` | Number of output values the model produces. |
| `ParameterCount` | `int` | Total number of double parameters (weights, biases, etc.) that the GA includes in the chromosome. |
| `Predict` | `double[] Predict(double[] inputs)` | Performs a forward pass and returns predictions. |
| `LoadParameters` | `void LoadParameters(double[] genes)` | Loads a flat parameter vector into the model's internal structure. |
| `ExportParameters` | `double[] ExportParameters()` | Exports the current parameters as a flat array. |
| `Reset` | `void Reset()` | Resets any internal state. Called before each backtest or evaluation run. |
| `SerializeState` | `byte[] SerializeState()` | Serializes the full model state for save/restore. |
| `DeserializeState` | `void DeserializeState(byte[] state)` | Deserializes the model state from a previously saved snapshot. |

## Strategy Integration

The `IStrategyCapability` interface (in `Razor.Core.Sdk.Slots.Strategy`) exposes:

| Member | Type | Description |
|--------|------|-------------|
| `RequiresNeuralNetwork` | `bool` | Whether this strategy requires a neural network model. |
| `NeuralNetwork` | `INeuralNetworkModel?` | The neural network model, set by the engine before initialization. |
| `TotalGeneCount` | `int` | Total genes including strategy properties and neural network parameters. |

---
