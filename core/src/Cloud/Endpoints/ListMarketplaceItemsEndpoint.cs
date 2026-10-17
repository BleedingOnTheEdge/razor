// -----------------------------------------------------------------------------
// <copyright file="ListMarketplaceItemsEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// Query parameters for searching marketplace catalogue items.
/// </summary>
internal sealed class ListMarketplaceItemsRequest
{
    /// <summary>Gets or sets the optional slot kind filter.</summary>
    public ExtensionKind? Kind { get; set; }

    /// <summary>Gets or sets the optional search query keyword.</summary>
    public string? Query { get; set; }

    /// <summary>Gets or sets whether to filter by curated status.</summary>
    public bool? IsCurated { get; set; }

    /// <summary>Gets or sets the 1-based page number.</summary>
    public int? Page { get; set; }

    /// <summary>Gets or sets the page size.</summary>
    public int? PageSize { get; set; }
}

/// <summary>
/// A summary view of a marketplace catalogue item.
/// </summary>
internal sealed class MarketplaceItemView
{
    /// <summary>Gets or sets the unique item identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the extension name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the extension slot kind.</summary>
    public ExtensionKind Kind { get; set; }

    /// <summary>Gets or sets the version string.</summary>
    public string Version { get; set; } = string.Empty;

    /// <summary>Gets or sets the author name.</summary>
    public string Author { get; set; } = string.Empty;

    /// <summary>Gets or sets the description text.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Gets or sets the price in credits (0 for free).</summary>
    public decimal Price { get; set; }

    /// <summary>Gets or sets the minimum required SDK version.</summary>
    public string SdkVersion { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether this is an official curated extension.</summary>
    public bool IsCurated { get; set; }

    /// <summary>Gets or sets the download count.</summary>
    public int Downloads { get; set; }

    /// <summary>Gets the download count alias for frontend compatibility.</summary>
    public int DownloadsCount => Downloads;

    /// <summary>Gets or sets the average rating.</summary>
    public double Rating { get; set; }

    /// <summary>Gets or sets the listing creation date.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Creates a view model from an entity.</summary>
    /// <param name="entity">The entity.</param>
    /// <returns>The view model.</returns>
    public static MarketplaceItemView FromEntity(MarketplaceItem entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        return new MarketplaceItemView
        {
            Id = entity.Id,
            Name = entity.Name,
            Kind = entity.Kind,
            Version = entity.Version,
            Author = entity.Author,
            Description = entity.Description,
            Price = entity.Price,
            SdkVersion = entity.SdkVersion,
            IsCurated = entity.IsCurated,
            Downloads = entity.Downloads,
            Rating = entity.Rating,
            CreatedAt = entity.CreatedAt
        };
    }
}

/// <summary>
/// Searches and lists marketplace catalogue items.
/// </summary>
internal sealed class ListMarketplaceItemsEndpoint(MarketplaceService marketplace)
    : Endpoint<ListMarketplaceItemsRequest, object>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/marketplace/items");
        AllowAnonymous();
        Summary(summary =>
        {
            summary.Summary = "Search marketplace catalogue";
            summary.Description = "Returns extension listings matching optional slot kind, query keywords, or curated status with optional pagination.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ListMarketplaceItemsRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        IReadOnlyList<MarketplaceItem> items = await marketplace
            .SearchItemsAsync(request.Kind, request.Query, request.IsCurated, cancellationToken)
            .ConfigureAwait(false);

        List<MarketplaceItemView> views = [.. items.Select(MarketplaceItemView.FromEntity)];

        if (request.Page.HasValue || request.PageSize.HasValue)
        {
            var paged = PagedResult.Create(views, request.Page, request.PageSize);
            await Send.OkAsync(paged, cancellationToken).ConfigureAwait(false);
        }
        else
        {
            await Send.OkAsync(views, cancellationToken).ConfigureAwait(false);
        }
    }
}
