// -----------------------------------------------------------------------------
// <copyright file="UserProfileEndpoints.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Services;
using FastEndpoints;

internal sealed class GetProfileRequest
{
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
}

internal sealed class UpdateProfileRequest
{
    public Guid? UserId { get; set; }
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
}

/// <summary>
/// Retrieves the profile details of the current or specified user.
/// </summary>
internal sealed class GetUserProfileEndpoint(UserService users)
    : Endpoint<GetProfileRequest, UserProfileView>
{
    public override void Configure()
    {
        Get("/api/profile");
        Summary(s =>
        {
            s.Summary = "Get user profile";
            s.Description = "Returns the user profile with personal details, account workspace, active licenses, and permissions.";
        });
    }

    public override async Task HandleAsync(GetProfileRequest req, CancellationToken ct)
    {
        UserProfileView? view = null;

        if (req.UserId.HasValue && req.UserId.Value != Guid.Empty)
        {
            view = await users.GetUserByIdAsync(req.UserId.Value, ct).ConfigureAwait(false);
        }
        else if (!string.IsNullOrWhiteSpace(req.UserName))
        {
            view = await users.GetUserByUsernameAsync(req.UserName, ct).ConfigureAwait(false);
        }

        if (view is null)
        {
            // Default to active session/default user
            view = await users.GetOrCreateDefaultUserAsync(req.UserName, ct).ConfigureAwait(false);
        }

        await Send.OkAsync(view, ct).ConfigureAwait(false);
    }
}

/// <summary>
/// Updates profile information for the specified user.
/// </summary>
internal sealed class UpdateUserProfileEndpoint(UserService users)
    : Endpoint<UpdateProfileRequest, UserProfileView>
{
    public override void Configure()
    {
        Put("/api/profile", "/api/users/me");
        Summary(s =>
        {
            s.Summary = "Update user profile";
            s.Description = "Modifies display name, email, avatar URL, or biography for the user.";
        });
    }

    public override async Task HandleAsync(UpdateProfileRequest req, CancellationToken ct)
    {
        Guid targetUserId = req.UserId ?? Guid.Empty;

        if (targetUserId == Guid.Empty)
        {
            UserProfileView defaultUser = await users.GetOrCreateDefaultUserAsync(null, ct).ConfigureAwait(false);
            targetUserId = defaultUser.UserId;
        }

        UserProfileView? updated = await users.UpdateProfileAsync(
            targetUserId,
            req.DisplayName,
            req.Email,
            req.AvatarUrl,
            req.Bio,
            ct).ConfigureAwait(false);

        if (updated is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(updated, ct).ConfigureAwait(false);
    }
}
