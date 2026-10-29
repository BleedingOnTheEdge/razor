// -----------------------------------------------------------------------------
// <copyright file="CompleteRunEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for completing a run and recording metrics.
/// </summary>
internal sealed class CompleteRunRequest
{
    /// <summary>Gets or sets the flow run identifier.</summary>
    public Guid RunId { get; set; }

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

    /// <summary>Gets or sets the winning DNA configuration JSON, if present.</summary>
    public string? WinningDnaJson { get; set; }

    /// <summary>Gets or sets the execution result payload JSON (e.g. trades, equity curve), if present.</summary>
    public string? ResultPayloadJson { get; set; }
}

/// <summary>
/// Completes an active flow run and records its final performance metrics (003-040).
/// </summary>
internal sealed class CompleteRunEndpoint(FlowOrchestrator orchestrator)
    : Endpoint<CompleteRunRequest, FlowRunView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/runs/{runId}/complete");
        Summary(summary =>
        {
            summary.Summary = "Complete a flow run";
            summary.Description = "Transitions a run to Completed state and stores aggregate performance metrics.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CompleteRunRequest request, CancellationToken cancellationToken)
    {
        var metrics = new ReportAggregateMetrics(
            NetProfit: request.NetProfit,
            TotalReturn: request.TotalReturn,
            SharpeRatio: request.SharpeRatio,
            MaxDrawdown: request.MaxDrawdown,
            TradeCount: request.TradeCount,
            BestFitness: request.BestFitness);

        try
        {
            FlowRun run = await orchestrator
                .CompleteRunAsync(
                    request.RunId,
                    metrics,
                    request.WinningDnaJson,
                    request.ResultPayloadJson,
                    cancellationToken)
                .ConfigureAwait(false);

            await Send.OkAsync(FlowRunView.FromEntity(run), cancellationToken).ConfigureAwait(false);
        }
        catch (KeyNotFoundException)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
        }
    }
}
