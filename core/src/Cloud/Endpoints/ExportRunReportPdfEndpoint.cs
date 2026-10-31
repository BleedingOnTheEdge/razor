// -----------------------------------------------------------------------------
// <copyright file="ExportRunReportPdfEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using FastEndpoints;
using Microsoft.AspNetCore.Http;

/// <summary>
/// Request for exporting a flow run's granular report to PDF.
/// </summary>
internal sealed class ExportRunReportPdfRequest
{
    /// <summary>Gets or sets the run or report identifier.</summary>
    public Guid Id { get; set; }
}

/// <summary>
/// PDF report export endpoint with roadmap disclaimer (scheduled for Razor v1.5).
/// </summary>
internal sealed class ExportRunReportPdfEndpoint : Endpoint<ExportRunReportPdfRequest>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/reports/{id}/export/pdf", "/api/runs/{id}/export/pdf", "/api/lineage/runs/{id}/export/pdf");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Export flow run report to PDF (Roadmap v1.5)";
            s.Description = "PDF report generation is scheduled for Razor v1.5. Granular reports are available via JSON and XLSX.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ExportRunReportPdfRequest req, CancellationToken ct)
    {
        HttpContext.Response.StatusCode = StatusCodes.Status501NotImplemented;
        await Send.StringAsync(
            "PDF report export is scheduled for Razor v1.5. Please use XLSX (/api/runs/{id}/export/xlsx) or JSON (/api/runs/{id}/report).",
            statusCode: StatusCodes.Status501NotImplemented,
            contentType: "text/plain",
            cancellation: ct).ConfigureAwait(false);
    }
}
