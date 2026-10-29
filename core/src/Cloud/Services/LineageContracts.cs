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
/// Selected slot configurations for a candidate DNA.
/// </summary>
internal sealed record ReportDnaSlots(string Strategy, string Adapter, string? NeuralNetwork = null);

/// <summary>
/// Execution parameters for candidate DNA evaluation.
/// </summary>
internal sealed record ReportDnaExecution(
    IReadOnlyList<string> Symbols,
    IReadOnlyList<string> Timeframes,
    double InitialBalance,
    double Leverage,
    string AccountCurrency);

/// <summary>
/// A portable winning DNA representing an optimal chromosome and configuration candidate.
/// </summary>
internal sealed record ReportWinningDna(
    IReadOnlyList<double> Genes,
    IReadOnlyDictionary<string, object> Parameters,
    ReportDnaSlots Slots,
    ReportDnaExecution Execution,
    double Fitness,
    Guid? SourceRunId = null);

/// <summary>
/// Exhaustive institutional trading and risk metrics.
/// </summary>
internal sealed record ReportDetailedMetrics(
    decimal GrossProfit,
    decimal GrossLoss,
    double ProfitFactor,
    double WinRate,
    double LossRate,
    int WinningTrades,
    int LosingTrades,
    double SortinoRatio,
    double CalmarRatio,
    decimal Expectancy,
    decimal AverageWin,
    decimal AverageLoss,
    double WinLossRatio,
    decimal LargestWin,
    decimal LargestLoss,
    int MaxConsecutiveWins,
    int MaxConsecutiveLosses,
    double AverageHoldingPeriodSeconds,
    double MaxDrawdownPct,
    decimal MaxDrawdownAmount)
{
    /// <summary>Gets the payoff ratio alias (WinLossRatio) for client reporting compatibility.</summary>
    public double PayoffRatio => WinLossRatio;
}

/// <summary>
/// An executed trade fill record.
/// </summary>
internal sealed record ReportTradeItem(
    long Ticket,
    string Symbol,
    string Side,
    double Volume,
    double OpenPrice,
    string OpenTime,
    double ClosePrice,
    string CloseTime,
    decimal Profit,
    double ReturnPct,
    decimal Commission,
    decimal Swap,
    double StopLoss,
    double TakeProfit,
    string ExitReason);

/// <summary>
/// A time-series point on the balance and equity curve.
/// </summary>
internal sealed record ReportEquityPoint(
    string Timestamp,
    decimal Balance,
    decimal Equity,
    double DrawdownPct);

/// <summary>
/// Detailed evaluation report of an individual within an optimization population generation.
/// </summary>
internal sealed record ReportPopulationIndividual(
    string Id,
    int IndividualIndex,
    double Fitness,
    double Diversity,
    IReadOnlyList<double> Genes,
    IReadOnlyDictionary<string, object> Parameters,
    double TotalReturn,
    double SharpeRatio,
    double MaxDrawdown,
    double WinRate,
    double ProfitFactor,
    int TradeCount,
    IReadOnlyList<ReportTradeItem>? Trades = null,
    IReadOnlyList<ReportEquityPoint>? EquityCurve = null);

/// <summary>
/// Progression status for one generation of genetic optimization.
/// </summary>
internal sealed record ReportGenerationProgress(
    int Generation,
    double BestFitness,
    double AverageFitness,
    double Diversity,
    bool IsHyperMutation,
    IReadOnlyList<ReportPopulationIndividual>? Populations = null)
{
    /// <summary>Gets the population diversity alias for client reporting compatibility.</summary>
    public double PopulationDiversity => Diversity;
}

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
/// <param name="EngineInstanceId">The target Engine instance identifier.</param>
/// <param name="Kind">The flow kind.</param>
/// <param name="Status">The run status.</param>
/// <param name="BaseSeed">The base deterministic seed.</param>
/// <param name="CreatedAt">When the run was created.</param>
/// <param name="CompletedAt">When the run completed, if applicable.</param>
/// <param name="ConfigurationJson">The execution specifications and parameters.</param>
/// <param name="WinningDnaJson">The raw serialized winning DNA JSON.</param>
/// <param name="WinningDna">The structured winning DNA candidate.</param>
/// <param name="DetailedMetrics">Exhaustive institutional metrics.</param>
/// <param name="Trades">Itemized execution trade fills.</param>
/// <param name="EquityCurve">Sampled equity and balance time-series curve.</param>
/// <param name="GenerationProgress">Generation-by-generation evolution metrics.</param>
internal sealed record RunReport(
    Guid RunId,
    Guid EngineInstanceId,
    RunKind Kind,
    RunStatus Status,
    Guid? ParentRunId,
    RunRelation? Relation,
    RunContinuity? Continuity,
    long? BaseSeed,
    DateTimeOffset CreatedAt,
    DateTimeOffset? CompletedAt,
    bool IsPartial,
    bool HeadlineFiguresSuppressed,
    bool IsDiverged,
    bool IsComparable,
    string? DivergenceFlag,
    IReadOnlyList<ReportGapDetail> Gaps,
    ReportAggregateMetrics? Aggregates,
    IReadOnlyList<InterventionSpecification> Interventions,
    string? WarningMessage = null,
    string? ConfigurationJson = null,
    string? WinningDnaJson = null,
    ReportWinningDna? WinningDna = null,
    ReportDetailedMetrics? DetailedMetrics = null,
    IReadOnlyList<ReportTradeItem>? Trades = null,
    IReadOnlyList<ReportEquityPoint>? EquityCurve = null,
    IReadOnlyList<ReportGenerationProgress>? GenerationProgress = null);

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

/// <summary>
/// A node in the hierarchical lineage graph.
/// </summary>
/// <param name="RunId">The run identifier.</param>
/// <param name="ParentRunId">The parent run identifier, if any.</param>
/// <param name="Kind">The run kind.</param>
/// <param name="Status">The run status.</param>
/// <param name="Relation">The relationship to the parent.</param>
/// <param name="Continuity">The continuity state.</param>
/// <param name="ForkPoint">Where divergence occurred.</param>
/// <param name="BaseSeed">The base seed at the fork point.</param>
/// <param name="RandomPosition">The random sequence position.</param>
/// <param name="IsPartial">Whether the run contains gaps.</param>
/// <param name="Interventions">The recorded intervention history.</param>
/// <param name="Gaps">The recorded gaps.</param>
/// <param name="Children">The child runs derived from this run.</param>
internal sealed record LineageNode(
    Guid RunId,
    Guid? ParentRunId,
    RunKind Kind,
    RunStatus Status,
    RunRelation? Relation,
    RunContinuity? Continuity,
    ForkPoint? ForkPoint,
    long? BaseSeed,
    string? RandomPosition,
    bool IsPartial,
    IReadOnlyList<InterventionSpecification> Interventions,
    IReadOnlyList<ReportGapDetail> Gaps,
    IReadOnlyList<LineageNode> Children);
