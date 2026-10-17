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

    /// <summary>Gets or sets the 1-based page number.</summary>
    public int? Page { get; set; }

    /// <summary>Gets or sets the page size.</summary>
    public int? PageSize { get; set; }
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

    /// <summary>Gets or sets whether this engine is shared with the user.</summary>
    public bool IsShared { get; set; }

    /// <summary>Gets or sets the expiration timestamp if shared.</summary>
    public DateTimeOffset? ShareExpiresAt { get; set; }
}

/// <summary>
/// Lists registered Engine instances, optionally filtered by account.
/// </summary>
internal sealed class ListInstancesEndpoint(
    EngineRegistrationService registration,
    EngineSessionRegistry registry)
    : Endpoint<ListInstancesRequest, object>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/instances");
        Summary(summary =>
        {
            summary.Summary = "List Engine instances";
            summary.Description = "Returns registered instances with connectivity and catalogue counts, optionally filtered by account with server-side pagination.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ListInstancesRequest request, CancellationToken cancellationToken)
    {
        Guid? accountId = request.AccountId;
        if (!accountId.HasValue && HttpContext.Request.Headers.TryGetValue("X-Account-Id", out var accVal) && Guid.TryParse(accVal, out var parsedAcc))
        {
            accountId = parsedAcc;
        }

        Guid? userId = null;
        if (HttpContext.Request.Headers.TryGetValue("X-User-Id", out var userVal) && Guid.TryParse(userVal, out var parsedUser))
        {
            userId = parsedUser;
        }

        string? userEmail = HttpContext.Request.Headers.TryGetValue("X-User-Email", out var emailVal) ? emailVal.ToString() : null;

        IReadOnlyList<EngineInstance> instances = await registration
            .ListAsync(accountId, userId, userEmail, cancellationToken)
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
            IsConnected = connected.Contains(i.Id) || (i.LastSeenAt.HasValue && i.LastSeenAt.Value >= DateTimeOffset.UtcNow.AddSeconds(-45)),
            ManifestExtensionCount = i.ManifestEntries.Count,
            IsShared = accountId.HasValue && i.AccountId != accountId.Value
        })];

        if (request.Page.HasValue || request.PageSize.HasValue)
        {
            var paged = PagedResult.Create(items, request.Page, request.PageSize);
            await Send.OkAsync(paged, cancellationToken).ConfigureAwait(false);
        }
        else
        {
            await Send.OkAsync(items, cancellationToken).ConfigureAwait(false);
        }
    }
}
