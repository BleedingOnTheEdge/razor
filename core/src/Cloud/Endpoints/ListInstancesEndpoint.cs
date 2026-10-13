// -----------------------------------------------------------------------------
// <copyright file="ListInstancesEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Engine;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for listing instances.
/// </summary>
internal sealed class ListInstancesRequest
{
    /// <summary>Gets or sets the optional account filter.</summary>
    public Guid? AccountId { get; set; }
}

/// <summary>
/// Summary view of a registered Engine instance.
/// </summary>
internal sealed class InstanceListItemView
{
    /// <summary>Gets or sets the instance identifier.</summary>
    public Guid InstanceId { get; set; }

    /// <summary>Gets or sets the account identifier.</summary>
    public Guid AccountId { get; set; }

    /// <summary>Gets or sets the license identifier.</summary>
    public Guid LicenseId { get; set; }

    /// <summary>Gets or sets the Engine identifier.</summary>
    public string EngineId { get; set; } = string.Empty;

    /// <summary>Gets or sets the display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the administrative status.</summary>
    public EngineInstanceStatus Status { get; set; }

    /// <summary>Gets or sets the creation timestamp.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets or sets the last seen timestamp.</summary>
    public DateTimeOffset? LastSeenAt { get; set; }

    /// <summary>Gets or sets a value indicating whether the instance currently has an active connected session.</summary>
    public bool IsConnected { get; set; }

    /// <summary>Gets or sets the count of reported manifest extensions.</summary>
    public int ManifestExtensionCount { get; set; }
}

/// <summary>
/// Lists registered Engine instances, optionally filtered by account.
/// </summary>
internal sealed class ListInstancesEndpoint(
    EngineRegistrationService registration,
    EngineSessionRegistry registry)
    : Endpoint<ListInstancesRequest, IReadOnlyList<InstanceListItemView>>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/instances");
        Summary(summary =>
        {
            summary.Summary = "List Engine instances";
            summary.Description = "Returns registered instances with connectivity and catalogue counts, optionally filtered by account.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ListInstancesRequest request, CancellationToken cancellationToken)
    {
        IReadOnlyList<EngineInstance> instances = await registration
            .ListAsync(request.AccountId, cancellationToken)
            .ConfigureAwait(false);

        HashSet<Guid> connected = [.. registry.GetConnectedInstanceIds()];

        List<InstanceListItemView> items = [.. instances.Select(i => new InstanceListItemView
        {
            InstanceId = i.Id,
            AccountId = i.AccountId,
            LicenseId = i.LicenseId,
            EngineId = i.EngineId,
            Name = i.Name,
            Status = i.Status,
            CreatedAt = i.CreatedAt,
            LastSeenAt = i.LastSeenAt,
            IsConnected = connected.Contains(i.Id),
            ManifestExtensionCount = i.ManifestEntries.Count
        })];

        await Send.OkAsync(items, cancellationToken).ConfigureAwait(false);
    }
}
