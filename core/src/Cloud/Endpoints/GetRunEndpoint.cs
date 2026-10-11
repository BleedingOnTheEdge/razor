// -----------------------------------------------------------------------------
// <copyright file="GetRunEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for retrieving a flow run.
/// </summary>
internal sealed class GetRunRequest
{
    /// <summary>Gets or sets the flow run identifier.</summary>
    public Guid RunId { get; set; }
}

/// <summary>
/// Retrieves a flow run with its provenance and status (003-040).
/// </summary>
internal sealed class GetRunEndpoint(LineageService lineageService)
    : Endpoint<GetRunRequest, FlowRunView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/runs/{runId}");
        Summary(summary =>
        {
            summary.Summary = "Get a flow run";
            summary.Description = "Returns the execution details, lineage metadata, and performance metrics for a flow run.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetRunRequest request, CancellationToken cancellationToken)
    {
        FlowRun? run = await lineageService
            .GetRunAsync(request.RunId, cancellationToken)
            .ConfigureAwait(false);

        if (run is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(FlowRunView.FromEntity(run), cancellationToken).ConfigureAwait(false);
    }
}
