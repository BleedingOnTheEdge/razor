// -----------------------------------------------------------------------------
// <copyright file="GetRunLineageEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for a run's lineage tree.
/// </summary>
internal sealed class GetRunLineageRequest
{
    /// <summary>Gets or sets the run identifier.</summary>
    public Guid RunId { get; set; }
}

/// <summary>
/// Returns the complete lineage hierarchy tree rooted at or containing the specified run (003-040).
/// </summary>
internal sealed class GetRunLineageEndpoint(LineageService lineageService)
    : Endpoint<GetRunLineageRequest, LineageNode>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/runs/{runId}/lineage");
        Summary(summary =>
        {
            summary.Summary = "Get flow run lineage tree";
            summary.Description = "Returns the hierarchical provenance graph connecting parent runs, branches, splices, and children.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetRunLineageRequest request, CancellationToken cancellationToken)
    {
        LineageNode? node = await lineageService
            .GetLineageTreeAsync(request.RunId, cancellationToken)
            .ConfigureAwait(false);

        if (node is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(node, cancellationToken).ConfigureAwait(false);
    }
}
