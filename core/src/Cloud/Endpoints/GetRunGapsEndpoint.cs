// -----------------------------------------------------------------------------
// <copyright file="GetRunGapsEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for a run's gap history.
/// </summary>
internal sealed class GetRunGapsRequest
{
    /// <summary>Gets or sets the run identifier.</summary>
    public Guid RunId { get; set; }
}

/// <summary>
/// Summary view of a recorded execution gap.
/// </summary>
internal sealed class GapView
{
    /// <summary>Gets or sets the gap record identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the flow run identifier.</summary>
    public Guid FlowRunId { get; set; }

    /// <summary>Gets or sets the beginning step index.</summary>
    public long StartStep { get; set; }

    /// <summary>Gets or sets the ending step index.</summary>
    public long EndStep { get; set; }

    /// <summary>Gets or sets the gap reason.</summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>Gets or sets when the gap was recorded.</summary>
    public DateTimeOffset RecordedAt { get; set; }
}

/// <summary>
/// Returns the recorded execution and coverage gaps for a flow run (003-040).
/// </summary>
internal sealed class GetRunGapsEndpoint(LineageService lineageService)
    : Endpoint<GetRunGapsRequest, IReadOnlyList<GapView>>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/runs/{runId}/gaps");
        Summary(summary =>
        {
            summary.Summary = "Get run gaps";
            summary.Description = "Returns the recorded data/execution gaps associated with a flow run.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetRunGapsRequest request, CancellationToken cancellationToken)
    {
        IReadOnlyList<RunGap> list = await lineageService
            .GetGapsAsync(request.RunId, cancellationToken)
            .ConfigureAwait(false);

        List<GapView> items = [.. list.Select(g => new GapView
        {
            Id = g.Id,
            FlowRunId = g.FlowRunId,
            StartStep = g.StartStep,
            EndStep = g.EndStep,
            Reason = g.Reason,
            RecordedAt = g.RecordedAt
        })];

        await Send.OkAsync(items, cancellationToken).ConfigureAwait(false);
    }
}
