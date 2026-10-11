// -----------------------------------------------------------------------------
// <copyright file="BranchRunEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for branching a run from a checkpoint.
/// </summary>
internal sealed class BranchRunRequest
{
    /// <summary>Gets or sets the parent run identifier.</summary>
    public Guid RunId { get; set; }

    /// <summary>Gets or sets where the branch occurred.</summary>
    public ForkPoint ForkPoint { get; set; } = new();

    /// <summary>Gets or sets the mandatory intervention specification.</summary>
    public InterventionSpecification Intervention { get; set; } = null!;

    /// <summary>Gets or sets the random sequence position at the fork point.</summary>
    public string? NewRandomPosition { get; set; }

    /// <summary>Gets or sets the optional child seed.</summary>
    public long? ChildSeed { get; set; }
}

/// <summary>
/// Branches from a past checkpoint into a new child run with relationship Branched (003-040).
/// </summary>
internal sealed class BranchRunEndpoint(FlowOrchestrator orchestrator)
    : Endpoint<BranchRunRequest, FlowRunView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/runs/{runId}/branch");
        Summary(summary =>
        {
            summary.Summary = "Branch from a run checkpoint";
            summary.Description = "Creates a Branched child run preserving the parent run in full.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(BranchRunRequest request, CancellationToken cancellationToken)
    {
        if (request.Intervention is null || string.IsNullOrWhiteSpace(request.Intervention.Reason))
        {
            AddError("Intervention reason is mandatory when branching with modifications.");
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, cancellationToken).ConfigureAwait(false);
            return;
        }

        try
        {
            FlowRun child = await orchestrator
                .BranchFromCheckpointAsync(
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
