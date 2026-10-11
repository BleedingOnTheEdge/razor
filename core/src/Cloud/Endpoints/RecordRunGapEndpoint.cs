// -----------------------------------------------------------------------------
// <copyright file="RecordRunGapEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for recording an execution gap on a flow run.
/// </summary>
internal sealed class RecordRunGapRequest
{
    /// <summary>Gets or sets the run identifier.</summary>
    public Guid RunId { get; set; }

    /// <summary>Gets or sets the start step.</summary>
    public int StartStep { get; set; }

    /// <summary>Gets or sets the end step.</summary>
    public int EndStep { get; set; }

    /// <summary>Gets or sets the mandatory reason.</summary>
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Records an execution or data gap on a run, marking it Gapped and Partial (003-040).
/// </summary>
internal sealed class RecordRunGapEndpoint(LineageService lineageService)
    : Endpoint<RecordRunGapRequest, GapView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/runs/{runId}/gaps");
        Summary(summary =>
        {
            summary.Summary = "Record a run gap";
            summary.Description = "Records a gap period and reason, transitioning run continuity to Gapped.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(RecordRunGapRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            AddError("Reason is mandatory when recording a gap.");
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, cancellationToken).ConfigureAwait(false);
            return;
        }

        try
        {
            RunGap gap = await lineageService
                .RecordGapAsync(
                    request.RunId,
                    new GapSpecification(request.StartStep, request.EndStep, request.Reason),
                    cancellationToken)
                .ConfigureAwait(false);

            var view = new GapView
            {
                Id = gap.Id,
                FlowRunId = gap.FlowRunId,
                StartStep = gap.StartStep,
                EndStep = gap.EndStep,
                Reason = gap.Reason,
                RecordedAt = gap.RecordedAt
            };

            await Send.ResponseAsync(view, StatusCodes.Status201Created, cancellationToken).ConfigureAwait(false);
        }
        catch (KeyNotFoundException)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (ArgumentException ex)
        {
            AddError(ex.Message);
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, cancellationToken).ConfigureAwait(false);
        }
    }
}
