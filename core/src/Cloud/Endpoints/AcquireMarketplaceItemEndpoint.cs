// -----------------------------------------------------------------------------
// <copyright file="AcquireMarketplaceItemEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;
using Microsoft.AspNetCore.Http;

/// <summary>
/// Request to acquire an extension license from the marketplace.
/// </summary>
internal sealed class AcquireMarketplaceItemRequest
{
    /// <summary>Gets or sets the marketplace item identifier.</summary>
    public Guid ItemId { get; set; }

    /// <summary>Gets or sets the acquiring account identifier.</summary>
    public Guid AccountId { get; set; }

    /// <summary>Gets or sets an optional target engine instance for immediate deployment.</summary>
    public Guid? TargetInstanceId { get; set; }
}

/// <summary>
/// Result view of an acquisition.
/// </summary>
internal sealed class AcquisitionResponseView
{
    /// <summary>Gets or sets the acquisition identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the catalogue item identifier.</summary>
    public Guid ItemId { get; set; }

    /// <summary>Gets or sets the acquiring account identifier.</summary>
    public Guid AccountId { get; set; }

    /// <summary>Gets or sets the generated license key.</summary>
    public string LicenseKey { get; set; } = string.Empty;

    /// <summary>Gets or sets the acquisition timestamp.</summary>
    public DateTimeOffset AcquiredAt { get; set; }
}

/// <summary>
/// Acquires a marketplace extension license for an account.
/// </summary>
internal sealed class AcquireMarketplaceItemEndpoint(MarketplaceService marketplace)
    : Endpoint<AcquireMarketplaceItemRequest, AcquisitionResponseView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/marketplace/items/{itemId}/acquire");
        Summary(summary =>
        {
            summary.Summary = "Acquire marketplace extension";
            summary.Description = "Acquires an extension license for an account, generating a unique license key and distribution record.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(AcquireMarketplaceItemRequest request, CancellationToken cancellationToken)
    {
        MarketplaceAcquisition? acquisition = await marketplace
            .AcquireItemAsync(request.ItemId, request.AccountId, request.TargetInstanceId, cancellationToken)
            .ConfigureAwait(false);

        if (acquisition is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        var response = new AcquisitionResponseView
        {
            Id = acquisition.Id,
            ItemId = acquisition.MarketplaceItemId,
            AccountId = acquisition.AccountId,
            LicenseKey = acquisition.LicenseKey,
            AcquiredAt = acquisition.AcquiredAt
        };

        await Send.ResponseAsync(response, StatusCodes.Status201Created, cancellationToken).ConfigureAwait(false);
    }
}
