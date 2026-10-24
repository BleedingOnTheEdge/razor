// -----------------------------------------------------------------------------
// <copyright file="EngineRegistrationService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Registers a new Engine instance against an account and a licence, and issues its API key.
/// </summary>
/// <remarks>
/// Registration is where the fleet size is bounded: the licence records how many instances may exist, and
/// the count is enforced here rather than at authentication, so an over-quota deployment fails at
/// provisioning with a clear error instead of failing intermittently at connect time.
/// </remarks>
internal sealed partial class EngineRegistrationService(
    IDbContextFactory<CloudDbContext> contextFactory,
    TimeProvider timeProvider)
{
    /// <summary>
    /// Registers an instance and mints its API key.
    /// </summary>
    /// <param name="accountId">The account the instance belongs to.</param>
    /// <param name="licenseId">The licence the instance is registered against.</param>
    /// <param name="engineId">The stable identifier the Engine generates for itself.</param>
    /// <param name="name">The operator supplied display name.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The new instance and its API key, or the reason the request was refused.</returns>
    internal async Task<RegistrationOutcome> RegisterAsync(
        Guid accountId,
        Guid licenseId,
        string? engineId,
        string? name,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(engineId))
        {
            return new RegistrationOutcome(ServiceStatus.Rejected, "EngineId is required.", null, null);
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            return new RegistrationOutcome(ServiceStatus.Rejected, "Name is required.", null, null);
        }

        using CloudDbContext db = contextFactory.CreateDbContext();

        if (accountId == Guid.Empty)
        {
            Account? defaultAccount = await db.Accounts
                .FirstOrDefaultAsync(cancellationToken)
                .ConfigureAwait(false);
            if (defaultAccount is not null)
            {
                accountId = defaultAccount.Id;
            }
        }

        bool accountExists = await db.Accounts
            .AnyAsync(a => a.Id == accountId, cancellationToken)
            .ConfigureAwait(false);
        if (!accountExists)
        {
            return new RegistrationOutcome(ServiceStatus.NotFound, "No account with that identifier.", null, null);
        }

        License? license;
        if (licenseId != Guid.Empty)
        {
            license = await db.Licenses
                .FirstOrDefaultAsync(l => l.Id == licenseId, cancellationToken)
                .ConfigureAwait(false);
            if (license is null)
            {
                return new RegistrationOutcome(ServiceStatus.NotFound, "No licence with that identifier.", null, null);
            }

            if (license.AccountId != accountId)
            {
                return new RegistrationOutcome(
                    ServiceStatus.Rejected,
                    "The licence belongs to a different account.",
                    null,
                    null);
            }
        }
        else
        {
            license = await db.Licenses
                .FirstOrDefaultAsync(l => l.AccountId == accountId && l.Status == LicenseStatus.Active, cancellationToken)
                .ConfigureAwait(false);
            if (license is null)
            {
                license = new License
                {
                    Id = Guid.NewGuid(),
                    AccountId = accountId,
                    LicenseKey = $"LIC-{Guid.NewGuid():N}",
                    Status = LicenseStatus.Active,
                    IssuedAt = timeProvider.GetUtcNow(),
                    MaxInstances = 10
                };
                db.Licenses.Add(license);
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        if (!license.IsRunnableAt(now))
        {
            return new RegistrationOutcome(
                ServiceStatus.Rejected,
                "The licence is not active, so no further instances may be registered against it.",
                null,
                null);
        }

        string trimmedEngineId = engineId.Trim();
        bool engineIdTaken = await db.EngineInstances
            .AnyAsync(i => i.EngineId == trimmedEngineId, cancellationToken)
            .ConfigureAwait(false);
        if (engineIdTaken)
        {
            return new RegistrationOutcome(
                ServiceStatus.Rejected,
                "An instance with that EngineId is already registered.",
                null,
                null);
        }

        int registeredCount = await db.EngineInstances
            .CountAsync(i => i.LicenseId == license.Id, cancellationToken)
            .ConfigureAwait(false);
        if (registeredCount >= license.MaxInstances)
        {
            return new RegistrationOutcome(
                ServiceStatus.Rejected,
                $"The licence permits {license.MaxInstances} instance(s) and {registeredCount} are already registered.",
                null,
                null);
        }

        string apiKey = ApiKeyHasher.GenerateKey();
        var instance = new EngineInstance
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            LicenseId = license.Id,
            EngineId = trimmedEngineId,
            Name = name.Trim(),
            ApiKeyHash = ApiKeyHasher.Hash(apiKey),
            Status = EngineInstanceStatus.Active,
            CreatedAt = now,
            Profile = new EngineProfile { Id = Guid.NewGuid() }
        };

        db.EngineInstances.Add(instance);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new RegistrationOutcome(ServiceStatus.Succeeded, null, instance, apiKey);
    }

    /// <summary>
    /// Lists registered instances, optionally filtered by account and active shares.
    /// </summary>
    /// <param name="accountId">Optional account filter.</param>
    /// <param name="userId">Optional user ID filter for shared instances.</param>
    /// <param name="userEmail">Optional user email filter for shared instances.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The registered instances.</returns>
    internal async Task<IReadOnlyList<EngineInstance>> ListAsync(
        Guid? accountId = null,
        Guid? userId = null,
        string? userEmail = null,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        IQueryable<EngineInstance> query = db.EngineInstances
            .Include(i => i.Profile)
                .ThenInclude(p => p!.Selections)
            .Include(i => i.ManifestEntries);

        if (accountId is Guid accId)
        {
            DateTimeOffset now = timeProvider.GetUtcNow();
            var activeShares = await db.EngineShares
                .Where(s => !s.IsRevoked && s.CanRead)
                .ToListAsync(cancellationToken).ConfigureAwait(false);

            var sharedEngineIds = activeShares
                .Where(s => s.ExpiresAtUtc > now)
                .Where(s => (userId != null && s.SharedWithUserId == userId) ||
                            (!string.IsNullOrEmpty(userEmail) && s.SharedWithEmail == userEmail) ||
                            s.SharedWithUserId == accId)
                .Select(s => s.EngineInstanceId)
                .ToList();

            query = query.Where(i => i.AccountId == accId || sharedEngineIds.Contains(i.Id));
        }

        List<EngineInstance> instances = await query.ToListAsync(cancellationToken).ConfigureAwait(false);
        return [.. instances.OrderBy(i => i.Name)];
    }

    /// <summary>
    /// Creates a time-bounded sharing grant for an engine instance.
    /// </summary>
    internal async Task<EngineShare> CreateShareAsync(
        Guid instanceId,
        Guid ownerAccountId,
        string? sharedWithEmail,
        Guid? sharedWithUserId,
        DateTimeOffset expiresAtUtc,
        bool canRead = true,
        bool canControl = true,
        bool canRunFlows = true,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        var instance = await db.EngineInstances.FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken).ConfigureAwait(false);
        if (instance == null)
        {
            throw new KeyNotFoundException($"No engine instance found with ID {instanceId}");
        }

        if (ownerAccountId != Guid.Empty && instance.AccountId != ownerAccountId)
        {
            throw new UnauthorizedAccessException("Only the engine owner can share this instance.");
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        if (expiresAtUtc <= now)
        {
            throw new ArgumentException("Expiration date must be in the future.", nameof(expiresAtUtc));
        }

        var share = new EngineShare
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = instanceId,
            OwnerAccountId = instance.AccountId,
            SharedWithEmail = sharedWithEmail?.Trim() ?? string.Empty,
            SharedWithUserId = sharedWithUserId,
            CreatedAt = now,
            ExpiresAtUtc = expiresAtUtc,
            CanRead = canRead,
            CanControl = canControl,
            CanRunFlows = canRunFlows,
            IsRevoked = false
        };

        db.EngineShares.Add(share);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return share;
    }

    /// <summary>
    /// Lists active temporary shares for an engine instance.
    /// </summary>
    internal async Task<IReadOnlyList<EngineShare>> GetSharesAsync(Guid instanceId, CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();
        var shares = await db.EngineShares
            .Where(s => s.EngineInstanceId == instanceId && !s.IsRevoked)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return [.. shares.OrderByDescending(s => s.CreatedAt)];
    }

    /// <summary>
    /// Revokes an active engine share.
    /// </summary>
    internal async Task<bool> RevokeShareAsync(Guid shareId, Guid ownerAccountId, CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();
        var share = await db.EngineShares.FirstOrDefaultAsync(s => s.Id == shareId, cancellationToken).ConfigureAwait(false);
        if (share == null)
        {
            return false;
        }

        if (ownerAccountId != Guid.Empty && share.OwnerAccountId != ownerAccountId)
        {
            throw new UnauthorizedAccessException("Only the engine owner can revoke this share.");
        }

        share.IsRevoked = true;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    /// <summary>
    /// Validates whether a tenant/user has permission to perform an action on an engine.
    /// </summary>
    internal async Task<bool> CheckInstanceAccessAsync(
        Guid instanceId,
        Guid? accountId,
        Guid? userId,
        string? userEmail,
        string action,
        CancellationToken cancellationToken = default)
    {
        if (accountId is null && userId is null && string.IsNullOrEmpty(userEmail))
        {
            return true;
        }

        using CloudDbContext db = contextFactory.CreateDbContext();
        var instance = await db.EngineInstances.FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken).ConfigureAwait(false);
        if (instance == null)
        {
            return false;
        }

        if (accountId.HasValue && instance.AccountId == accountId.Value)
        {
            return true;
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        var candidateShares = await db.EngineShares
            .Where(s => s.EngineInstanceId == instanceId && !s.IsRevoked)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var share = candidateShares.FirstOrDefault(s =>
            s.ExpiresAtUtc > now &&
            ((userId != null && s.SharedWithUserId == userId) ||
             (!string.IsNullOrEmpty(userEmail) && s.SharedWithEmail == userEmail) ||
             (accountId != null && s.SharedWithUserId == accountId)));

        if (share == null)
        {
            return false;
        }

        return action switch
        {
            "Control" => share.CanControl,
            "RunFlows" => share.CanRunFlows,
            _ => share.CanRead
        };
    }
}
