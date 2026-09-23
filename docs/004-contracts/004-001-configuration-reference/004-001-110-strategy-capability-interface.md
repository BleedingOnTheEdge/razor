---
id: product:razor/contracts/configuration-reference/strategy-capability-interface
parent: product:razor/contracts/configuration-reference
title: 11. Strategy Capability Interface
level: product
kind: contract
---

# 11. Strategy Capability Interface

**Type:** `IStrategyCapability` (interface)  
**Namespace:** `Razor.Core.Sdk.Slots.Strategy`

Replaces the previous `IStrategy` interface. Strategies are slot capabilities discovered in the `Strategies/` directory.

## Lifecycle

| Member | Description |
|--------|-------------|
| `Task OnConfigureAsync(StrategySpecification)` | Called once before any data is processed. Receives immutable configuration. |
| `Task OnStartAsync(IIndicatorRegistry)` | Called at the start of a run. The indicator registry is ready. |
| `void OnTick(string symbol, Tick tick)` | Called for every tick in chronological order. The `symbol` identifies the instrument. Must be purely synchronous to guarantee determinism. |
| `Task OnStopAsync()` | Called at the end of a run. |

## Gene Support

| Member | Description |
|--------|-------------|
| `int TotalGeneCount` | Total number of genes in the chromosome (property genes + neural network parameters). |
| `void InjectGenes(double[])` | Injects a chromosome's gene values into the strategy. |
| `double[] ExportGenes()` | Exports the current gene values from the strategy. |

## Neural Network

| Member | Description |
|--------|-------------|
| `bool RequiresNeuralNetwork` | Whether this strategy requires a neural network model. |
| `INeuralNetworkModel? NeuralNetwork` | The neural network model, set by the engine before initialization. |

---
