// -----------------------------------------------------------------------------
// <copyright file="ExportRunReportXlsxEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;
using Microsoft.AspNetCore.Http;

/// <summary>
/// Request for exporting a flow run's granular data to Excel (.xlsx).
/// </summary>
internal sealed class ExportRunReportXlsxRequest
{
    /// <summary>Gets or sets the run or report identifier.</summary>
    public Guid Id { get; set; }
}

/// <summary>
/// Generates and downloads a formulated, granular Excel spreadsheet (.xlsx) for a flow run.
/// </summary>
internal sealed class ExportRunReportXlsxEndpoint(
    LineageService lineageService,
    RunReportService reportService)
    : Endpoint<ExportRunReportXlsxRequest>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/reports/{id}/export/xlsx", "/api/runs/{id}/export/xlsx", "/api/lineage/runs/{id}/export/xlsx");
        Summary(s =>
        {
            s.Summary = "Export flow run report to XLSX";
            s.Description = "Generates a multi-sheet, formulated Excel workbook containing performance metrics, trade ledger, equity curve, and GA generations.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ExportRunReportXlsxRequest req, CancellationToken ct)
    {
        FlowRun? run = await lineageService.GetRunAsync(req.Id, ct).ConfigureAwait(false);
        if (run is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        RunReport report = reportService.GenerateReport(run);
        byte[] bytes = FlowRunExcelExportService.GenerateExcelWorkbook(report);

        string filename = $"flowrun-{run.Id:N}-report.xlsx";
        await Send.BytesAsync(
            bytes,
            fileName: filename,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            cancellation: ct).ConfigureAwait(false);
    }
}
