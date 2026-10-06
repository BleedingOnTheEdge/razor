// -----------------------------------------------------------------------------
// <copyright file="LineageEnums.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// How a child run relates to its parent run along the relation axis (003-040).
/// </summary>
internal enum RunRelation
{
    /// <summary>The child continues the parent without change; the parent's results stand.</summary>
    Appended,

    /// <summary>The child starts afresh from a point in the past; the parent is preserved in full.</summary>
    Branched,

    /// <summary>The child replaces the parent's suffix from the fork point; the timeline is the join of the two.</summary>
    Spliced
}

/// <summary>
/// Whether the resulting timeline of a child run has holes along the continuity axis (003-040).
/// </summary>
internal enum RunContinuity
{
    /// <summary>No gap: the child picks up where the parent was interrupted.</summary>
    Contiguous,

    /// <summary>A known period is not covered: the gap range and reason are recorded.</summary>
    Gapped
}

/// <summary>
/// The category of flow execution.
/// </summary>
internal enum RunKind
{
    /// <summary>A single backtest flow.</summary>
    Backtest,

    /// <summary>A genetic algorithm optimization flow.</summary>
    Optimization,

    /// <summary>A walk-forward analysis flow.</summary>
    WalkForward
}

/// <summary>
/// The execution lifecycle state of a flow run.
/// </summary>
internal enum RunStatus
{
    /// <summary>The run is created or queued and has not started.</summary>
    Pending,

    /// <summary>The run is actively executing on an Engine instance.</summary>
    Running,

    /// <summary>The run has been paused by an operator or orchestrator.</summary>
    Paused,

    /// <summary>The run completed all steps or generations successfully.</summary>
    Completed,

    /// <summary>The run encountered an unhandled fault during execution.</summary>
    Faulted,

    /// <summary>The run was explicitly cancelled.</summary>
    Cancelled
}
