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
internal sealed class EngineRegistrationService(
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

        bool accountExists = await db.Accounts
            .AnyAsync(a => a.Id == accountId, cancellationToken)
            .ConfigureAwait(false);
        if (!accountExists)
        {
            return new RegistrationOutcome(ServiceStatus.NotFound, "No account with that identifier.", null, null);
        }

        License? license = await db.Licenses
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
            .CountAsync(i => i.LicenseId == licenseId, cancellationToken)
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
            LicenseId = licenseId,
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
}
