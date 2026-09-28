---
id: product:razor/contracts/extension-developer-guide/developing-a-neural-network-model
parent: product:razor/contracts/extension-developer-guide
title: Developing a Neural Network Model
level: product
kind: contract
domains: [sdk, extensions]
flows: [extension-development]
keywords:
  - developing a neural network model
  - ineuralnetworkmodel
  - feedforwardnetwork
  - onnx
  - reinforcement learning
  - lstm
references:
  - product:razor/contracts/configuration-reference/slot-capability-interfaces
---

# Developing a Neural Network Model

Neural network models are slot capabilities. Implement `INeuralNetworkModel` (in `Sdk.Slots.NeuralNetwork`) and place the DLL in the `NeuralNetworks/` directory. The engine activates the model when the active strategy declares `RequiresNeuralNetwork = true`. The interface members are defined in `product:razor/contracts/configuration-reference/slot-capability-interfaces`.

## Built-In Feed-Forward Network

`Kernel` includes a built-in `FeedForwardNetwork` implementation. If no custom model is provided and the strategy requires a neural network, the engine uses the built-in feed-forward network. The topology is determined by the strategy's gene schema.

## Creating an ONNX Model

To use models trained in Python (PyTorch, TensorFlow), create an ONNX wrapper:

```csharp
public class OnnxModel : INeuralNetworkModel
{
    private InferenceSession _session;
    private double[] _parameters;

    public string ModelType => "ONNX";
    // ... implement all members using Microsoft.ML.OnnxRuntime
}
```

## Creating an RL Model

For reinforcement learning, implement `INeuralNetworkModel` and use `Reset()` to start new episodes. The `Predict` method maps state observations to action Q-values. The GA evolves the policy weights.
