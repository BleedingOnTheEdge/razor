// -----------------------------------------------------------------------------
// <copyright file="FeedForwardNetworkTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.UnitTests.NeuralNetworks;

using System;
using Kernel.NeuralNetworks;
using Xunit;

public sealed class FeedForwardNetworkTests
{
    [Fact]
    public void Constructor_RejectsNullOrTooFewLayers()
    {
        Assert.Throws<ArgumentNullException>(() => new FeedForwardNetwork(null!));
        Assert.Throws<ArgumentException>(() => new FeedForwardNetwork([5]));
    }

    [Fact]
    public void Constructor_InitializesDimensionsAndParameterCount()
    {
        // 2 inputs, 3 hidden, 1 output:
        // weights layer 0: 3 * 2 = 6, biases: 3 -> 9
        // weights layer 1: 1 * 3 = 3, biases: 1 -> 4
        // Total = 13 parameters
        var net = new FeedForwardNetwork([2, 3, 1]);

        Assert.Equal("FeedForward", net.ModelType);
        Assert.Equal(2, net.InputSize);
        Assert.Equal(1, net.OutputSize);
        Assert.Equal(13, net.ParameterCount);
    }

    [Theory]
    [InlineData(FeedForwardNetwork.ActivationFunction.ReLU)]
    [InlineData(FeedForwardNetwork.ActivationFunction.Tanh)]
    [InlineData(FeedForwardNetwork.ActivationFunction.Sigmoid)]
    public void Predict_ProducesOutputs_AcrossActivationFunctions(FeedForwardNetwork.ActivationFunction activation)
    {
        var net = new FeedForwardNetwork([2, 4, 2], activation);
        var output = net.Predict([0.5, -0.2]);

        Assert.NotNull(output);
        Assert.Equal(2, output.Length);
    }

    [Fact]
    public void Predict_RejectsNullOrMismatchedInputs()
    {
        var net = new FeedForwardNetwork([3, 2]);

        Assert.Throws<ArgumentNullException>(() => net.Predict(null!));
        Assert.Throws<ArgumentException>(() => net.Predict([1.0, 2.0])); // Expected 3, got 2
    }

    [Fact]
    public void Parameters_ExportAndLoadRoundTrip()
    {
        var net = new FeedForwardNetwork([2, 2, 1]);
        double[] customParams = [0.1, 0.2, 0.3, 0.4, 0.05, 0.06, 0.7, 0.8, 0.09];

        net.LoadParameters(customParams);
        var exported = net.ExportParameters();

        Assert.Equal(customParams, exported);

        // Predict with known weights is deterministic
        var out1 = net.Predict([1.0, 1.0]);
        var out2 = net.Predict([1.0, 1.0]);
        Assert.Equal(out1[0], out2[0]);
    }

    [Fact]
    public void LoadParameters_RejectsInvalidLength()
    {
        var net = new FeedForwardNetwork([2, 2, 1]);
        Assert.Throws<ArgumentNullException>(() => net.LoadParameters(null!));
        Assert.Throws<ArgumentException>(() => net.LoadParameters([1.0, 2.0]));
    }

    [Fact]
    public void SerializeAndDeserializeState_RestoresModelExactly()
    {
        var net1 = new FeedForwardNetwork([3, 4, 1], FeedForwardNetwork.ActivationFunction.Tanh);
        var testInput = new[] { 0.1, -0.5, 0.8 };
        var expectedOutput = net1.Predict(testInput);

        byte[] serialized = net1.SerializeState();
        Assert.NotEmpty(serialized);

        var net2 = new FeedForwardNetwork([3, 4, 1], FeedForwardNetwork.ActivationFunction.Tanh);
        net2.DeserializeState(serialized);

        var actualOutput = net2.Predict(testInput);
        Assert.Equal(expectedOutput[0], actualOutput[0], 10);
    }

    [Fact]
    public void DeserializeState_RejectsTopologyMismatch()
    {
        var net1 = new FeedForwardNetwork([2, 3, 1]);
        byte[] serialized = net1.SerializeState();

        var net2 = new FeedForwardNetwork([2, 4, 1]); // Different hidden size
        Assert.Throws<InvalidOperationException>(() => net2.DeserializeState(serialized));
    }
}
