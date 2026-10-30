// -----------------------------------------------------------------------------
// <copyright file="GetInstanceManifestEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for an instance's reported manifest.
/// </summary>
internal sealed class GetInstanceManifestRequest
{
    /// <summary>Gets or sets the instance identifier.</summary>
    public Guid InstanceId { get; set; }
}

/// <summary>
/// Returns the extension catalogue reported by an Engine instance.
/// </summary>
internal sealed class GetInstanceManifestEndpoint(ProfileService profiles)
    : Endpoint<GetInstanceManifestRequest, IReadOnlyList<ManifestEntryView>>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/instances/{instanceId}/manifest", "/api/engines/{instanceId}/manifest");
        Summary(summary =>
        {
            summary.Summary = "Get an Engine instance's reported manifest";
            summary.Description = "Returns the extension catalogue reported by the instance during its manifest handshakes.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetInstanceManifestRequest request, CancellationToken cancellationToken)
    {
        InstanceStateSnapshot? snapshot = await profiles
            .GetInstanceStateAsync(request.InstanceId, cancellationToken)
            .ConfigureAwait(false);

        if (snapshot is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        List<ManifestEntryView> entries = [.. snapshot.Manifest.Select(m => new ManifestEntryView
        {
            Kind = m.Kind,
            Name = m.Name,
            ReportedAt = m.ReportedAt
        })];

        await Send.OkAsync(entries, cancellationToken).ConfigureAwait(false);
    }
}
