// -----------------------------------------------------------------------------
// <copyright file="TradeEndpoints.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// Request for listing trades in a flow run report.
/// </summary>
internal sealed class ListTradesRequest
{
    /// <summary>Gets or sets the run report identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the 1-based page number.</summary>
    public int? Page { get; set; }

    /// <summary>Gets or sets the page size.</summary>
    public int? PageSize { get; set; }

    /// <summary>Gets or sets the optional symbol filter.</summary>
    public string? Symbol { get; set; }

    /// <summary>Gets or sets the optional direction (Buy/Sell) filter.</summary>
    public string? Side { get; set; }
}

/// <summary>
/// Lists granular trade executions for a run report with pagination and filters.
/// </summary>
internal sealed class ListTradesEndpoint(
    LineageService lineageService,
    RunReportService reportService)
    : Endpoint<ListTradesRequest, object>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/reports/{id}/trades", "/api/runs/{id}/trades");
        Summary(summary =>
        {
            summary.Summary = "List trades for run report";
            summary.Description = "Returns granular trade executions and fills with server-side pagination.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ListTradesRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        FlowRun? run = await lineageService.GetRunAsync(request.Id, cancellationToken).ConfigureAwait(false);
        if (run is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        RunReport report = reportService.GenerateReport(run);
        IEnumerable<ReportTradeItem> trades = report.Trades ?? [];

        if (!string.IsNullOrWhiteSpace(request.Symbol))
        {
            trades = trades.Where(t => string.Equals(t.Symbol, request.Symbol.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(request.Side))
        {
            trades = trades.Where(t => string.Equals(t.Side, request.Side.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        List<ReportTradeItem> items = [.. trades];

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
/// Request for single trade execution detail.
/// </summary>
internal sealed class GetTradeRequest
{
    /// <summary>Gets or sets the optional run report identifier.</summary>
    public Guid? Id { get; set; }

    /// <summary>Gets or sets the ticket number.</summary>
    public long Ticket { get; set; }
}

/// <summary>
/// Returns details for a single trade execution by ticket.
/// </summary>
internal sealed class GetTradeEndpoint(
    LineageService lineageService,
    RunReportService reportService)
    : Endpoint<GetTradeRequest, ReportTradeItem>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get(
            "/api/reports/{id}/trades/{ticket}",
            "/api/runs/{id}/trades/{ticket}",
            "/api/trades/{ticket}");
        Summary(summary =>
        {
            summary.Summary = "Get trade execution detail";
            summary.Description = "Returns granular execution metrics, timestamps, and SL/TP for a trade ticket.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetTradeRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (request.Id.HasValue && request.Id.Value != Guid.Empty)
        {
            FlowRun? run = await lineageService.GetRunAsync(request.Id.Value, cancellationToken).ConfigureAwait(false);
            if (run is not null)
            {
                RunReport report = reportService.GenerateReport(run);
                var trade = report.Trades?.FirstOrDefault(t => t.Ticket == request.Ticket);
                if (trade is not null)
                {
                    await Send.OkAsync(trade, cancellationToken).ConfigureAwait(false);
                    return;
                }
            }
        }
        else
        {
            // Search recent runs for the ticket
            IReadOnlyList<FlowRun> recentRuns = await lineageService.GetRunsAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
            foreach (var r in recentRuns)
            {
                RunReport report = reportService.GenerateReport(r);
                var trade = report.Trades?.FirstOrDefault(t => t.Ticket == request.Ticket);
                if (trade is not null)
                {
                    await Send.OkAsync(trade, cancellationToken).ConfigureAwait(false);
                    return;
                }
            }
        }

        await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
    }
}
