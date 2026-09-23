---
id: product:razor/contracts/extension-developer-guide/developing-a-neural-network-model
parent: product:razor/contracts/extension-developer-guide
title: 7. Developing a Neural Network Model
level: product
kind: contract
---

# 7. Developing a Neural Network Model

Neural network models are slot capabilities. Implement `INeuralNetworkModel` (in `Razor.Core.Sdk.Slots.NeuralNetwork`) and place the DLL in the `NeuralNetworks/` directory. The engine activates the model when the active strategy declares `RequiresNeuralNetwork = true`.

## 7.1 The `INeuralNetworkModel` Interface

```csharp
public interface INeuralNetworkModel
{
    string ModelType { get; }
    int InputSize { get; }
    int OutputSize { get; }
    int ParameterCount { get; }
    double[] Predict(double[] inputs);
    void LoadParameters(double[] genes);
    double[] ExportParameters();
    void Reset();
    byte[] SerializeState();
    void DeserializeState(byte[] state);
}
```

## 7.2 Built‑In Feed‑Forward Network

Razor Kernel includes a built‑in `FeedForwardNetwork` implementation. If no custom model is provided and the strategy requires a neural network, the engine uses the built‑in feed‑forward network. The topology is determined by the strategy's gene schema.

## 7.3 Creating an ONNX Model

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

## 7.4 Creating an RL Model

For reinforcement learning, implement `INeuralNetworkModel` and use `Reset()` to start new episodes. The `Predict` method maps state observations to action Q‑values. The GA evolves the policy weights.

---
