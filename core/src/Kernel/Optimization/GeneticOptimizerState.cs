namespace Kernel.Optimization;

/// <summary>Immutable snapshot of the optimiser state for pause/resume.</summary>
public sealed record GeneticOptimizerState
{
    /// <summary>Population snapshot (deep copy).</summary>
    public required Chromosome[] Population { get; init; }

    /// <summary>Current generation index.</summary>
    public int CurrentGeneration { get; init; }

    /// <summary>Whether the current population has been evaluated.</summary>
    public bool Evaluated { get; init; }

    /// <summary>Best fitness observed across all generations.</summary>
    public double BestOverallFitness { get; init; } = Chromosome.NotEvaluated;

    /// <summary>Consecutive generations without improvement.</summary>
    public int StagnationCount { get; init; }

    /// <summary>Whether hyper‑mutation is active.</summary>
    public bool HyperMutation { get; init; }

    /// <summary>
    /// Position of the optimiser's random sequence at the time of the snapshot.
    /// </summary>
    /// <remarks>
    /// Carried so that a resumed run continues the <em>same</em> sequence rather than restarting
    /// it. The master seed records where the sequence began, not how far it has been consumed, so
    /// without this a restored optimiser diverges from the run it was meant to continue -- at the
    /// first draw, and therefore in every generation after. <c>null</c> for a snapshot written
    /// before this was recorded; the generator then keeps its constructor-seeded position.
    /// </remarks>
    public ulong? RandomState0 { get; init; }

    /// <inheritdoc cref="RandomState0"/>
    public ulong? RandomState1 { get; init; }

    /// <summary>
    /// Serialised state of the active neural network model, if any.
    /// <c>null</c> if no neural network is in use or if serialisation is not supported.
    /// </summary>
    public byte[]? NeuralNetworkState { get; init; }
}
