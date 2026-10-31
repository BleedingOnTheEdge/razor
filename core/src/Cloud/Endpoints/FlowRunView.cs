// -----------------------------------------------------------------------------
// <copyright file="FlowRunView.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;

/// <summary>
/// API view representation of a flow run.
/// </summary>
internal sealed class FlowRunView
{
    /// <summary>Gets or sets the run identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the target Engine instance identifier.</summary>
    public Guid EngineInstanceId { get; set; }

    /// <summary>Gets or sets the target Engine instance display name.</summary>
    public string? EngineInstanceName { get; set; }

    /// <summary>Gets or sets the flow kind.</summary>
    public RunKind Kind { get; set; }

    /// <summary>Gets or sets the current run status.</summary>
    public RunStatus Status { get; set; }

    /// <summary>Gets or sets the parent run identifier when derived.</summary>
    public Guid? ParentRunId { get; set; }

    /// <summary>Gets or sets the relationship along the lineage axis.</summary>
    public RunRelation? Relation { get; set; }

    /// <summary>Gets or sets the continuity along the execution timeline.</summary>
    public RunContinuity? Continuity { get; set; }

    /// <summary>Gets or sets the step, generation, or window where the run forked.</summary>
    public ForkPoint? ForkPoint { get; set; }

    /// <summary>Gets or sets the base seed.</summary>
    public long? BaseSeed { get; set; }

    /// <summary>Gets or sets the random sequence position.</summary>
    public string? RandomPosition { get; set; }

    /// <summary>Gets or sets a value indicating whether the run contains gaps or partial data.</summary>
    public bool IsPartial { get; set; }

    /// <summary>Gets or sets when the run was created.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets or sets when the run completed.</summary>
    public DateTimeOffset? CompletedAt { get; set; }

    /// <summary>Gets or sets the net profit.</summary>
    public decimal? NetProfit { get; set; }

    /// <summary>Gets or sets the total return percentage.</summary>
    public decimal? TotalReturn { get; set; }

    /// <summary>Gets or sets the Sharpe ratio.</summary>
    public double? SharpeRatio { get; set; }

    /// <summary>Gets or sets the maximum drawdown percentage.</summary>
    public double? MaxDrawdown { get; set; }

    /// <summary>Gets or sets the executed trade count.</summary>
    public int? TradeCount { get; set; }

    /// <summary>Gets or sets the best fitness score.</summary>
    public double? BestFitness { get; set; }

    /// <summary>Gets or sets the nested metrics payload for frontend contract compatibility.</summary>
    public RunMetricsView? Metrics { get; set; }

    /// <summary>Gets or sets the execution parameters, slot configurations, and hook specifications.</summary>
    public string? ConfigurationJson { get; set; }

    /// <summary>Gets or sets the winning DNA configuration JSON from an optimization run.</summary>
    public string? WinningDnaJson { get; set; }

    /// <summary>Gets or sets the deserialized winning DNA payload.</summary>
    public object? WinningDna { get; set; }

    /// <summary>Gets or sets the detailed execution result payload JSON (trades, equity curve, granular metrics).</summary>
    public string? ResultPayloadJson { get; set; }

    /// <summary>
    /// Creates a view model from a <see cref="FlowRun"/> entity.
    /// </summary>
    /// <param name="run">The flow run entity.</param>
    /// <returns>The view model.</returns>
    public static FlowRunView FromEntity(FlowRun run)
    {
        ArgumentNullException.ThrowIfNull(run);

        var forkPoint = (run.ForkPointStep.HasValue || run.ForkPointGeneration.HasValue || run.ForkPointWindowIndex.HasValue)
            ? new ForkPoint(run.ForkPointStep, run.ForkPointGeneration, run.ForkPointWindowIndex)
            : null;

        var metrics = (run.NetProfit.HasValue || run.TotalReturn.HasValue || run.SharpeRatio.HasValue || run.MaxDrawdown.HasValue || run.TradeCount.HasValue || run.BestFitness.HasValue)
            ? new RunMetricsView
            {
                NetProfit = run.NetProfit,
                TotalReturn = run.TotalReturn,
                SharpeRatio = run.SharpeRatio,
                MaxDrawdown = run.MaxDrawdown,
                TradeCount = run.TradeCount,
                BestFitness = run.BestFitness
            }
            : null;

        object? winningDna = null;
        if (!string.IsNullOrWhiteSpace(run.WinningDnaJson))
        {
            try
            {
                winningDna = System.Text.Json.JsonSerializer.Deserialize<object>(run.WinningDnaJson);
            }
            catch (System.Text.Json.JsonException)
            {
            }
        }

        return new FlowRunView
        {
            Id = run.Id,
            EngineInstanceId = run.EngineInstanceId,
            EngineInstanceName = run.EngineInstance?.Name,
            Kind = run.Kind,
            Status = run.Status,
            ParentRunId = run.ParentRunId,
            Relation = run.Relation,
            Continuity = run.Continuity,
            ForkPoint = forkPoint,
            BaseSeed = run.BaseSeed,
            RandomPosition = run.RandomPosition,
            IsPartial = run.IsPartial,
            CreatedAt = run.CreatedAt,
            CompletedAt = run.CompletedAt,
            NetProfit = run.NetProfit,
            TotalReturn = run.TotalReturn,
            SharpeRatio = run.SharpeRatio,
            MaxDrawdown = run.MaxDrawdown,
            TradeCount = run.TradeCount,
            BestFitness = run.BestFitness,
            Metrics = metrics,
            ConfigurationJson = run.ConfigurationJson,
            WinningDnaJson = run.WinningDnaJson,
            WinningDna = winningDna,
            ResultPayloadJson = run.ResultPayloadJson
        };
    }
}

/// <summary>
/// Nested metrics payload view for frontend contract compatibility.
/// </summary>
internal sealed class RunMetricsView
{
    /// <summary>Gets or sets the net profit.</summary>
    public decimal? NetProfit { get; set; }

    /// <summary>Gets or sets the total return percentage.</summary>
    public decimal? TotalReturn { get; set; }

    /// <summary>Gets or sets the Sharpe ratio.</summary>
    public double? SharpeRatio { get; set; }

    /// <summary>Gets or sets the maximum drawdown percentage.</summary>
    public double? MaxDrawdown { get; set; }

    /// <summary>Gets or sets the executed trade count.</summary>
    public int? TradeCount { get; set; }

    /// <summary>Gets or sets the best fitness score.</summary>
    public double? BestFitness { get; set; }
}
