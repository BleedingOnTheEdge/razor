// -----------------------------------------------------------------------------
// <copyright file="EngineRegistrationService.Management.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Microsoft.EntityFrameworkCore;

internal sealed partial class EngineRegistrationService
{
    /// <summary>
    /// Updates the display name or administrative status of an Engine instance.
    /// </summary>
    internal async Task<EngineInstance?> UpdateAsync(
        Guid instanceId,
        string? name,
        EngineInstanceStatus? status,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        EngineInstance? instance = await db.EngineInstances
            .Include(i => i.Profile)
            .FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken)
            .ConfigureAwait(false);

        if (instance is null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(name))
        {
            instance.Name = name.Trim();
        }

        if (status.HasValue)
        {
            instance.Status = status.Value;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return instance;
    }

    /// <summary>
    /// Rotates the API key of an Engine instance, invalidating previous credentials immediately.
    /// </summary>
    internal async Task<(EngineInstance? Instance, string? NewApiKey)> RotateApiKeyAsync(
        Guid instanceId,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        EngineInstance? instance = await db.EngineInstances
            .FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken)
            .ConfigureAwait(false);

        if (instance is null)
        {
            return (null, null);
        }

        string newApiKey = ApiKeyHasher.GenerateKey();
        instance.ApiKeyHash = ApiKeyHasher.Hash(newApiKey);

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return (instance, newApiKey);
    }

    /// <summary>
    /// Revokes an Engine instance's credentials and bars it from the cluster.
    /// </summary>
    internal async Task<bool> RevokeAsync(
        Guid instanceId,
        string? reason = null,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        EngineInstance? instance = await db.EngineInstances
            .FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken)
            .ConfigureAwait(false);

        if (instance is null)
        {
            return false;
        }

        instance.Status = EngineInstanceStatus.Banned;
        // Invalidate hash so no authentication can succeed
        instance.ApiKeyHash = $"REVOKED:{Guid.NewGuid():N}";

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    /// <summary>
    /// Decommissions and permanently removes an Engine instance from the cluster.
    /// </summary>
    internal async Task<bool> DeleteAsync(
        Guid instanceId,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        EngineInstance? instance = await db.EngineInstances
            .Include(i => i.Profile)
            .FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken)
            .ConfigureAwait(false);

        if (instance is null)
        {
            return false;
        }

        db.EngineInstances.Remove(instance);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }
}
