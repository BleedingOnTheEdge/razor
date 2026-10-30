// -----------------------------------------------------------------------------
// <copyright file="RotateEngineKeyEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

internal sealed class RotateEngineKeyRequest
{
    public Guid InstanceId { get; set; }
}

internal sealed class RotateEngineKeyResponse
{
    public Guid InstanceId { get; set; }
    public string EngineId { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
}

/// <summary>
/// Rotates the API key of an engine instance, immediately invalidating the previous credentials.
/// </summary>
internal sealed class RotateEngineKeyEndpoint(EngineRegistrationService registration)
    : Endpoint<RotateEngineKeyRequest, RotateEngineKeyResponse>
{
    public override void Configure()
    {
        Post("/api/instances/{instanceId}/rotate-key", "/api/engines/{instanceId}/rotate-key");
        Summary(s =>
        {
            s.Summary = "Rotate engine API key";
            s.Description = "Generates and returns a fresh API key for the instance, invalidating previous credentials.";
        });
    }

    public override async Task HandleAsync(RotateEngineKeyRequest req, CancellationToken ct)
    {
        var (instance, newKey) = await registration.RotateApiKeyAsync(req.InstanceId, ct)
            .ConfigureAwait(false);

        if (instance is null || newKey is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(new RotateEngineKeyResponse
        {
            InstanceId = instance.Id,
            EngineId = instance.EngineId,
            ApiKey = newKey
        }, ct).ConfigureAwait(false);
    }
}
