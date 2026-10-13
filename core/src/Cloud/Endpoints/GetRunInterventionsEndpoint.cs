// -----------------------------------------------------------------------------
// <copyright file="GetRunInterventionsEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for a run's intervention log.
/// </summary>
internal sealed class GetRunInterventionsRequest
{
    /// <summary>Gets or sets the run identifier.</summary>
    public Guid RunId { get; set; }
}

/// <summary>
/// Summary view of an intervention applied to a flow run.
/// </summary>
internal sealed class InterventionView
{
    /// <summary>Gets or sets the intervention record identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the flow run identifier.</summary>
    public Guid FlowRunId { get; set; }

    /// <summary>Gets or sets the step index.</summary>
    public long StepIndex { get; set; }

    /// <summary>Gets or sets the fingerprint before modification.</summary>
    public string PreviousFingerprint { get; set; } = string.Empty;

    /// <summary>Gets or sets the fingerprint after modification.</summary>
    public string NewFingerprint { get; set; } = string.Empty;

    /// <summary>Gets or sets the actor who modified the state.</summary>
    public string Actor { get; set; } = string.Empty;

    /// <summary>Gets or sets the mandatory reason.</summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>Gets or sets the modifications summary.</summary>
    public string? ModificationsSummary { get; set; }

    /// <summary>Gets or sets when the intervention occurred.</summary>
    public DateTimeOffset Timestamp { get; set; }
}

/// <summary>
/// Returns the append-only intervention history recorded for a run (003-040).
/// </summary>
internal sealed class GetRunInterventionsEndpoint(LineageService lineageService)
    : Endpoint<GetRunInterventionsRequest, IReadOnlyList<InterventionView>>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/runs/{runId}/interventions");
        Summary(summary =>
        {
            summary.Summary = "Get run interventions";
            summary.Description = "Returns the append-only intervention log documenting who modified state, what changed, and why.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetRunInterventionsRequest request, CancellationToken cancellationToken)
    {
        IReadOnlyList<RunIntervention> list = await lineageService
            .GetInterventionsAsync(request.RunId, cancellationToken)
            .ConfigureAwait(false);

        List<InterventionView> items = [.. list.Select(i => new InterventionView
        {
            Id = i.Id,
            FlowRunId = i.FlowRunId,
            StepIndex = i.StepIndex,
            PreviousFingerprint = i.PreviousFingerprint,
            NewFingerprint = i.NewFingerprint,
            Actor = i.Actor,
            Reason = i.Reason,
            ModificationsSummary = i.ModificationsSummary,
            Timestamp = i.Timestamp
        })];

        await Send.OkAsync(items, cancellationToken).ConfigureAwait(false);
    }
}
