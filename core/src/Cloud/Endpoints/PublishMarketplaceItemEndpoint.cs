// -----------------------------------------------------------------------------
// <copyright file="PublishMarketplaceItemEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;
using Microsoft.AspNetCore.Http;

/// <summary>
/// Request payload for publishing a new extension manifest to the marketplace catalogue.
/// </summary>
internal sealed class PublishMarketplaceItemRequest
{
    /// <summary>Gets or sets the extension display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the extension slot kind.</summary>
    public ExtensionKind Kind { get; set; }

    /// <summary>Gets or sets the extension semantic version.</summary>
    public string Version { get; set; } = "1.0.0";

    /// <summary>Gets or sets the author or publisher name.</summary>
    public string Author { get; set; } = string.Empty;

    /// <summary>Gets or sets the extension description.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Gets or sets the listing price in credits (0 for free).</summary>
    public decimal Price { get; set; }

    /// <summary>Gets or sets the minimum required SDK version.</summary>
    public string SdkVersion { get; set; } = "1.0.0";

    /// <summary>Gets or sets a value indicating whether this is an official curated listing.</summary>
    public bool IsCurated { get; set; }
}

/// <summary>
/// Publishes a new extension manifest to the marketplace catalogue.
/// </summary>
internal sealed class PublishMarketplaceItemEndpoint(MarketplaceService marketplace)
    : Endpoint<PublishMarketplaceItemRequest, MarketplaceItemView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/marketplace/items");
        Summary(summary =>
        {
            summary.Summary = "Publish extension manifest";
            summary.Description = "Validates and publishes a new extension manifest to the public marketplace catalogue.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(PublishMarketplaceItemRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Author))
        {
            ThrowError("Name and Author are required fields.");
            return;
        }

        MarketplaceItem item = await marketplace.PublishItemAsync(
            request.Name,
            request.Kind,
            request.Version,
            request.Author,
            request.Description,
            request.Price,
            request.SdkVersion,
            request.IsCurated,
            cancellationToken).ConfigureAwait(false);

        await Send.ResponseAsync(MarketplaceItemView.FromEntity(item), StatusCodes.Status201Created, cancellationToken).ConfigureAwait(false);
    }
}
