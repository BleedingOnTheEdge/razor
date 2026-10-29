// -----------------------------------------------------------------------------
// <copyright file="ListReportsEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// Query parameters for listing flow run performance reports.
/// </summary>
internal sealed class ListReportsRequest
{
    /// <summary>Gets or sets the optional instance filter.</summary>
    public Guid? InstanceId { get; set; }

    /// <summary>Gets or sets the optional execution kind filter.</summary>
    public RunKind? Kind { get; set; }

    /// <summary>Gets or sets the optional run status filter.</summary>
    public RunStatus? Status { get; set; }

    /// <summary>Gets or sets the 1-based page number.</summary>
    public int? Page { get; set; }

    /// <summary>Gets or sets the page size.</summary>
    public int? PageSize { get; set; }
}

/// <summary>
/// Lists flow run auditable performance and provenance reports with server-side pagination and tenant filtering.
/// </summary>
internal sealed class ListReportsEndpoint(
    LineageService lineageService,
    RunReportService reportService)
    : Endpoint<ListReportsRequest, object>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/reports");
        Summary(summary =>
        {
            summary.Summary = "List flow run reports";
            summary.Description = "Returns performance and provenance reports for runs matching tenant and optional filters, with server-side pagination.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ListReportsRequest request, CancellationToken cancellationToken)
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

        List<RunReport> reports = [.. runs.Select(reportService.GenerateReport)];

        if (request.Page.HasValue || request.PageSize.HasValue)
        {
            var paged = PagedResult.Create(reports, request.Page, request.PageSize);
            await Send.OkAsync(paged, cancellationToken).ConfigureAwait(false);
        }
        else
        {
            await Send.OkAsync(reports, cancellationToken).ConfigureAwait(false);
        }
    }
}
