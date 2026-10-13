// -----------------------------------------------------------------------------
// <copyright file="GetInstanceEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for one instance's stored state.
/// </summary>
internal sealed class GetInstanceRequest
{
    /// <summary>Gets or sets the Cloud-side instance identifier.</summary>
    public Guid InstanceId { get; set; }
}

/// <summary>
/// One configured selection.
/// </summary>
internal sealed class SelectionView
{
    /// <summary>Gets or sets the slot the extension occupies.</summary>
    public ExtensionKind Kind { get; set; }

    /// <summary>Gets or sets the extension name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether the selection is active.</summary>
    public bool IsActive { get; set; }
}

/// <summary>
/// One extension the Engine has reported.
/// </summary>
internal sealed class ManifestEntryView
{
    /// <summary>Gets or sets the slot the extension occupies.</summary>
    public ExtensionKind Kind { get; set; }

    /// <summary>Gets or sets the extension name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets when the entry was last reported.</summary>
    public DateTimeOffset ReportedAt { get; set; }
}

/// <summary>
/// The resolved active selection set.
/// </summary>
internal sealed class ActiveSetView
{
    /// <summary>Gets or sets the active adapter.</summary>
    public string? Adapter { get; set; }

    /// <summary>Gets or sets the active strategy.</summary>
    public string? Strategy { get; set; }

    /// <summary>Gets or sets the active neural network model.</summary>
    public string? NeuralNetwork { get; set; }

    /// <summary>Gets or sets the active indicators.</summary>
    public IReadOnlyList<string> Indicators { get; set; } = [];

    /// <summary>Gets or sets the active hook plugins.</summary>
    public IReadOnlyList<string> HookPlugins { get; set; } = [];
}

/// <summary>
/// The stored state of an Engine instance.
/// </summary>
internal sealed class GetInstanceResponse
{
    /// <summary>Gets or sets the Cloud-side instance identifier.</summary>
    public Guid InstanceId { get; set; }

    /// <summary>Gets or sets the Engine's own identifier.</summary>
    public string EngineId { get; set; } = string.Empty;

    /// <summary>Gets or sets the display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the administrative state.</summary>
    public EngineInstanceStatus Status { get; set; }

    /// <summary>Gets or sets the registration timestamp.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets or sets the last authenticated heartbeat, when there has been one.</summary>
    public DateTimeOffset? LastSeenAt { get; set; }

    /// <summary>Gets or sets the resolved active selection set.</summary>
    public ActiveSetView ActiveSelections { get; set; } = new();

    /// <summary>Gets or sets every configured selection, active and inactive.</summary>
    public IReadOnlyList<SelectionView> Selections { get; set; } = [];

    /// <summary>Gets or sets the extensions the Engine has reported.</summary>
    public IReadOnlyList<ManifestEntryView> Manifest { get; set; } = [];
}

/// <summary>
/// Returns the stored state of an Engine instance: its administrative state, its reported extension
/// catalogue, its configured selections and the resolved active set
/// (002-030-160 §17.1 "stores user profiles with active adapter, strategy, indicators, and hook plugin
/// selections per engine instance").
/// </summary>
internal sealed class GetInstanceEndpoint(ProfileService profiles)
    : Endpoint<GetInstanceRequest, GetInstanceResponse>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/instances/{instanceId}");
        Summary(summary =>
        {
            summary.Summary = "Get an Engine instance's stored state";
            summary.Description =
                "Returns the instance, the extensions it has reported, the configured selections and the "
                + "resolved active set, which is what Cloud applies to the Engine.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetInstanceRequest request, CancellationToken cancellationToken)
    {
        InstanceStateSnapshot? snapshot = await profiles
            .GetInstanceStateAsync(request.InstanceId, cancellationToken)
            .ConfigureAwait(false);

        if (snapshot is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        var response = new GetInstanceResponse
        {
            InstanceId = snapshot.Instance.Id,
            EngineId = snapshot.Instance.EngineId,
            Name = snapshot.Instance.Name,
            Status = snapshot.Instance.Status,
            CreatedAt = snapshot.Instance.CreatedAt,
            LastSeenAt = snapshot.Instance.LastSeenAt,
            ActiveSelections = new ActiveSetView
            {
                Adapter = snapshot.ActiveSet.Adapter,
                Strategy = snapshot.ActiveSet.Strategy,
                NeuralNetwork = snapshot.ActiveSet.NeuralNetwork,
                Indicators = snapshot.ActiveSet.Indicators,
                HookPlugins = snapshot.ActiveSet.HookPlugins
            },
            Selections = [.. snapshot.Selections.Select(selection => new SelectionView
            {
                Kind = selection.Kind,
                Name = selection.Name,
                IsActive = selection.IsActive
            })],
            Manifest = [.. snapshot.Manifest.Select(entry => new ManifestEntryView
            {
                Kind = entry.Kind,
                Name = entry.Name,
                ReportedAt = entry.ReportedAt
            })]
        };

        await Send.OkAsync(response, cancellationToken).ConfigureAwait(false);
    }
}
