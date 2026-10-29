// -----------------------------------------------------------------------------
// <copyright file="RevokeEngineEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Services;
using FastEndpoints;

internal sealed class RevokeEngineRequest
{
    public Guid InstanceId { get; set; }
    public string? Reason { get; set; }
}

/// <summary>
/// Revokes credentials and permanently bars an engine instance from connecting to the cluster.
/// </summary>
internal sealed class RevokeEngineEndpoint(EngineRegistrationService registration)
    : Endpoint<RevokeEngineRequest>
{
    public override void Configure()
    {
        Post("/api/instances/{instanceId}/revoke");
        Summary(s =>
        {
            s.Summary = "Revoke engine instance access";
            s.Description = "Bars the engine instance and invalidates its authentication credentials immediately.";
        });
    }

    public override async Task HandleAsync(RevokeEngineRequest req, CancellationToken ct)
    {
        bool revoked = await registration.RevokeAsync(req.InstanceId, req.Reason, ct)
            .ConfigureAwait(false);

        if (!revoked)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.NoContentAsync(ct).ConfigureAwait(false);
    }
}
