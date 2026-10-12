// -----------------------------------------------------------------------------
// <copyright file="SubmitMarketplaceReviewEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;
using Microsoft.AspNetCore.Http;

/// <summary>
/// Request to submit an operator review and star rating for a marketplace item.
/// </summary>
internal sealed class SubmitMarketplaceReviewRequest
{
    /// <summary>Gets or sets the item identifier.</summary>
    public Guid ItemId { get; set; }

    /// <summary>Gets or sets the reviewing operator or firm display name.</summary>
    public string Author { get; set; } = string.Empty;

    /// <summary>Gets or sets the rating from 1.0 to 5.0.</summary>
    public double Rating { get; set; } = 5.0;

    /// <summary>Gets or sets the optional review comments.</summary>
    public string? Comment { get; set; }
}

/// <summary>
/// Response returned after successfully submitting a review.
/// </summary>
internal sealed class SubmitMarketplaceReviewResponseView
{
    /// <summary>Gets or sets the item identifier.</summary>
    public Guid ItemId { get; set; }

    /// <summary>Gets or sets the updated cumulative rating.</summary>
    public double NewRating { get; set; }

    /// <summary>Gets or sets the confirmation message.</summary>
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Submits an operator review and updates the cumulative rating of a marketplace item.
/// </summary>
internal sealed class SubmitMarketplaceReviewEndpoint(MarketplaceService marketplace)
    : Endpoint<SubmitMarketplaceReviewRequest, SubmitMarketplaceReviewResponseView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/marketplace/items/{itemId}/reviews");
        Summary(summary =>
        {
            summary.Summary = "Submit marketplace item review";
            summary.Description = "Submits an operator review and rating for an extension, updating its rating score.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(SubmitMarketplaceReviewRequest request, CancellationToken cancellationToken)
    {
        MarketplaceItem? item = await marketplace
            .SubmitRatingAsync(request.ItemId, request.Rating, cancellationToken)
            .ConfigureAwait(false);

        if (item is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        var response = new SubmitMarketplaceReviewResponseView
        {
            ItemId = item.Id,
            NewRating = item.Rating,
            Message = "Review submitted successfully."
        };

        await Send.ResponseAsync(response, StatusCodes.Status200OK, cancellationToken).ConfigureAwait(false);
    }
}
