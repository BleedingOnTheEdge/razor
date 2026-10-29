// -----------------------------------------------------------------------------
// <copyright file="GenerationEndpoints.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// Request for listing generations for a run report.
/// </summary>
internal sealed class ListGenerationsRequest
{
    /// <summary>Gets or sets the run report identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the 1-based page number.</summary>
    public int? Page { get; set; }

    /// <summary>Gets or sets the page size.</summary>
    public int? PageSize { get; set; }
}

/// <summary>
/// Lists generations progression for a run report with pagination.
/// </summary>
internal sealed class ListGenerationsEndpoint(
    LineageService lineageService,
    RunReportService reportService)
    : Endpoint<ListGenerationsRequest, object>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/reports/{id}/generations", "/api/runs/{id}/generations");
        Summary(summary =>
        {
            summary.Summary = "List generations for run report";
            summary.Description = "Returns the generation progression history with server-side pagination.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ListGenerationsRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        FlowRun? run = await lineageService.GetRunAsync(request.Id, cancellationToken).ConfigureAwait(false);
        if (run is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        RunReport report = reportService.GenerateReport(run);
        IReadOnlyList<ReportGenerationProgress> items = report.GenerationProgress ?? [];

        if (request.Page.HasValue || request.PageSize.HasValue)
        {
            var paged = PagedResult.Create(items, request.Page, request.PageSize);
            await Send.OkAsync(paged, cancellationToken).ConfigureAwait(false);
        }
        else
        {
            await Send.OkAsync(items, cancellationToken).ConfigureAwait(false);
        }
    }
}

/// <summary>
/// Request for a single generation detail.
/// </summary>
internal sealed class GetGenerationRequest
{
    /// <summary>Gets or sets the run report identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the 1-based generation number.</summary>
    public int GenId { get; set; }
}

/// <summary>
/// Returns details and population individuals for a specific generation.
/// </summary>
internal sealed class GetGenerationEndpoint(
    LineageService lineageService,
    RunReportService reportService)
    : Endpoint<GetGenerationRequest, ReportGenerationProgress>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/reports/{id}/generations/{genId}", "/api/runs/{id}/generations/{genId}");
        Summary(summary =>
        {
            summary.Summary = "Get generation details";
            summary.Description = "Returns population details and fitness metrics for a single generation.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetGenerationRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        FlowRun? run = await lineageService.GetRunAsync(request.Id, cancellationToken).ConfigureAwait(false);
        if (run is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        RunReport report = reportService.GenerateReport(run);
        var gen = report.GenerationProgress?.FirstOrDefault(g => g.Generation == request.GenId);
        if (gen is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(gen, cancellationToken).ConfigureAwait(false);
    }
}

/// <summary>
/// Request for a single population individual detail.
/// </summary>
internal sealed class GetPopulationRequest
{
    /// <summary>Gets or sets the run report identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the 1-based generation number.</summary>
    public int GenId { get; set; }

    /// <summary>Gets or sets the population chromosome identifier or index.</summary>
    public string PopId { get; set; } = string.Empty;
}

/// <summary>
/// Returns chromosome and backtest metrics for an individual chromosome in a generation.
/// </summary>
internal sealed class GetPopulationEndpoint(
    LineageService lineageService,
    RunReportService reportService)
    : Endpoint<GetPopulationRequest, ReportPopulationIndividual>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get(
            "/api/reports/{id}/generations/{genId}/populations/{popId}",
            "/api/runs/{id}/generations/{genId}/populations/{popId}");
        Summary(summary =>
        {
            summary.Summary = "Get population individual chromosome";
            summary.Description = "Returns chromosome genes, parameters, and simulated performance metrics.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetPopulationRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        FlowRun? run = await lineageService.GetRunAsync(request.Id, cancellationToken).ConfigureAwait(false);
        if (run is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        RunReport report = reportService.GenerateReport(run);
        var gen = report.GenerationProgress?.FirstOrDefault(g => g.Generation == request.GenId);
        if (gen is null || gen.Populations is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        var individual = gen.Populations.FirstOrDefault(p =>
            string.Equals(p.Id, request.PopId, StringComparison.OrdinalIgnoreCase) ||
            p.IndividualIndex.ToString(System.Globalization.CultureInfo.InvariantCulture) == request.PopId);

        if (individual is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(individual, cancellationToken).ConfigureAwait(false);
    }
}
