// -----------------------------------------------------------------------------
// <copyright file="BundleService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using System.Security.Cryptography;
using System.Text;
using Cloud.Data;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Domain service governing trading bundles, component slot associations, snapshots, and attached DNAs.
/// </summary>
internal sealed class BundleService(
    IDbContextFactory<CloudDbContext> contextFactory,
    TimeProvider timeProvider)
{
    private static readonly char[] IdChars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ".ToCharArray();

    /// <summary>Generates a random unique 8-12 character alphanumeric bundle identifier.</summary>
    public static string GenerateBundleId(int length = 10)
    {
        var clamped = Math.Clamp(length, 8, 12);
        var bytes = RandomNumberGenerator.GetBytes(clamped);
        var sb = new StringBuilder(clamped);
        for (var i = 0; i < clamped; i++)
        {
            sb.Append(IdChars[bytes[i] % IdChars.Length]);
        }

        return sb.ToString();
    }

    /// <summary>Lists trading bundles filtered by account, publicity, or search term.</summary>
    public async Task<IReadOnlyList<TradingBundle>> GetBundlesAsync(
        Guid? accountId = null,
        bool? isPublic = null,
        string? search = null,
        CancellationToken ct = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        IQueryable<TradingBundle> q = db.TradingBundles
            .Include(b => b.Snapshots)
                .ThenInclude(s => s.Dnas)
            .AsNoTracking();

        if (accountId.HasValue && accountId.Value != Guid.Empty)
        {
            q = q.Where(b => b.AccountId == accountId.Value || b.IsPublic);
        }
        else if (isPublic.HasValue)
        {
            q = q.Where(b => b.IsPublic == isPublic.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            q = q.Where(b => EF.Functions.Like(b.Name, pattern) || EF.Functions.Like(b.Id, pattern) || EF.Functions.Like(b.Description, pattern));
        }

        var results = await q.ToListAsync(ct).ConfigureAwait(false);
        return results.OrderByDescending(b => b.UpdatedAt).ToList();
    }

    /// <summary>Retrieves a trading bundle by its unique identifier.</summary>
    public async Task<TradingBundle?> GetBundleByIdAsync(string bundleId, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(bundleId);

        using CloudDbContext db = contextFactory.CreateDbContext();
        return await db.TradingBundles
            .Include(b => b.Snapshots)
                .ThenInclude(s => s.Dnas)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == bundleId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>Creates a new trading bundle with an auto-generated or specified unique identifier.</summary>
    public async Task<TradingBundle> CreateBundleAsync(TradingBundle bundle, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(bundle);

        using CloudDbContext db = contextFactory.CreateDbContext();

        if (string.IsNullOrWhiteSpace(bundle.Id))
        {
            bundle.Id = GenerateBundleId();
        }

        // Ensure uniqueness
        var attempts = 0;
        while (await db.TradingBundles.AnyAsync(b => b.Id == bundle.Id, ct).ConfigureAwait(false))
        {
            bundle.Id = GenerateBundleId();
            if (++attempts > 10)
            {
                throw new InvalidOperationException("Failed to generate a unique bundle identifier after 10 attempts.");
            }
        }

        var now = timeProvider.GetUtcNow();
        bundle.CreatedAt = now;
        bundle.UpdatedAt = now;

        db.TradingBundles.Add(bundle);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);

        return bundle;
    }

    /// <summary>Updates an existing trading bundle's metadata, slots, and default configurations.</summary>
    public async Task<TradingBundle?> UpdateBundleAsync(string bundleId, TradingBundle update, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(bundleId);
        ArgumentNullException.ThrowIfNull(update);

        using CloudDbContext db = contextFactory.CreateDbContext();

        var existing = await db.TradingBundles.FirstOrDefaultAsync(b => b.Id == bundleId, ct).ConfigureAwait(false);
        if (existing is null)
        {
            return null;
        }

        existing.Name = update.Name;
        existing.Description = update.Description;
        existing.DocumentationMarkdown = update.DocumentationMarkdown;
        existing.IsPublic = update.IsPublic;
        existing.PublishedToMarketplace = update.PublishedToMarketplace;
        existing.Price = update.Price;
        existing.Currency = update.Currency;
        existing.StrategySlotId = update.StrategySlotId;
        existing.AdapterSlotIdsJson = update.AdapterSlotIdsJson;
        existing.HookSlotIdsJson = update.HookSlotIdsJson;
        existing.DefaultConfigurationsJson = update.DefaultConfigurationsJson;
        existing.UpdatedAt = timeProvider.GetUtcNow();

        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return existing;
    }

    /// <summary>Deletes a trading bundle and its cascading snapshots.</summary>
    public async Task<bool> DeleteBundleAsync(string bundleId, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(bundleId);

        using CloudDbContext db = contextFactory.CreateDbContext();

        var existing = await db.TradingBundles.FirstOrDefaultAsync(b => b.Id == bundleId, ct).ConfigureAwait(false);
        if (existing is null)
        {
            return false;
        }

        db.TradingBundles.Remove(existing);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return true;
    }

    /// <summary>Creates a state-of-change snapshot for a bundle capturing slots, hooks, and parameter states.</summary>
    public async Task<BundleSnapshot?> CreateSnapshotAsync(
        string bundleId,
        string version,
        string name,
        string snapshotStateJson,
        CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(bundleId);

        using CloudDbContext db = contextFactory.CreateDbContext();

        var bundle = await db.TradingBundles.FirstOrDefaultAsync(b => b.Id == bundleId, ct).ConfigureAwait(false);
        if (bundle is null)
        {
            return null;
        }

        var snapshot = new BundleSnapshot
        {
            Id = Guid.NewGuid(),
            BundleId = bundleId,
            Version = string.IsNullOrWhiteSpace(version) ? $"v1.{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}" : version.Trim(),
            Name = string.IsNullOrWhiteSpace(name) ? $"Snapshot {DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm}" : name.Trim(),
            SnapshotStateJson = string.IsNullOrWhiteSpace(snapshotStateJson) ? bundle.DefaultConfigurationsJson : snapshotStateJson,
            CreatedAt = timeProvider.GetUtcNow()
        };

        db.BundleSnapshots.Add(snapshot);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return snapshot;
    }

    /// <summary>Attaches a verified backtest DNA with status badges to a bundle snapshot.</summary>
    public async Task<BundleDna?> AttachDnaToSnapshotAsync(Guid snapshotId, BundleDna dna, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dna);

        using CloudDbContext db = contextFactory.CreateDbContext();

        var snapshot = await db.BundleSnapshots.FirstOrDefaultAsync(s => s.Id == snapshotId, ct).ConfigureAwait(false);
        if (snapshot is null)
        {
            return null;
        }

        dna.Id = Guid.NewGuid();
        dna.BundleSnapshotId = snapshotId;
        dna.CreatedAt = timeProvider.GetUtcNow();

        db.BundleDnas.Add(dna);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return dna;
    }
}
