// -----------------------------------------------------------------------------
// <copyright file="HealthEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using FastEndpoints;

/// <summary>
/// Health probe response payload for Cloud API orchestrators.
/// </summary>
internal sealed class HealthResponse
{
    /// <summary>Gets or sets the health status.</summary>
    public string Status { get; set; } = "healthy";

    /// <summary>Gets or sets the service name.</summary>
    public string Service { get; set; } = "Razor Cloud Control Plane";

    /// <summary>Gets or sets the API version string.</summary>
    public string Version { get; set; } = "v1.0.0";

    /// <summary>Gets or sets the probe evaluation timestamp.</summary>
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>
/// Unauthenticated health probe endpoint for orchestrators and local dev coordination.
/// </summary>
internal sealed class HealthEndpoint : EndpointWithoutRequest<HealthResponse>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/health");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Service health probe";
            s.Description = "Returns the service health status and version identifier.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(new HealthResponse(), ct).ConfigureAwait(false);
    }
}
