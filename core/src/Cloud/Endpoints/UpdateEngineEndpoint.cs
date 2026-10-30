// -----------------------------------------------------------------------------
// <copyright file="UpdateEngineEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

internal sealed class UpdateEngineRequest
{
    public Guid InstanceId { get; set; }
    public string? Name { get; set; }
    public EngineInstanceStatus? Status { get; set; }
}

internal sealed class UpdateEngineResponse
{
    public Guid InstanceId { get; set; }
    public string EngineId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// Updates an engine instance's friendly name and administrative state.
/// </summary>
internal sealed class UpdateEngineEndpoint(EngineRegistrationService registration)
    : Endpoint<UpdateEngineRequest, UpdateEngineResponse>
{
    public override void Configure()
    {
        Put("/api/instances/{instanceId}", "/api/engines/{instanceId}");
        Summary(s =>
        {
            s.Summary = "Update engine instance properties";
            s.Description = "Modifies the display name or administrative operational status of an engine instance.";
        });
    }

    public override async Task HandleAsync(UpdateEngineRequest req, CancellationToken ct)
    {
        EngineInstance? updated = await registration.UpdateAsync(req.InstanceId, req.Name, req.Status, ct)
            .ConfigureAwait(false);

        if (updated is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(new UpdateEngineResponse
        {
            InstanceId = updated.Id,
            EngineId = updated.EngineId,
            Name = updated.Name,
            Status = updated.Status.ToString()
        }, ct).ConfigureAwait(false);
    }
}
