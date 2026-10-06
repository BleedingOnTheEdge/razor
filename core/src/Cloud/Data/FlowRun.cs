// -----------------------------------------------------------------------------
// <copyright file="FlowRun.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// A persistent record of a Cloud-orchestrated flow execution, carrying complete lineage,
/// provenance, interventions, and metrics (002-030-160, 003-040).
/// </summary>
internal sealed class FlowRun
{
    /// <summary>Gets or sets the primary key identifying this flow run.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the identifier of the Engine instance that executed this run.</summary>
    public Guid EngineInstanceId { get; set; }

    /// <summary>Gets or sets the associated Engine instance.</summary>
    public EngineInstance? EngineInstance { get; set; }

    /// <summary>Gets or sets the kind of flow execution.</summary>
    public RunKind Kind { get; set; }

    /// <summary>Gets or sets the lifecycle status of this run.</summary>
    public RunStatus Status { get; set; }

    /// <summary>
    /// Gets or sets the parent run identifier if this run is derived from another;
    /// otherwise <see langword="null"/> for an original run.
    /// </summary>
    public Guid? ParentRunId { get; set; }

    /// <summary>Gets or sets the parent flow run navigation property.</summary>
    public FlowRun? ParentRun { get; set; }

    /// <summary>Gets or sets the collection of child flow runs derived from this run.</summary>
    public ICollection<FlowRun> ChildRuns { get; set; } = [];

    /// <summary>
    /// Gets or sets the relation axis specifying how this child relates to its parent;
    /// <see langword="null"/> for an original run.
    /// </summary>
    public RunRelation? Relation { get; set; }

    /// <summary>
    /// Gets or sets the continuity axis specifying whether the timeline has gaps;
    /// <see langword="null"/> for an original run.
    /// </summary>
    public RunContinuity? Continuity { get; set; }

    /// <summary>Gets or sets the step index at which this run diverged from its parent.</summary>
    public int? ForkPointStep { get; set; }

    /// <summary>Gets or sets the generation index at which this run diverged from its parent.</summary>
    public int? ForkPointGeneration { get; set; }

    /// <summary>Gets or sets the walk-forward window index at which this run diverged from its parent.</summary>
    public int? ForkPointWindowIndex { get; set; }

    /// <summary>Gets or sets the base master seed at the fork point.</summary>
    public long? BaseSeed { get; set; }

    /// <summary>Gets or sets the serialized random-sequence position at the fork point.</summary>
    public string? RandomPosition { get; set; }

    /// <summary>Gets or sets the append-only log of interventions applied to this run.</summary>
    public ICollection<RunIntervention> Interventions { get; set; } = [];

    /// <summary>Gets or sets the recorded gaps in coverage or execution.</summary>
    public ICollection<RunGap> Gaps { get; set; } = [];

    /// <summary>Gets or sets the net profit metric, if computed.</summary>
    public decimal? NetProfit { get; set; }

    /// <summary>Gets or sets the total percentage return, if computed.</summary>
    public decimal? TotalReturn { get; set; }

    /// <summary>Gets or sets the annualized Sharpe ratio, if computed.</summary>
    public double? SharpeRatio { get; set; }

    /// <summary>Gets or sets the maximum percentage drawdown, if computed.</summary>
    public double? MaxDrawdown { get; set; }

    /// <summary>Gets or sets the total number of executed trades, if computed.</summary>
    public int? TradeCount { get; set; }

    /// <summary>Gets or sets the best fitness score achieved during an optimization run.</summary>
    public double? BestFitness { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether aggregates over this run are partial due to known gaps.
    /// </summary>
    public bool IsPartial { get; set; }

    /// <summary>Gets or sets the creation timestamp of this run.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets or sets the completion timestamp of this run, if finished.</summary>
    public DateTimeOffset? CompletedAt { get; set; }
}
