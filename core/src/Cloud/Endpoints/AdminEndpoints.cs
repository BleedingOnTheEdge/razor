// -----------------------------------------------------------------------------
// <copyright file="AdminEndpoints.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

internal sealed class ListUsersAdminRequest
{
    public string? Search { get; set; }
    public UserRole? Role { get; set; }
    public SubscriptionTier? Tier { get; set; }
    public int Skip { get; set; }
    public int Take { get; set; } = 100;
}

internal sealed class UpdateUserRoleRequest
{
    public Guid UserId { get; set; }
    public UserRole Role { get; set; }
}

internal sealed class UpdateUserStatusRequest
{
    public Guid UserId { get; set; }
    public bool IsActive { get; set; }
}

internal sealed class DeleteUserRequest
{
    public Guid UserId { get; set; }
}

/// <summary>
/// Retrieves the current cluster settings and administrative policies.
/// </summary>
internal sealed class GetAdminSettingsEndpoint(AdminSettingsService settings)
    : EndpointWithoutRequest<ClusterSettingsDto>
{
    public override void Configure()
    {
        Get("/api/admin/settings");
        Summary(s =>
        {
            s.Summary = "Get cluster settings";
            s.Description = "Returns the active platform policies for fleet, security, marketplace, and telemetry.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        ClusterSettingsDto current = await settings.GetSettingsAsync(ct).ConfigureAwait(false);
        await Send.OkAsync(current, ct).ConfigureAwait(false);
    }
}

/// <summary>
/// Saves modifications to the cluster settings and administrative policies.
/// </summary>
internal sealed class SaveAdminSettingsEndpoint(AdminSettingsService settings)
    : Endpoint<ClusterSettingsDto, ClusterSettingsDto>
{
    public override void Configure()
    {
        Put("/api/admin/settings");
        Summary(s =>
        {
            s.Summary = "Update cluster settings";
            s.Description = "Persists updated platform configuration policies for the cluster.";
        });
    }

    public override async Task HandleAsync(ClusterSettingsDto req, CancellationToken ct)
    {
        ClusterSettingsDto updated = await settings.SaveSettingsAsync(req, ct).ConfigureAwait(false);
        await Send.OkAsync(updated, ct).ConfigureAwait(false);
    }
}

/// <summary>
/// Resets cluster settings and policies to system defaults.
/// </summary>
internal sealed class ResetAdminSettingsEndpoint(AdminSettingsService settings)
    : EndpointWithoutRequest<ClusterSettingsDto>
{
    public override void Configure()
    {
        Post("/api/admin/settings/reset");
        Summary(s =>
        {
            s.Summary = "Reset cluster settings";
            s.Description = "Resets all cluster policies to their factory default values.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        ClusterSettingsDto defaults = await settings.ResetDefaultsAsync(ct).ConfigureAwait(false);
        await Send.OkAsync(defaults, ct).ConfigureAwait(false);
    }
}

/// <summary>
/// Lists all registered users and operators for administration.
/// </summary>
internal sealed class ListUsersAdminEndpoint(UserService users)
    : Endpoint<ListUsersAdminRequest, IReadOnlyList<UserProfileView>>
{
    public override void Configure()
    {
        Get("/api/admin/users");
        Summary(s =>
        {
            s.Summary = "List all platform users";
            s.Description = "Returns paginated and filtered users for SuperAdmin and Operator management.";
        });
    }

    public override async Task HandleAsync(ListUsersAdminRequest req, CancellationToken ct)
    {
        IReadOnlyList<UserProfileView> result = await users.ListAllUsersAsync(
            req.Search,
            req.Role,
            req.Tier,
            req.Skip,
            req.Take,
            ct).ConfigureAwait(false);

        await Send.OkAsync(result, ct).ConfigureAwait(false);
    }
}

/// <summary>
/// Elevates or demotes a user's role (e.g. appointing an Operator or Administrator).
/// </summary>
internal sealed class UpdateUserRoleEndpoint(UserService users)
    : Endpoint<UpdateUserRoleRequest, UserProfileView>
{
    public override void Configure()
    {
        Put("/api/admin/users/{userId}/role");
        Summary(s =>
        {
            s.Summary = "Update user role";
            s.Description = "Elevates or demotes a user role (e.g. promoting a trader to operator).";
        });
    }

    public override async Task HandleAsync(UpdateUserRoleRequest req, CancellationToken ct)
    {
        UserProfileView? updated = await users.UpdateUserRoleAsync(req.UserId, req.Role, ct)
            .ConfigureAwait(false);

        if (updated is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(updated, ct).ConfigureAwait(false);
    }
}

/// <summary>
/// Suspends or reactivates a user account.
/// </summary>
internal sealed class UpdateUserStatusEndpoint(UserService users)
    : Endpoint<UpdateUserStatusRequest, UserProfileView>
{
    public override void Configure()
    {
        Put("/api/admin/users/{userId}/status");
        Summary(s =>
        {
            s.Summary = "Update user active status";
            s.Description = "Enables or suspends user authentication access.";
        });
    }

    public override async Task HandleAsync(UpdateUserStatusRequest req, CancellationToken ct)
    {
        UserProfileView? updated = await users.UpdateUserStatusAsync(req.UserId, req.IsActive, ct)
            .ConfigureAwait(false);

        if (updated is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(updated, ct).ConfigureAwait(false);
    }
}

/// <summary>
/// Permanently deletes a user from the platform.
/// </summary>
internal sealed class DeleteUserEndpoint(UserService users)
    : Endpoint<DeleteUserRequest>
{
    public override void Configure()
    {
        Delete("/api/admin/users/{userId}");
        Summary(s =>
        {
            s.Summary = "Delete user";
            s.Description = "Permanently removes a user account from the cluster.";
        });
    }

    public override async Task HandleAsync(DeleteUserRequest req, CancellationToken ct)
    {
        try
        {
            bool deleted = await users.DeleteUserAsync(req.UserId, ct).ConfigureAwait(false);
            if (!deleted)
            {
                await Send.NotFoundAsync(ct).ConfigureAwait(false);
                return;
            }

            await Send.NoContentAsync(ct).ConfigureAwait(false);
        }
        catch (InvalidOperationException ex)
        {
            ThrowError(ex.Message);
        }
    }
}

internal sealed class UpdateUserSubscriptionRequest
{
    public Guid UserId { get; set; }
    public SubscriptionTier Tier { get; set; }
}

internal sealed class ResetUserPasswordRequest
{
    public Guid UserId { get; set; }
    public string NewPassword { get; set; } = string.Empty;
}

internal sealed class ImpersonateUserRequest
{
    public Guid UserId { get; set; }
}

/// <summary>
/// Updates a user's subscription tier.
/// </summary>
internal sealed class UpdateUserSubscriptionEndpoint(UserService users)
    : Endpoint<UpdateUserSubscriptionRequest, UserProfileView>
{
    public override void Configure()
    {
        Put("/api/admin/users/{userId}/subscription");
        Summary(s =>
        {
            s.Summary = "Update user subscription tier";
            s.Description = "Changes user subscription tier and recalculates quota limits.";
        });
    }

    public override async Task HandleAsync(UpdateUserSubscriptionRequest req, CancellationToken ct)
    {
        UserProfileView? updated = await users.UpdateUserSubscriptionAsync(req.UserId, req.Tier, ct).ConfigureAwait(false);
        if (updated is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(updated, ct).ConfigureAwait(false);
    }
}

/// <summary>
/// Resets a user's password.
/// </summary>
internal sealed class ResetUserPasswordEndpoint(UserService users)
    : Endpoint<ResetUserPasswordRequest>
{
    public override void Configure()
    {
        Post("/api/admin/users/{userId}/reset-password");
        Summary(s =>
        {
            s.Summary = "Reset user password";
            s.Description = "Sets a new login password for a user account.";
        });
    }

    public override async Task HandleAsync(ResetUserPasswordRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.NewPassword))
        {
            ThrowError("New password cannot be empty.");
            return;
        }

        bool success = await users.ResetUserPasswordAsync(req.UserId, req.NewPassword, ct).ConfigureAwait(false);
        if (!success)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(new { message = "Password successfully reset." }, ct).ConfigureAwait(false);
    }
}

/// <summary>
/// Initiates an impersonation session for administrators or operators.
/// </summary>
internal sealed class ImpersonateUserEndpoint(UserService users)
    : Endpoint<ImpersonateUserRequest, AuthSessionResponse>
{
    public override void Configure()
    {
        Post("/api/admin/impersonate/{userId}");
        Summary(s =>
        {
            s.Summary = "Impersonate user";
            s.Description = "Generates a scoped authentication token to impersonate a target user.";
        });
    }

    public override async Task HandleAsync(ImpersonateUserRequest req, CancellationToken ct)
    {
        Guid actorUserId = Guid.Empty;
        if (HttpContext.Request.Headers.TryGetValue("X-User-Id", out var userHeader) && Guid.TryParse(userHeader, out var parsedActor))
        {
            actorUserId = parsedActor;
        }

        if (actorUserId == Guid.Empty)
        {
            UserProfileView defaultAdmin = await users.GetOrCreateDefaultUserAsync(null, ct).ConfigureAwait(false);
            actorUserId = defaultAdmin.UserId;
        }

        try
        {
            AuthSessionResponse? session = await users.CreateImpersonationSessionAsync(actorUserId, req.UserId, ct).ConfigureAwait(false);
            if (session is null)
            {
                await Send.NotFoundAsync(ct).ConfigureAwait(false);
                return;
            }

            await Send.OkAsync(session, ct).ConfigureAwait(false);
        }
        catch (UnauthorizedAccessException ex)
        {
            ThrowError(ex.Message, StatusCodes.Status403Forbidden);
        }
    }
}
