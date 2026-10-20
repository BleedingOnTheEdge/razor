// -----------------------------------------------------------------------------
// <copyright file="CancelRunEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for cancelling a flow run.
/// </summary>
internal sealed class CancelRunRequest
{
    /// <summary>Gets or sets the flow run identifier.</summary>
    public Guid RunId { get; set; }
}

/// <summary>
/// Cancels an active or paused flow run (003-040).
/// </summary>
internal sealed class CancelRunEndpoint(FlowOrchestrator orchestrator)
    : Endpoint<CancelRunRequest, FlowRunView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/runs/{runId}/cancel");
        Summary(summary =>
        {
            summary.Summary = "Cancel a flow run";
            summary.Description = "Transitions an active or paused flow run to Cancelled state.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CancelRunRequest request, CancellationToken cancellationToken)
    {
        try
        {
            FlowRun run = await orchestrator
                .CancelRunAsync(request.RunId, cancellationToken)
                .ConfigureAwait(false);

            await Send.OkAsync(FlowRunView.FromEntity(run), cancellationToken).ConfigureAwait(false);
        }
        catch (KeyNotFoundException)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
        }
    }
}
