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

/// <summary>Represents an authentication session response.</summary>
internal sealed record AuthSessionResponse(
    string Token,
    UserProfileView User);

/// <summary>
/// Manages user authentication context, role assignments, and account subscription tiers.
/// </summary>
internal sealed class UserService(
    IDbContextFactory<CloudDbContext> contextFactory,
    CloudOptions options,
    TimeProvider timeProvider,
    Microsoft.AspNetCore.Identity.IPasswordHasher<User> passwordHasher)
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

            var license = new License
            {
                Id = Guid.NewGuid(),
                AccountId = account.Id,
                LicenseKey = $"LIC-{Guid.NewGuid():N}",
                Status = LicenseStatus.Active,
                IssuedAt = now,
                MaxInstances = 10
            };

            db.Accounts.Add(account);
            db.Users.Add(user);
            db.Licenses.Add(license);
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

    /// <summary>Authenticates a user with username and password.</summary>
    public async Task<AuthSessionResponse?> AuthenticateAsync(
        string userName,
        string password,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(userName);
        ArgumentNullException.ThrowIfNull(password);

        using CloudDbContext db = contextFactory.CreateDbContext();

        string name = userName.Trim();
        User? user = await db.Users
            .Include(u => u.Account)
            .FirstOrDefaultAsync(u => u.UserName == name, cancellationToken)
            .ConfigureAwait(false);

        // If user does not exist, auto-provision developer/operator in dev mode
        if (user is null)
        {
            UserRole defaultRole = name.Contains("admin", StringComparison.OrdinalIgnoreCase)
                ? UserRole.Admin
                : (name.Contains("trader", StringComparison.OrdinalIgnoreCase) ? UserRole.Trader : UserRole.Operator);
            user = await ProvisionUserInternalAsync(db, name, password, null, defaultRole, SubscriptionTier.Free, cancellationToken)
                .ConfigureAwait(false);
        }
        else
        {
            if (!string.IsNullOrEmpty(user.PasswordHash) && !user.PasswordHash.StartsWith("SHA256:DEMO_DEV_HASH", StringComparison.Ordinal))
            {
                var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
                if (result == Microsoft.AspNetCore.Identity.PasswordVerificationResult.Failed)
                {
                    return null;
                }
            }
        }

        string token = options.ManagementApiKey ?? "dev-cloud-management-key-3000";
        return new AuthSessionResponse(token, MapToView(user));
    }

    /// <summary>Registers a new user and account.</summary>
    public async Task<AuthSessionResponse> RegisterUserAsync(
        string userName,
        string password,
        string? accountName,
        UserRole role,
        SubscriptionTier tier,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(userName);
        ArgumentNullException.ThrowIfNull(password);

        using CloudDbContext db = contextFactory.CreateDbContext();

        string name = userName.Trim();
        bool exists = await db.Users.AnyAsync(u => u.UserName == name, cancellationToken).ConfigureAwait(false);
        if (exists)
        {
            throw new InvalidOperationException($"Username '{name}' is already registered.");
        }

        User user = await ProvisionUserInternalAsync(db, name, password, accountName, role, tier, cancellationToken)
            .ConfigureAwait(false);
        string token = options.ManagementApiKey ?? "dev-cloud-management-key-3000";
        return new AuthSessionResponse(token, MapToView(user));
    }

    private async Task<User> ProvisionUserInternalAsync(
        CloudDbContext db,
        string name,
        string password,
        string? accountName,
        UserRole role,
        SubscriptionTier tier,
        CancellationToken cancellationToken)
    {
        DateTimeOffset now = timeProvider.GetUtcNow();
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Name = string.IsNullOrWhiteSpace(accountName) ? $"{name}-Workspace" : accountName.Trim(),
            SubscriptionTier = tier,
            CreatedAt = now
        };

        var user = new User
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            Account = account,
            UserName = name,
            Role = role,
            CreatedAt = now,
            IsActive = true
        };

        user.PasswordHash = passwordHasher.HashPassword(user, password);

        var license = new License
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            LicenseKey = $"LIC-{Guid.NewGuid():N}",
            Status = LicenseStatus.Active,
            IssuedAt = now,
            MaxInstances = tier switch
            {
                SubscriptionTier.Free => 1,
                SubscriptionTier.Pro => 5,
                SubscriptionTier.Enterprise => 999,
                _ => 1
            }
        };

        db.Accounts.Add(account);
        db.Users.Add(user);
        db.Licenses.Add(license);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return user;
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
