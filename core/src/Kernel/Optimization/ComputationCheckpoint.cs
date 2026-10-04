// -----------------------------------------------------------------------------
// <copyright file="ComputationCheckpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.Optimization;

using System;
using System.Collections.Generic;

/// <summary>
/// Immutable checkpoint record for an optimization computation step.
/// </summary>
public sealed record ComputationCheckpoint
{
    /// <summary>Gets the unique computation/task identifier.</summary>
    public required string ComputationId { get; init; }

    /// <summary>Gets the 0-based generation or step index.</summary>
    public required int StepIndex { get; init; }

    /// <summary>Gets the deterministic cryptographic fingerprint of this step's state.</summary>
    public required string Fingerprint { get; init; }

    /// <summary>Gets the fingerprint of the preceding step, or <see langword="null"/> for the initial state.</summary>
    public string? ParentFingerprint { get; init; }

    /// <summary>Gets the snapshot of the genetic optimizer state.</summary>
    public required GeneticOptimizerState State { get; init; }

    /// <summary>Gets whether this computation has diverged from pure algorithmic determinism through human or external intervention.</summary>
    public bool Diverged { get; init; }

    /// <summary>Gets the chronological record of external interventions applied to this computation.</summary>
    public IReadOnlyList<InterventionRecord> Interventions { get; init; } = Array.Empty<InterventionRecord>();
}

/// <summary>
/// Immutable audit record of an external intervention applied to a computation.
/// </summary>
public sealed record InterventionRecord
{
    /// <summary>Gets the generation or step index at which the intervention took place.</summary>
    public required int StepIndex { get; init; }

    /// <summary>Gets the fingerprint prior to the intervention.</summary>
    public string? PreviousFingerprint { get; init; }

    /// <summary>Gets the new fingerprint resulting from the intervention.</summary>
    public required string NewFingerprint { get; init; }

    /// <summary>Gets the actor (user, system, or service) that initiated the intervention.</summary>
    public required string Actor { get; init; }

    /// <summary>Gets the UTC timestamp when the intervention was recorded.</summary>
    public required DateTime TimestampUtc { get; init; }

    /// <summary>Gets the compulsory business rationale explaining why the intervention occurred.</summary>
    public required string Reason { get; init; }
}
