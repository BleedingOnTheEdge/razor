// -----------------------------------------------------------------------------
// <copyright file="ResumeRunEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for resuming a paused run with an intervention.
/// </summary>
internal sealed class ResumeRunRequest
{
    /// <summary>Gets or sets the parent run identifier.</summary>
    public Guid RunId { get; set; }

    /// <summary>Gets or sets where the intervention occurred.</summary>
    public ForkPoint ForkPoint { get; set; } = new();

    /// <summary>Gets or sets the mandatory intervention specification.</summary>
    public InterventionSpecification Intervention { get; set; } = null!;

    /// <summary>Gets or sets the random sequence position at the fork point.</summary>
    public string? NewRandomPosition { get; set; }

    /// <summary>Gets or sets the optional child seed.</summary>
    public long? ChildSeed { get; set; }
}

/// <summary>
/// Resumes a paused flow run with an intervention, creating a Spliced child run (003-040).
/// </summary>
internal sealed class ResumeRunEndpoint(FlowOrchestrator orchestrator)
    : Endpoint<ResumeRunRequest, FlowRunView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/runs/{runId}/resume");
        Summary(summary =>
        {
            summary.Summary = "Resume a run with intervention";
            summary.Description = "Resumes execution from a checkpoint with parameter modifications, recording the mandatory reason.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ResumeRunRequest request, CancellationToken cancellationToken)
    {
        if (request.Intervention is null || string.IsNullOrWhiteSpace(request.Intervention.Reason))
        {
            AddError("Intervention reason is mandatory when resuming with modifications.");
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, cancellationToken).ConfigureAwait(false);
            return;
        }

        try
        {
            FlowRun child = await orchestrator
                .ResumeWithInterventionAsync(
                    request.RunId,
                    request.ForkPoint,
                    request.Intervention,
                    request.NewRandomPosition,
                    request.ChildSeed,
                    cancellationToken)
                .ConfigureAwait(false);

            await Send.OkAsync(FlowRunView.FromEntity(child), cancellationToken).ConfigureAwait(false);
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
