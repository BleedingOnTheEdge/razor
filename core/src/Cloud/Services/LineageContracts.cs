// -----------------------------------------------------------------------------
// <copyright file="LineageContracts.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;

/// <summary>
/// Identifies where a child run diverged from its parent (003-040).
/// </summary>
/// <param name="Step">The step index at which the divergence occurred, if applicable.</param>
/// <param name="Generation">The generation index at which the divergence occurred, if applicable.</param>
/// <param name="WindowIndex">The walk-forward analysis window index, if applicable.</param>
internal sealed record ForkPoint(int? Step = null, int? Generation = null, int? WindowIndex = null);

/// <summary>
/// Specifications for an intervention applied to a flow run (003-040).
/// </summary>
/// <param name="StepIndex">The step or generation index affected.</param>
/// <param name="PreviousFingerprint">The fingerprint prior to the intervention.</param>
/// <param name="NewFingerprint">The fingerprint following the intervention.</param>
/// <param name="Actor">The actor or system initiating the intervention.</param>
/// <param name="Reason">The mandatory business rationale explaining why the intervention occurred.</param>
/// <param name="ModificationsSummary">Optional human-readable summary of what changed.</param>
/// <param name="BeforePayloadJson">Optional serialized payload before modification.</param>
/// <param name="AfterPayloadJson">Optional serialized payload after modification.</param>
internal sealed record InterventionSpecification(
    int StepIndex,
    string PreviousFingerprint,
    string NewFingerprint,
    string Actor,
    string Reason,
    string? ModificationsSummary = null,
    string? BeforePayloadJson = null,
    string? AfterPayloadJson = null);

/// <summary>
/// Specifications for a recorded coverage or execution gap (003-040).
/// </summary>
/// <param name="StartStep">The beginning step or index of the gap.</param>
/// <param name="EndStep">The ending step or index of the gap.</param>
/// <param name="Reason">The mandatory reason explaining the gap.</param>
internal sealed record GapSpecification(int StartStep, int EndStep, string Reason);

/// <summary>
/// Input parameters required to replay a diverged run from its recorded base (003-040).
/// </summary>
/// <param name="BaseRunId">The identifier of the original or parent run from which divergence occurred.</param>
/// <param name="ForkPoint">The point where the run diverged.</param>
/// <param name="Interventions">The ordered sequence of recorded interventions.</param>
/// <param name="ChildSeed">The child seed applied at the fork point, if any.</param>
/// <param name="RandomPosition">The random sequence position restored at the fork point.</param>
internal sealed record ReplaySpecification(
    Guid BaseRunId,
    ForkPoint ForkPoint,
    IReadOnlyList<InterventionSpecification> Interventions,
    long? ChildSeed,
    string? RandomPosition);

/// <summary>
/// Itemized details of a known gap included in a report.
/// </summary>
/// <param name="StartStep">The start step of the gap.</param>
/// <param name="EndStep">The end step of the gap.</param>
/// <param name="Reason">The reason for the gap.</param>
internal sealed record ReportGapDetail(int StartStep, int EndStep, string Reason);

/// <summary>
/// Aggregate performance metrics included in a run report.
/// </summary>
/// <param name="NetProfit">The net profit.</param>
/// <param name="TotalReturn">The total return percentage.</param>
/// <param name="SharpeRatio">The Sharpe ratio.</param>
/// <param name="MaxDrawdown">The maximum drawdown percentage.</param>
/// <param name="TradeCount">The number of executed trades.</param>
/// <param name="BestFitness">The best fitness score.</param>
internal sealed record ReportAggregateMetrics(
    decimal? NetProfit,
    decimal? TotalReturn,
    double? SharpeRatio,
    double? MaxDrawdown,
    int? TradeCount,
    double? BestFitness);

/// <summary>
/// An auditable user-facing report of a flow run conforming to reporting integrity rules (003-040).
/// </summary>
/// <param name="RunId">The identifier of the run.</param>
/// <param name="ParentRunId">The identifier of the parent run, if any.</param>
/// <param name="Relation">The relationship to the parent.</param>
/// <param name="Continuity">The continuity state of the run.</param>
/// <param name="IsPartial">Whether aggregates are marked partial due to gaps.</param>
/// <param name="HeadlineFiguresSuppressed">Whether headline figures are suppressed due to gaps.</param>
/// <param name="IsDiverged">Whether the run diverged from an original execution.</param>
/// <param name="IsComparable">Whether the run is comparable against clean runs in benchmarks.</param>
/// <param name="DivergenceFlag">The flag description when diverged or gapped.</param>
/// <param name="Gaps">The list of known gaps named in the report.</param>
/// <param name="Aggregates">The aggregate metrics, suppressed or marked partial if gapped.</param>
/// <param name="Interventions">The recorded intervention history.</param>
/// <param name="WarningMessage">Warning or notice regarding gaps or divergence.</param>
internal sealed record RunReport(
    Guid RunId,
    Guid? ParentRunId,
    RunRelation? Relation,
    RunContinuity? Continuity,
    bool IsPartial,
    bool HeadlineFiguresSuppressed,
    bool IsDiverged,
    bool IsComparable,
    string? DivergenceFlag,
    IReadOnlyList<ReportGapDetail> Gaps,
    ReportAggregateMetrics? Aggregates,
    IReadOnlyList<InterventionSpecification> Interventions,
    string? WarningMessage = null);

/// <summary>
/// Target metric for benchmarking and ranking runs.
/// </summary>
internal enum RankingMetric
{
    /// <summary>Rank by net profit.</summary>
    NetProfit,

    /// <summary>Rank by Sharpe ratio.</summary>
    SharpeRatio,

    /// <summary>Rank by best fitness.</summary>
    BestFitness,

    /// <summary>Rank by total percentage return.</summary>
    TotalReturn
}

/// <summary>
/// Represents a ranked run with explicit divergence flagging.
/// </summary>
/// <param name="RunId">The run identifier.</param>
/// <param name="Rank">The 1-based rank position.</param>
/// <param name="Score">The numerical score used for ranking.</param>
/// <param name="IsDiverged">Whether the run is diverged or gapped.</param>
/// <param name="DivergenceFlag">The explicit flag attached to the run.</param>
internal sealed record RankedRunResult(
    Guid RunId,
    int Rank,
    double Score,
    bool IsDiverged,
    string? DivergenceFlag);
