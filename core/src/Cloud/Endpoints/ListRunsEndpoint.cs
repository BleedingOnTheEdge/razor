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
/// The request for listing flow runs for an instance or account.
/// </summary>
internal sealed class ListRunsRequest
{
    /// <summary>Gets or sets the optional instance identifier.</summary>
    public Guid? InstanceId { get; set; }

    /// <summary>Gets or sets the 1-based page number.</summary>
    public int? Page { get; set; }

    /// <summary>Gets or sets the page size.</summary>
    public int? PageSize { get; set; }

    /// <summary>Gets or sets the flow kind filter.</summary>
    public RunKind? Kind { get; set; }

    /// <summary>Gets or sets the run status filter.</summary>
    public RunStatus? Status { get; set; }
}

/// <summary>
/// Lists flow runs executed by an Engine instance or tenant account (003-040).
/// </summary>
internal sealed class ListRunsEndpoint(LineageService lineageService)
    : Endpoint<ListRunsRequest, object>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/instances/{instanceId}/runs", "/api/runs");
        Summary(summary =>
        {
            summary.Summary = "List flow runs";
            summary.Description = "Returns flow runs associated with an instance or account ordered by creation date with optional server-side pagination.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ListRunsRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        Guid? accountId = null;
        if (HttpContext.Request.Headers.TryGetValue("X-Account-Id", out var accVal) && Guid.TryParse(accVal, out var parsedAcc))
        {
            accountId = parsedAcc;
        }

        Guid? instanceId = request.InstanceId.HasValue && request.InstanceId.Value != Guid.Empty
            ? request.InstanceId.Value
            : null;

        IReadOnlyList<FlowRun> runs = await lineageService
            .GetRunsAsync(instanceId, accountId, request.Kind, request.Status, cancellationToken)
            .ConfigureAwait(false);

        List<FlowRunView> views = [.. runs.Select(FlowRunView.FromEntity)];

        if (request.Page.HasValue || request.PageSize.HasValue)
        {
            var paged = PagedResult.Create(views, request.Page, request.PageSize);
            await Send.OkAsync(paged, cancellationToken).ConfigureAwait(false);
        }
        else
        {
            await Send.OkAsync(views, cancellationToken).ConfigureAwait(false);
        }
    }
}
