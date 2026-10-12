// -----------------------------------------------------------------------------
// <copyright file="UserService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Microsoft.EntityFrameworkCore;

/// <summary>Represents a user profile with role and subscription details.</summary>
internal sealed record UserProfileView(
    Guid UserId,
    Guid AccountId,
    string UserName,
    string AccountName,
    UserRole Role,
    SubscriptionTier SubscriptionTier,
    int MaxInstances,
    bool CanManageFleet,
    bool CanExecuteLive,
    bool CanPublishMarketplace,
    DateTimeOffset CreatedAt);

/// <summary>
/// Manages user authentication context, role assignments, and account subscription tiers.
/// </summary>
internal sealed class UserService(
    IDbContextFactory<CloudDbContext> contextFactory,
    TimeProvider timeProvider)
{
    /// <summary>Retrieves or seeds the default active user profile.</summary>
    public async Task<UserProfileView> GetOrCreateDefaultUserAsync(
        string? preferredUserName = null,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        string name = string.IsNullOrWhiteSpace(preferredUserName) ? "dev-operator" : preferredUserName.Trim();

        User? user = await db.Users
            .Include(u => u.Account)
            .FirstOrDefaultAsync(u => u.UserName == name, cancellationToken)
            .ConfigureAwait(false);

        if (user is null)
        {
            DateTimeOffset now = timeProvider.GetUtcNow();
            var account = new Account
            {
                Id = Guid.NewGuid(),
                Name = $"{name}-Workspace",
                SubscriptionTier = SubscriptionTier.Free,
                CreatedAt = now
            };

            user = new User
            {
                Id = Guid.NewGuid(),
                AccountId = account.Id,
                Account = account,
                UserName = name,
                PasswordHash = "SHA256:DEMO_DEV_HASH",
                Role = name.Contains("admin", StringComparison.OrdinalIgnoreCase) ? UserRole.Admin : UserRole.Developer,
                CreatedAt = now,
                IsActive = true
            };

            db.Accounts.Add(account);
            db.Users.Add(user);
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        return MapToView(user);
    }

    /// <summary>Upgrades the subscription tier of an account.</summary>
    public async Task<UserProfileView?> UpgradeSubscriptionAsync(
        Guid accountId,
        SubscriptionTier targetTier,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        Account? account = await db.Accounts
            .Include(a => a.Users)
            .FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken)
            .ConfigureAwait(false);

        if (account is null)
        {
            return null;
        }

        account.SubscriptionTier = targetTier;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        User? user = account.Users.FirstOrDefault() ?? await db.Users
            .FirstOrDefaultAsync(u => u.AccountId == accountId, cancellationToken)
            .ConfigureAwait(false);
        if (user is null)
        {
            return null;
        }

        user.Account = account;
        return MapToView(user);
    }

    private static UserProfileView MapToView(User user)
    {
        Account acc = user.Account ?? new Account { Id = user.AccountId, Name = "Workspace", SubscriptionTier = SubscriptionTier.Free };
        SubscriptionTier tier = acc.SubscriptionTier;

        int maxInstances = tier switch
        {
            SubscriptionTier.Free => 1,
            SubscriptionTier.Pro => 5,
            SubscriptionTier.Enterprise => 999,
            _ => 1
        };

        bool canManageFleet = user.Role is UserRole.Admin or UserRole.Operator;
        bool canExecuteLive = tier is SubscriptionTier.Pro or SubscriptionTier.Enterprise;
        bool canPublishMarketplace = user.Role is UserRole.Admin or UserRole.Developer;

        return new UserProfileView(
            user.Id,
            acc.Id,
            user.UserName,
            acc.Name,
            user.Role,
            tier,
            maxInstances,
            canManageFleet,
            canExecuteLive,
            canPublishMarketplace,
            user.CreatedAt);
    }
}
