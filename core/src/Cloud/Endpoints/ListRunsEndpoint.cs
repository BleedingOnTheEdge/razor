// -----------------------------------------------------------------------------
// <copyright file="ListRunsEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for listing flow runs for an instance.
/// </summary>
internal sealed class ListRunsRequest
{
    /// <summary>Gets or sets the instance identifier.</summary>
    public Guid InstanceId { get; set; }
}

/// <summary>
/// Lists all flow runs executed by an Engine instance (003-040).
/// </summary>
internal sealed class ListRunsEndpoint(LineageService lineageService)
    : Endpoint<ListRunsRequest, IReadOnlyList<FlowRunView>>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/instances/{instanceId}/runs");
        Summary(summary =>
        {
            summary.Summary = "List flow runs for an instance";
            summary.Description = "Returns all flow runs associated with the specified instance ordered by creation date.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ListRunsRequest request, CancellationToken cancellationToken)
    {
        IReadOnlyList<FlowRun> runs = await lineageService
            .GetRunsForInstanceAsync(request.InstanceId, cancellationToken)
            .ConfigureAwait(false);

        List<FlowRunView> views = [.. runs.Select(FlowRunView.FromEntity)];
        await Send.OkAsync(views, cancellationToken).ConfigureAwait(false);
    }
}
