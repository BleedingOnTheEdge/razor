// -----------------------------------------------------------------------------
// <copyright file="UserService.Admin.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Microsoft.EntityFrameworkCore;

internal sealed partial class UserService
{
    /// <summary>
    /// Gets a user profile by user identifier.
    /// </summary>
    public async Task<UserProfileView?> GetUserByIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        User? user = await db.Users
            .Include(u => u.Account)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            .ConfigureAwait(false);

        return user is null ? null : MapToView(user);
    }

    /// <summary>
    /// Gets a user profile by username.
    /// </summary>
    public async Task<UserProfileView?> GetUserByUsernameAsync(string userName, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userName);

        using CloudDbContext db = contextFactory.CreateDbContext();

        User? user = await db.Users
            .Include(u => u.Account)
            .FirstOrDefaultAsync(u => u.UserName == userName.Trim(), cancellationToken)
            .ConfigureAwait(false);

        return user is null ? null : MapToView(user);
    }

    /// <summary>
    /// Updates the profile information of a user.
    /// </summary>
    public async Task<UserProfileView?> UpdateProfileAsync(
        Guid userId,
        string? displayName,
        string? email,
        string? avatarUrl,
        string? bio,
        string? phoneCountryCode = null,
        string? phoneNumber = null,
        string? secondaryEmail = null,
        bool? twoFactorEnabled = null,
        string? telegramHandle = null,
        bool? googleDriveLinked = null,
        bool? oneDriveLinked = null,
        bool? smsOtpEnabled = null,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        User? user = await db.Users
            .Include(u => u.Account)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            .ConfigureAwait(false);

        if (user is null)
        {
            return null;
        }

        if (displayName is not null)
        {
            user.DisplayName = string.IsNullOrWhiteSpace(displayName) ? null : displayName.Trim();
        }

        if (email is not null)
        {
            user.Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        }

        if (avatarUrl is not null)
        {
            user.AvatarUrl = string.IsNullOrWhiteSpace(avatarUrl) ? null : avatarUrl.Trim();
        }

        if (bio is not null)
        {
            user.Bio = string.IsNullOrWhiteSpace(bio) ? null : bio.Trim();
        }

        if (phoneCountryCode is not null)
        {
            user.PhoneCountryCode = string.IsNullOrWhiteSpace(phoneCountryCode) ? null : phoneCountryCode.Trim();
        }

        if (phoneNumber is not null)
        {
            user.PhoneNumber = string.IsNullOrWhiteSpace(phoneNumber) ? null : phoneNumber.Trim();
        }

        if (secondaryEmail is not null)
        {
            user.SecondaryEmail = string.IsNullOrWhiteSpace(secondaryEmail) ? null : secondaryEmail.Trim();
        }

        if (twoFactorEnabled.HasValue)
        {
            user.TwoFactorEnabled = twoFactorEnabled.Value;
        }

        if (telegramHandle is not null)
        {
            user.TelegramHandle = string.IsNullOrWhiteSpace(telegramHandle) ? null : telegramHandle.Trim();
        }

        if (googleDriveLinked.HasValue)
        {
            user.GoogleDriveLinked = googleDriveLinked.Value;
        }

        if (oneDriveLinked.HasValue)
        {
            user.OneDriveLinked = oneDriveLinked.Value;
        }

        if (smsOtpEnabled.HasValue)
        {
            user.SmsOtpEnabled = smsOtpEnabled.Value;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return MapToView(user);
    }

    /// <summary>
    /// Updates a user's subscription tier and syncs license limits.
    /// </summary>
    public async Task<UserProfileView?> UpdateUserSubscriptionAsync(
        Guid userId,
        SubscriptionTier tier,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        User? user = await db.Users
            .Include(u => u.Account)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            .ConfigureAwait(false);

        if (user is null || user.Account is null)
        {
            return null;
        }

        user.Account.SubscriptionTier = tier;

        List<License> licenses = await db.Licenses
            .Where(l => l.AccountId == user.AccountId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        int maxInst = tier switch
        {
            SubscriptionTier.Free => 1,
            SubscriptionTier.Pro => 5,
            _ => 50
        };

        foreach (License lic in licenses)
        {
            lic.MaxInstances = maxInst;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return MapToView(user);
    }

    /// <summary>
    /// Resets a user's login password.
    /// </summary>
    public async Task<bool> ResetUserPasswordAsync(
        Guid userId,
        string newPassword,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        User? user = await db.Users
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            .ConfigureAwait(false);

        if (user is null)
        {
            return false;
        }

        user.PasswordHash = passwordHasher.HashPassword(user, newPassword);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    /// <summary>
    /// Creates a scoped impersonation session for administrators or operators.
    /// </summary>
    public async Task<AuthSessionResponse?> CreateImpersonationSessionAsync(
        Guid actorUserId,
        Guid targetUserId,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        User? actor = await db.Users.FirstOrDefaultAsync(u => u.Id == actorUserId, cancellationToken).ConfigureAwait(false);
        User? target = await db.Users.Include(u => u.Account).FirstOrDefaultAsync(u => u.Id == targetUserId, cancellationToken).ConfigureAwait(false);

        if (actor is null || target is null)
        {
            return null;
        }

        if (actor.Role is not (UserRole.SuperAdmin or UserRole.Admin or UserRole.Operator))
        {
            throw new UnauthorizedAccessException("Only Administrators and Operators can impersonate users.");
        }

        bool isOperator = actor.Role == UserRole.Operator;

        UserProfileView baseView = MapToView(target);
        UserProfileView impersonatedView = baseView with
        {
            IsImpersonating = true,
            ImpersonatedBy = actor.UserName,
            IsOperatorRestricted = isOperator,
            CanExecuteLive = !isOperator && baseView.CanExecuteLive
        };

        string token = $"impersonate:{actor.Id}:{target.Id}:{options.ManagementApiKey ?? "dev-cloud-management-key-3000"}";
        return new AuthSessionResponse(token, impersonatedView);
    }

    /// <summary>
    /// Lists all users with optional filtering for administrators.
    /// </summary>
    public async Task<IReadOnlyList<UserProfileView>> ListAllUsersAsync(
        string? search = null,
        UserRole? role = null,
        SubscriptionTier? tier = null,
        int skip = 0,
        int take = 100,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        IQueryable<User> query = db.Users.Include(u => u.Account).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            string s = search.Trim();
            query = query.Where(u => u.UserName.Contains(s)
                || (u.Email != null && u.Email.Contains(s))
                || (u.DisplayName != null && u.DisplayName.Contains(s)));
        }

        if (role.HasValue)
        {
            query = query.Where(u => u.Role == role.Value);
        }

        if (tier.HasValue)
        {
            query = query.Where(u => u.Account != null && u.Account.SubscriptionTier == tier.Value);
        }

        List<User> users = await query
            .OrderBy(u => u.Role)
            .ThenBy(u => u.UserName)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return users.Select(MapToView).ToList();
    }

    /// <summary>
    /// Updates a user's role (e.g. elevating to Operator or demoting to Trader).
    /// </summary>
    public async Task<UserProfileView?> UpdateUserRoleAsync(
        Guid userId,
        UserRole newRole,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        User? user = await db.Users
            .Include(u => u.Account)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            .ConfigureAwait(false);

        if (user is null)
        {
            return null;
        }

        user.Role = newRole;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return MapToView(user);
    }

    /// <summary>
    /// Toggles a user's active status (e.g. suspending or reactivating).
    /// </summary>
    public async Task<UserProfileView?> UpdateUserStatusAsync(
        Guid userId,
        bool isActive,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        User? user = await db.Users
            .Include(u => u.Account)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            .ConfigureAwait(false);

        if (user is null)
        {
            return null;
        }

        user.IsActive = isActive;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return MapToView(user);
    }

    /// <summary>
    /// Permanently deletes a user and cascades to their account if unshared.
    /// </summary>
    public async Task<bool> DeleteUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        User? user = await db.Users
            .Include(u => u.Account)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            .ConfigureAwait(false);

        if (user is null)
        {
            return false;
        }

        // Prevent deleting superadmin accounts
        if (user.Role == UserRole.SuperAdmin)
        {
            throw new InvalidOperationException("SuperAdmin accounts cannot be deleted.");
        }

        db.Users.Remove(user);
        if (user.Account is not null)
        {
            bool hasOtherUsers = await db.Users
                .AnyAsync(u => u.AccountId == user.AccountId && u.Id != userId, cancellationToken)
                .ConfigureAwait(false);

            if (!hasOtherUsers)
            {
                db.Accounts.Remove(user.Account);
            }
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }
}
