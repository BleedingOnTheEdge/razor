// -----------------------------------------------------------------------------
// <copyright file="ReplayRunEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for deterministically replaying a diverged run.
/// </summary>
internal sealed class ReplayRunRequest
{
    /// <summary>Gets or sets the base run identifier.</summary>
    public Guid BaseRunId { get; set; }

    /// <summary>Gets or sets where the run diverged.</summary>
    public ForkPoint ForkPoint { get; set; } = new();

    /// <summary>Gets or sets the sequence of recorded interventions.</summary>
    public IReadOnlyList<InterventionSpecification> Interventions { get; set; } = [];

    /// <summary>Gets or sets the child seed applied at the fork point, if any.</summary>
    public long? ChildSeed { get; set; }

    /// <summary>Gets or sets the random sequence position restored at the fork point.</summary>
    public string? RandomPosition { get; set; }
}

/// <summary>
/// Replays a diverged flow run from its recorded parameters and random state (003-040).
/// </summary>
internal sealed class ReplayRunEndpoint(FlowOrchestrator orchestrator)
    : Endpoint<ReplayRunRequest, FlowRunView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/runs/replay");
        Summary(summary =>
        {
            summary.Summary = "Replay a flow run";
            summary.Description = "Replays a diverged run from its recorded base, fork point, interventions, and random position.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ReplayRunRequest request, CancellationToken cancellationToken)
    {
        var spec = new ReplaySpecification(
            BaseRunId: request.BaseRunId,
            ForkPoint: request.ForkPoint,
            Interventions: request.Interventions,
            ChildSeed: request.ChildSeed,
            RandomPosition: request.RandomPosition);

        try
        {
            FlowRun replayed = await orchestrator
                .ReplayAsync(spec, cancellationToken)
                .ConfigureAwait(false);

            await Send.OkAsync(FlowRunView.FromEntity(replayed), cancellationToken).ConfigureAwait(false);
        }
        catch (KeyNotFoundException)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
        }
    }
}
