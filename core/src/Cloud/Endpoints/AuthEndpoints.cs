// -----------------------------------------------------------------------------
// <copyright file="AuthEndpoints.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>Payload for user login.</summary>
internal sealed class LoginRequest
{
    /// <summary>Gets or sets the username.</summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>Gets or sets the password.</summary>
    public string Password { get; set; } = string.Empty;
}

/// <summary>Payload for user registration.</summary>
internal sealed class RegisterRequest
{
    /// <summary>Gets or sets the username.</summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>Gets or sets the password.</summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>Gets or sets the account workspace name.</summary>
    public string? AccountName { get; set; }

    /// <summary>Gets or sets the user's role.</summary>
    public UserRole Role { get; set; } = UserRole.Operator;

    /// <summary>Gets or sets the account subscription tier.</summary>
    public SubscriptionTier SubscriptionTier { get; set; } = SubscriptionTier.Free;
}

/// <summary>Logs in a user and returns an authenticated session token.</summary>
internal sealed class LoginEndpoint(UserService users) : Endpoint<LoginRequest, AuthSessionResponse>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/auth/login");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Sign in user";
            s.Description = "Authenticates user credentials and issues an active session token for the control plane and marketplace.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(LoginRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.UserName) || string.IsNullOrWhiteSpace(req.Password))
        {
            ThrowError("Username and password are required.");
        }

        AuthSessionResponse? session = await users.AuthenticateAsync(req.UserName, req.Password, ct)
            .ConfigureAwait(false);

        if (session is null)
        {
            await Send.UnauthorizedAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(session, ct).ConfigureAwait(false);
    }
}

/// <summary>Registers a new user and account.</summary>
internal sealed class RegisterEndpoint(UserService users) : Endpoint<RegisterRequest, AuthSessionResponse>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/auth/register");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Register user";
            s.Description = "Creates a new user account, workspace, and issues an active session token.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(RegisterRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.UserName) || string.IsNullOrWhiteSpace(req.Password))
        {
            ThrowError("Username and password are required.");
        }

        try
        {
            AuthSessionResponse session = await users.RegisterUserAsync(
                req.UserName,
                req.Password,
                req.AccountName,
                UserRole.Operator,
                SubscriptionTier.Free,
                ct).ConfigureAwait(false);

            await Send.OkAsync(session, ct).ConfigureAwait(false);
        }
        catch (InvalidOperationException ex)
        {
            ThrowError(ex.Message);
        }
    }
}

/// <summary>Retrieves the active session for the authenticated context.</summary>
internal sealed class GetSessionEndpoint(UserService users) : EndpointWithoutRequest<UserProfileView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/auth/session");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Get active session";
            s.Description = "Returns the active authenticated user profile.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CancellationToken ct)
    {
        UserProfileView user = await users.GetOrCreateDefaultUserAsync(null, ct).ConfigureAwait(false);
        await Send.OkAsync(user, ct).ConfigureAwait(false);
    }
}
