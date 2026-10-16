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

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return MapToView(user);
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
