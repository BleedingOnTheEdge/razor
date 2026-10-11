// -----------------------------------------------------------------------------
// <copyright file="MarketplaceService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Cloud.Events;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Manages the Razor extension marketplace: catalogue discovery, listings, licensing and acquisitions (002-010-001 § Razor Marketplace).
/// </summary>
internal sealed class MarketplaceService(
    IDbContextFactory<CloudDbContext> contextFactory,
    TimeProvider timeProvider,
    IClientEventBroadcaster? eventBroadcaster = null)
{
    /// <summary>
    /// Searches and filters marketplace catalogue items.
    /// </summary>
    /// <param name="kind">Optional slot kind filter.</param>
    /// <param name="query">Optional search text across name and description.</param>
    /// <param name="isCurated">Optional filter for Razor-curated items.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Matching catalogue items ordered by rating and downloads.</returns>
    public async Task<IReadOnlyList<MarketplaceItem>> SearchItemsAsync(
        ExtensionKind? kind = null,
        string? query = null,
        bool? isCurated = null,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        IQueryable<MarketplaceItem> q = db.MarketplaceItems;

        if (kind.HasValue)
        {
            q = q.Where(i => i.Kind == kind.Value);
        }

        if (isCurated.HasValue)
        {
            q = q.Where(i => i.IsCurated == isCurated.Value);
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            string pattern = $"%{query.Trim()}%";
            q = q.Where(i => EF.Functions.Like(i.Name, pattern) || (i.Description != null && EF.Functions.Like(i.Description, pattern)));
        }

        List<MarketplaceItem> items = await q.ToListAsync(cancellationToken).ConfigureAwait(false);
        return [.. items.OrderByDescending(i => i.Rating).ThenByDescending(i => i.Downloads)];
    }

    /// <summary>
    /// Retrieves a catalogue item by identifier.
    /// </summary>
    /// <param name="itemId">The item identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The catalogue item if found; otherwise <see langword="null"/>.</returns>
    public async Task<MarketplaceItem?> GetItemAsync(Guid itemId, CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        return await db.MarketplaceItems
            .FirstOrDefaultAsync(i => i.Id == itemId, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Publishes a new extension listing to the marketplace catalogue.
    /// </summary>
    /// <param name="name">The extension name.</param>
    /// <param name="kind">The extension slot kind.</param>
    /// <param name="version">The extension version.</param>
    /// <param name="author">The extension author.</param>
    /// <param name="description">The listing description.</param>
    /// <param name="price">The price (0 for free).</param>
    /// <param name="sdkVersion">The target SDK version compatibility.</param>
    /// <param name="isCurated">Whether the listing is curated.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created marketplace item.</returns>
    public async Task<MarketplaceItem> PublishItemAsync(
        string name,
        ExtensionKind kind,
        string version,
        string author,
        string description,
        decimal price,
        string sdkVersion,
        bool isCurated = false,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(author);

        using CloudDbContext db = contextFactory.CreateDbContext();

        DateTimeOffset now = timeProvider.GetUtcNow();
        var item = new MarketplaceItem
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Kind = kind,
            Version = string.IsNullOrWhiteSpace(version) ? "1.0.0" : version.Trim(),
            Author = author.Trim(),
            Description = description?.Trim() ?? string.Empty,
            Price = price < 0 ? 0 : price,
            SdkVersion = string.IsNullOrWhiteSpace(sdkVersion) ? "1.0.0" : sdkVersion.Trim(),
            IsCurated = isCurated,
            Downloads = 0,
            Rating = 5.0,
            CreatedAt = now
        };

        db.MarketplaceItems.Add(item);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        if (eventBroadcaster is not null)
        {
            await eventBroadcaster.PublishAsync(
                new ClientEvent("marketplace_item_published", null, null, null, now, new { item.Id, item.Name, item.Kind }),
                cancellationToken).ConfigureAwait(false);
        }

        return item;
    }

    /// <summary>
    /// Acquires an extension for an account, generating a licence key and recording distribution.
    /// </summary>
    /// <param name="itemId">The marketplace catalogue item identifier.</param>
    /// <param name="accountId">The acquiring account identifier.</param>
    /// <param name="targetInstanceId">Optional target engine instance for immediate deployment notification.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The acquisition record, or <see langword="null"/> if the item or account does not exist.</returns>
    public async Task<MarketplaceAcquisition?> AcquireItemAsync(
        Guid itemId,
        Guid accountId,
        Guid? targetInstanceId = null,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        MarketplaceItem? item = await db.MarketplaceItems
            .FirstOrDefaultAsync(i => i.Id == itemId, cancellationToken)
            .ConfigureAwait(false);

        if (item is null)
        {
            return null;
        }

        bool accountExists = await db.Accounts
            .AnyAsync(a => a.Id == accountId, cancellationToken)
            .ConfigureAwait(false);

        if (!accountExists)
        {
            return null;
        }

        // Check if already acquired
        MarketplaceAcquisition? existing = await db.MarketplaceAcquisitions
            .FirstOrDefaultAsync(a => a.MarketplaceItemId == itemId && a.AccountId == accountId, cancellationToken)
            .ConfigureAwait(false);

        if (existing is not null)
        {
            return existing;
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        item.Downloads++;

        var acquisition = new MarketplaceAcquisition
        {
            Id = Guid.NewGuid(),
            MarketplaceItemId = itemId,
            AccountId = accountId,
            EngineInstanceId = targetInstanceId,
            LicenseKey = $"MKPL-{Guid.NewGuid():N}"[..24].ToUpperInvariant(),
            AcquiredAt = now
        };

        db.MarketplaceAcquisitions.Add(acquisition);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        if (eventBroadcaster is not null)
        {
            await eventBroadcaster.PublishAsync(
                new ClientEvent(
                    "marketplace_acquired",
                    targetInstanceId,
                    null,
                    null,
                    now,
                    new { acquisition.Id, ItemId = itemId, AccountId = accountId, ItemName = item.Name }),
                cancellationToken).ConfigureAwait(false);
        }

        return acquisition;
    }

    /// <summary>
    /// Lists all extensions acquired by an account.
    /// </summary>
    /// <param name="accountId">The account identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The acquisitions recorded for the account.</returns>
    public async Task<IReadOnlyList<MarketplaceAcquisition>> GetAcquisitionsForAccountAsync(
        Guid accountId,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        List<MarketplaceAcquisition> acquisitions = await db.MarketplaceAcquisitions
            .Include(a => a.MarketplaceItem)
            .Where(a => a.AccountId == accountId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return [.. acquisitions.OrderByDescending(a => a.AcquiredAt)];
    }
}
