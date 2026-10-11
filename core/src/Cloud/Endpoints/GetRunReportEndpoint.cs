// -----------------------------------------------------------------------------
// <copyright file="GetRunReportEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;
using Microsoft.AspNetCore.Http;

/// <summary>
/// The request for retrieving a flow run's auditable performance report.
/// </summary>
internal sealed class GetRunReportRequest
{
    /// <summary>Gets or sets the flow run identifier.</summary>
    public Guid RunId { get; set; }
}

/// <summary>
/// Generates and returns an auditable performance and provenance report for a flow run,
/// enforcing reporting integrity and comparability rules (003-040).
/// </summary>
internal sealed class GetRunReportEndpoint(
    LineageService lineageService,
    RunReportService reportService)
    : Endpoint<GetRunReportRequest, RunReport>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/runs/{runId}/report");
        Summary(summary =>
        {
            summary.Summary = "Get flow run report";
            summary.Description = "Returns the auditable report for a flow run, including aggregate metrics, gap details, and comparability flags.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetRunReportRequest request, CancellationToken cancellationToken)
    {
        FlowRun? run = await lineageService
            .GetRunAsync(request.RunId, cancellationToken)
            .ConfigureAwait(false);

        if (run is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        RunReport report = reportService.GenerateReport(run);
        await Send.OkAsync(report, cancellationToken).ConfigureAwait(false);
    }
}
