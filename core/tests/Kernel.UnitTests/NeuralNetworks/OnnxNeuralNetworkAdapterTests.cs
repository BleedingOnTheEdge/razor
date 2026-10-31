// -----------------------------------------------------------------------------
// <copyright file="OnnxNeuralNetworkAdapterTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.UnitTests.NeuralNetworks;

using System;
using Kernel.NeuralNetworks;
using Xunit;

public sealed class OnnxNeuralNetworkAdapterTests
{
    [Fact]
    public void Constructor_RejectsZeroOrNegativeSizes()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new OnnxNeuralNetworkAdapter(0, 1));
        Assert.Throws<ArgumentOutOfRangeException>(() => new OnnxNeuralNetworkAdapter(2, -1));
    }

    [Fact]
    public void Constructor_InitializesDimensionsAndParameterCount()
    {
        // 4 inputs, 2 outputs:
        // weights: 4 * 2 = 8, biases: 2 -> Total = 10 parameters
        var adapter = new OnnxNeuralNetworkAdapter(4, 2);

        Assert.Equal("ONNX", adapter.ModelType);
        Assert.Equal(4, adapter.InputSize);
        Assert.Equal(2, adapter.OutputSize);
        Assert.Equal(10, adapter.ParameterCount);
    }

    [Fact]
    public void Predict_ProducesBoundedTanhOutputs()
    {
        var adapter = new OnnxNeuralNetworkAdapter(2, 1);
        double[] genes = [0.5, -0.5, 0.1]; // 2 weights, 1 bias
        adapter.LoadParameters(genes);

        double[] inputs = [1.0, 2.0];
        // sum = 1.0 * 0.5 + 2.0 * (-0.5) + 0.1 = 0.5 - 1.0 + 0.1 = -0.4
        // output = tanh(-0.4)
        double[] output = adapter.Predict(inputs);

        Assert.Single(output);
        Assert.InRange(output[0], -1.0, 1.0);
        Assert.Equal(Math.Tanh(-0.4), output[0], precision: 6);
    }

    [Fact]
    public void StateSerialization_PreservesModelParameters()
    {
        var adapter = new OnnxNeuralNetworkAdapter(3, 2);
        double[] genes = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, -0.1, -0.2];
        adapter.LoadParameters(genes);

        byte[] serialized = adapter.SerializeState();
        Assert.NotEmpty(serialized);

        var restored = new OnnxNeuralNetworkAdapter(3, 2);
        restored.DeserializeState(serialized);

        double[] exported = restored.ExportParameters();
        Assert.Equal(genes, exported);
    }
}
