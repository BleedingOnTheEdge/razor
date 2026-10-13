// -----------------------------------------------------------------------------
// <copyright file="UserEndpoints.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>Query parameters for current user info.</summary>
internal sealed class GetCurrentUserRequest
{
    /// <summary>Gets or sets an optional preferred user name.</summary>
    public string? UserName { get; set; }
}

/// <summary>Payload for upgrading account subscription tier.</summary>
internal sealed class UpgradeSubscriptionRequest
{
    /// <summary>Gets or sets the target subscription tier.</summary>
    public SubscriptionTier Tier { get; set; }
}

/// <summary>Retrieves the active user profile, assigned role, and subscription tier.</summary>
internal sealed class GetCurrentUserEndpoint(UserService users) : Endpoint<GetCurrentUserRequest, UserProfileView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/users/me");
        Summary(s =>
        {
            s.Summary = "Get current user profile";
            s.Description = "Returns the active user context, RBAC permissions, and account subscription tier.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetCurrentUserRequest req, CancellationToken ct)
    {
        UserProfileView profile = await users.GetOrCreateDefaultUserAsync(req.UserName, ct)
            .ConfigureAwait(false);
        await Send.OkAsync(profile, ct).ConfigureAwait(false);
    }
}

/// <summary>Upgrades an account's subscription tier.</summary>
internal sealed class UpgradeSubscriptionEndpoint(UserService users) : Endpoint<UpgradeSubscriptionRequest, UserProfileView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/accounts/{accountId}/subscription");
        Summary(s =>
        {
            s.Summary = "Upgrade subscription tier";
            s.Description = "Upgrades an account tier between Free (developer), Pro (trader), and Enterprise (institutional).";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(UpgradeSubscriptionRequest req, CancellationToken ct)
    {
        Guid accountId = Route<Guid>("accountId");
        UserProfileView? updated = await users.UpgradeSubscriptionAsync(accountId, req.Tier, ct)
            .ConfigureAwait(false);

        if (updated is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(updated, ct).ConfigureAwait(false);
    }
}
