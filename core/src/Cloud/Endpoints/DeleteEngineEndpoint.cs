// -----------------------------------------------------------------------------
// <copyright file="DeleteEngineEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Services;
using FastEndpoints;

internal sealed class DeleteEngineRequest
{
    public Guid InstanceId { get; set; }
}

/// <summary>
/// Decommissions and deletes an engine instance from the cluster inventory.
/// </summary>
internal sealed class DeleteEngineEndpoint(EngineRegistrationService registration)
    : Endpoint<DeleteEngineRequest>
{
    public override void Configure()
    {
        Delete("/api/instances/{instanceId}", "/api/engines/{instanceId}");
        Summary(s =>
        {
            s.Summary = "Delete engine instance";
            s.Description = "Permanently decommissions and removes an engine instance from the fleet inventory.";
        });
    }

    public override async Task HandleAsync(DeleteEngineRequest req, CancellationToken ct)
    {
        bool deleted = await registration.DeleteAsync(req.InstanceId, ct)
            .ConfigureAwait(false);

        if (!deleted)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.NoContentAsync(ct).ConfigureAwait(false);
    }
}
