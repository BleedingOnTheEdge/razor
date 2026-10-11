// -----------------------------------------------------------------------------
// <copyright file="StartRunEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for starting a new original flow run.
/// </summary>
internal sealed class StartRunRequest
{
    /// <summary>Gets or sets the target instance identifier.</summary>
    public Guid InstanceId { get; set; }

    /// <summary>Gets or sets the category of flow execution.</summary>
    public RunKind Kind { get; set; }

    /// <summary>Gets or sets the initial master seed for the run.</summary>
    public long? BaseSeed { get; set; }
}

/// <summary>
/// Starts a new original flow run for an Engine instance (003-040).
/// </summary>
internal sealed class StartRunEndpoint(FlowOrchestrator orchestrator)
    : Endpoint<StartRunRequest, FlowRunView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/runs");
        Summary(summary =>
        {
            summary.Summary = "Start a new flow run";
            summary.Description = "Creates and starts an original flow run (Backtest, Optimization, WalkForward) on an instance.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(StartRunRequest request, CancellationToken cancellationToken)
    {
        try
        {
            FlowRun run = await orchestrator
                .StartOriginalRunAsync(request.InstanceId, request.Kind, request.BaseSeed, cancellationToken)
                .ConfigureAwait(false);

            await Send.ResponseAsync(FlowRunView.FromEntity(run), StatusCodes.Status201Created, cancellationToken)
                .ConfigureAwait(false);
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
