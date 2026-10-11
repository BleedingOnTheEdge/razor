// -----------------------------------------------------------------------------
// <copyright file="GetRunRankingEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for ranking flow runs of an instance.
/// </summary>
internal sealed class GetRunRankingRequest
{
    /// <summary>Gets or sets the target instance identifier.</summary>
    public Guid InstanceId { get; set; }

    /// <summary>Gets or sets the metric to rank by. Defaults to NetProfit.</summary>
    public RankingMetric Metric { get; set; } = RankingMetric.NetProfit;

    /// <summary>Gets or sets a value indicating whether diverged/gapped runs are included.</summary>
    public bool IncludeDiverged { get; set; }
}

/// <summary>
/// Ranks flow runs for an Engine instance according to a selected metric, enforcing divergence flagging (003-040).
/// </summary>
internal sealed class GetRunRankingEndpoint(
    LineageService lineageService,
    RunRankingService rankingService)
    : Endpoint<GetRunRankingRequest, IReadOnlyList<RankedRunResult>>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/instances/{instanceId}/runs/ranking");
        Summary(summary =>
        {
            summary.Summary = "Rank flow runs for an instance";
            summary.Description = "Returns performance-ranked flow runs with explicit divergence and comparability flagging.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetRunRankingRequest request, CancellationToken cancellationToken)
    {
        IReadOnlyList<FlowRun> runs = await lineageService
            .GetRunsForInstanceAsync(request.InstanceId, cancellationToken)
            .ConfigureAwait(false);

        IReadOnlyList<RankedRunResult> results = rankingService.RankRuns(
            runs,
            request.Metric,
            request.IncludeDiverged);

        await Send.OkAsync(results, cancellationToken).ConfigureAwait(false);
    }
}
