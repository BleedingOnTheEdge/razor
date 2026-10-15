// -----------------------------------------------------------------------------
// <copyright file="GetMarketplaceItemEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// Request to retrieve a marketplace item by identifier.
/// </summary>
internal sealed class GetMarketplaceItemRequest
{
    /// <summary>Gets or sets the item identifier.</summary>
    public Guid ItemId { get; set; }
}

/// <summary>
/// Retrieves details of a single marketplace catalogue item.
/// </summary>
internal sealed class GetMarketplaceItemEndpoint(MarketplaceService marketplace)
    : Endpoint<GetMarketplaceItemRequest, MarketplaceItemView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/marketplace/items/{itemId}");
        AllowAnonymous();
        Summary(summary =>
        {
            summary.Summary = "Get marketplace item details";
            summary.Description = "Returns details, price, compatibility, and author information for a marketplace extension.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetMarketplaceItemRequest request, CancellationToken cancellationToken)
    {
        MarketplaceItem? item = await marketplace
            .GetItemAsync(request.ItemId, cancellationToken)
            .ConfigureAwait(false);

        if (item is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(MarketplaceItemView.FromEntity(item), cancellationToken).ConfigureAwait(false);
    }
}
