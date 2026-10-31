using Sdk.Slots.NeuralNetwork;
using System.Text.Json;

namespace Kernel.NeuralNetworks;

/// <summary>
/// Neural network runtime adapter representing an ONNX model graph or linear inference projection.
/// Implements <see cref="INeuralNetworkModel"/> for seamless integration with the GA optimizer.
/// </summary>
public sealed class OnnxNeuralNetworkAdapter : INeuralNetworkModel
{
    private readonly int _inputSize;
    private readonly int _outputSize;
    private readonly double[] _parameters;
    private double[]? _lastInput;

    /// <summary>
    /// Initializes a new instance of the <see cref="OnnxNeuralNetworkAdapter"/> class.
    /// </summary>
    /// <param name="inputSize">Number of input features.</param>
    /// <param name="outputSize">Number of output decisions/actions.</param>
    public OnnxNeuralNetworkAdapter(int inputSize, int outputSize)
    {
        if (inputSize <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(inputSize), "Input size must be positive.");
        }

        if (outputSize <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(outputSize), "Output size must be positive.");
        }

        _inputSize = inputSize;
        _outputSize = outputSize;
        // Total parameters: weights (input * output) + biases (output)
        _parameters = new double[(inputSize * outputSize) + outputSize];
    }

    /// <inheritdoc/>
    public string ModelType => "ONNX";

    /// <inheritdoc/>
    public int InputSize => _inputSize;

    /// <inheritdoc/>
    public int OutputSize => _outputSize;

    /// <inheritdoc/>
    public int ParameterCount => _parameters.Length;

    /// <inheritdoc/>
    public double[] Predict(double[] inputs)
    {
        ArgumentNullException.ThrowIfNull(inputs);
        if (inputs.Length != _inputSize)
        {
            throw new ArgumentException($"Expected {_inputSize} inputs, got {inputs.Length}.", nameof(inputs));
        }

        _lastInput = (double[])inputs.Clone();

        double[] outputs = new double[_outputSize];
        int weightOffset = 0;

        for (int o = 0; o < _outputSize; o++)
        {
            double sum = 0.0;
            for (int i = 0; i < _inputSize; i++)
            {
                sum += inputs[i] * _parameters[weightOffset++];
            }

            // Bias offset starts after all weights
            int biasOffset = (_inputSize * _outputSize) + o;
            sum += _parameters[biasOffset];

            // Tanh activation to bounded [-1, 1] domain
            outputs[o] = Math.Tanh(sum);
        }

        return outputs;
    }

    /// <inheritdoc/>
    public void LoadParameters(double[] genes)
    {
        ArgumentNullException.ThrowIfNull(genes);
        if (genes.Length != _parameters.Length)
        {
            throw new ArgumentException($"Expected {_parameters.Length} parameters, got {genes.Length}.", nameof(genes));
        }

        Array.Copy(genes, _parameters, _parameters.Length);
    }

    /// <inheritdoc/>
    public double[] ExportParameters() => (double[])_parameters.Clone();

    /// <inheritdoc/>
    public void Reset()
    {
        _lastInput = null;
    }

    /// <inheritdoc/>
    public byte[] SerializeState()
    {
        var snapshot = new OnnxStateSnapshot(_inputSize, _outputSize, _parameters);
        return JsonSerializer.SerializeToUtf8Bytes(snapshot);
    }

    /// <inheritdoc/>
    public void DeserializeState(byte[] state)
    {
        ArgumentNullException.ThrowIfNull(state);
        var snapshot = JsonSerializer.Deserialize<OnnxStateSnapshot>(state)
            ?? throw new InvalidOperationException("Failed to deserialize ONNX model snapshot.");

        if (snapshot.InputSize != _inputSize || snapshot.OutputSize != _outputSize)
        {
            throw new InvalidOperationException("Snapshot topology does not match adapter topology.");
        }

        if (snapshot.Parameters != null && snapshot.Parameters.Length == _parameters.Length)
        {
            Array.Copy(snapshot.Parameters, _parameters, _parameters.Length);
        }
    }

    private sealed record OnnxStateSnapshot(int InputSize, int OutputSize, double[] Parameters);
}
