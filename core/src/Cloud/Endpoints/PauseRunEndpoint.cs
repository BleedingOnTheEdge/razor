// -----------------------------------------------------------------------------
// <copyright file="PauseRunEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for pausing a flow run.
/// </summary>
internal sealed class PauseRunRequest
{
    /// <summary>Gets or sets the flow run identifier.</summary>
    public Guid RunId { get; set; }
}

/// <summary>
/// Pauses an active flow run at its current execution checkpoint (003-040).
/// </summary>
internal sealed class PauseRunEndpoint(FlowOrchestrator orchestrator)
    : Endpoint<PauseRunRequest, FlowRunView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/runs/{runId}/pause");
        Summary(summary =>
        {
            summary.Summary = "Pause a flow run";
            summary.Description = "Transitions an active flow run to Paused state.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(PauseRunRequest request, CancellationToken cancellationToken)
    {
        try
        {
            FlowRun run = await orchestrator
                .PauseRunAsync(request.RunId, cancellationToken)
                .ConfigureAwait(false);

            await Send.OkAsync(FlowRunView.FromEntity(run), cancellationToken).ConfigureAwait(false);
        }
        catch (KeyNotFoundException)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
        }
    }
}
