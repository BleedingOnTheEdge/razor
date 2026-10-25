// -----------------------------------------------------------------------------
// <copyright file="EngineSharingEndpoints.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;
using Microsoft.AspNetCore.Http;

/// <summary>Request to share an engine instance with another user.</summary>
internal sealed class CreateEngineShareRequest
{
    /// <summary>Gets or sets the engine instance ID from the route.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the email to share with.</summary>
    public string? SharedWithEmail { get; set; }

    /// <summary>Gets or sets the optional user ID to share with.</summary>
    public Guid? SharedWithUserId { get; set; }

    /// <summary>Gets or sets the share expiration timestamp in UTC.</summary>
    public DateTimeOffset ExpiresAtUtc { get; set; }

    /// <summary>Gets or sets whether the recipient can inspect telemetry and logs.</summary>
    public bool CanRead { get; set; } = true;

    /// <summary>Gets or sets whether the recipient can control the engine (pause, resume, config).</summary>
    public bool CanControl { get; set; } = true;

    /// <summary>Gets or sets whether the recipient can launch flow runs.</summary>
    public bool CanRunFlows { get; set; } = true;
}

/// <summary>View model for an active engine share.</summary>
internal sealed class EngineShareView
{
    public Guid Id { get; set; }
    public Guid EngineInstanceId { get; set; }
    public Guid OwnerAccountId { get; set; }
    public Guid? SharedWithUserId { get; set; }
    public string SharedWithEmail { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public bool CanRead { get; set; }
    public bool CanControl { get; set; }
    public bool CanRunFlows { get; set; }
    public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAtUtc;

    public static EngineShareView FromEntity(EngineShare s) => new()
    {
        Id = s.Id,
        EngineInstanceId = s.EngineInstanceId,
        OwnerAccountId = s.OwnerAccountId,
        SharedWithUserId = s.SharedWithUserId,
        SharedWithEmail = s.SharedWithEmail,
        CreatedAt = s.CreatedAt,
        ExpiresAtUtc = s.ExpiresAtUtc,
        CanRead = s.CanRead,
        CanControl = s.CanControl,
        CanRunFlows = s.CanRunFlows
    };
}

/// <summary>Endpoint to create a temporary share for an engine instance.</summary>
internal sealed class CreateEngineShareEndpoint(EngineRegistrationService registration)
    : Endpoint<CreateEngineShareRequest, EngineShareView>
{
    public override void Configure()
    {
        Post("/api/instances/{id}/shares");
        Summary(s =>
        {
            s.Summary = "Share an engine instance";
            s.Description = "Grants a temporary delegation for an engine to another user by email or user ID with an expiration date.";
        });
    }

    public override async Task HandleAsync(CreateEngineShareRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.SharedWithEmail) && !req.SharedWithUserId.HasValue)
        {
            AddError("Recipient email or user ID is required.");
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, ct).ConfigureAwait(false);
            return;
        }

        Guid ownerAccountId = Guid.Empty;
        if (HttpContext.Request.Headers.TryGetValue("X-Account-Id", out var accVal) && Guid.TryParse(accVal, out var parsedAcc))
        {
            ownerAccountId = parsedAcc;
        }

        try
        {
            DateTimeOffset expiresAt = req.ExpiresAtUtc == default
                ? DateTimeOffset.UtcNow.AddDays(7)
                : req.ExpiresAtUtc;

            EngineShare share = await registration.CreateShareAsync(
                req.Id,
                ownerAccountId,
                req.SharedWithEmail,
                req.SharedWithUserId,
                expiresAt,
                req.CanRead,
                req.CanControl,
                req.CanRunFlows,
                ct).ConfigureAwait(false);

            await Send.ResponseAsync(EngineShareView.FromEntity(share), StatusCodes.Status201Created, ct).ConfigureAwait(false);
        }
        catch (KeyNotFoundException)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
        }
        catch (UnauthorizedAccessException ex)
        {
            AddError(ex.Message);
            await Send.ErrorsAsync(StatusCodes.Status403Forbidden, ct).ConfigureAwait(false);
        }
        catch (ArgumentException ex)
        {
            AddError(ex.Message);
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, ct).ConfigureAwait(false);
        }
    }
}

/// <summary>Endpoint to list shares for an engine instance.</summary>
internal sealed class ListEngineSharesEndpoint(EngineRegistrationService registration)
    : EndpointWithoutRequest<IReadOnlyList<EngineShareView>>
{
    public override void Configure()
    {
        Get("/api/instances/{id}/shares");
        Summary(s =>
        {
            s.Summary = "List engine shares";
            s.Description = "Returns all active temporary sharing delegations for an engine instance.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        Guid instanceId = Route<Guid>("id");
        IReadOnlyList<EngineShare> shares = await registration.GetSharesAsync(instanceId, ct).ConfigureAwait(false);
        var views = shares.Select(EngineShareView.FromEntity).ToList().AsReadOnly();
        await Send.OkAsync(views, ct).ConfigureAwait(false);
    }
}

/// <summary>Endpoint to revoke an engine share.</summary>
internal sealed class RevokeEngineShareEndpoint(EngineRegistrationService registration)
    : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/api/instances/{id}/shares/{shareId}");
        Summary(s =>
        {
            s.Summary = "Revoke engine share";
            s.Description = "Revokes an active temporary delegation immediately.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        Guid shareId = Route<Guid>("shareId");
        Guid ownerAccountId = Guid.Empty;
        if (HttpContext.Request.Headers.TryGetValue("X-Account-Id", out var accVal) && Guid.TryParse(accVal, out var parsedAcc))
        {
            ownerAccountId = parsedAcc;
        }

        try
        {
            bool revoked = await registration.RevokeShareAsync(shareId, ownerAccountId, ct).ConfigureAwait(false);
            if (!revoked)
            {
                await Send.NotFoundAsync(ct).ConfigureAwait(false);
                return;
            }

            await Send.NoContentAsync(ct).ConfigureAwait(false);
        }
        catch (UnauthorizedAccessException)
        {
            await Send.ForbiddenAsync(ct).ConfigureAwait(false);
        }
    }
}
