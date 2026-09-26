// -----------------------------------------------------------------------------
// <copyright file="CloudTestDatabase.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests.TestSupport;

using Cloud.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// An in-memory SQLite database behind the real <see cref="CloudDbContext"/>, used as the store for the
/// behavioural tests.
/// </summary>
/// <remarks>
/// The context factory contract is implemented directly so the database can be handed to the Cloud services
/// exactly as the composition root would hand them a factory. The connection is kept open for the lifetime
/// of the instance because an in-memory SQLite database exists only while a connection to it does.
/// </remarks>
internal sealed class CloudTestDatabase : IDbContextFactory<CloudDbContext>, IDisposable
{
    /// <summary>The password the seeded user is created with.</summary>
    internal const string Password = "correct-horse-battery-staple";

    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<CloudDbContext> _options;
    private bool _disposed;

    /// <summary>Initialises a new instance of the <see cref="CloudTestDatabase"/> class.</summary>
    internal CloudTestDatabase()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<CloudDbContext>().UseSqlite(_connection).Options;

        using CloudDbContext context = CreateDbContext();
        context.Database.EnsureCreated();
    }

    /// <inheritdoc/>
    public CloudDbContext CreateDbContext() => new(_options);

    /// <summary>
    /// Creates an account with an owner user and a licence.
    /// </summary>
    /// <param name="userName">The user name to create.</param>
    /// <param name="licenseStatus">The licence state.</param>
    /// <param name="maxInstances">The licence's instance quota.</param>
    /// <param name="expiresAt">The licence expiry, when it has one.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The identifiers of the created rows.</returns>
    internal async Task<SeededAccount> SeedAccountAsync(
        string userName = "operator",
        LicenseStatus licenseStatus = LicenseStatus.Active,
        int maxInstances = 3,
        DateTimeOffset? expiresAt = null,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext context = CreateDbContext();
        DateTimeOffset now = DateTimeOffset.UnixEpoch;

        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = userName,
            CreatedAt = now,
            IsActive = true
        };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, Password);

        var account = new Account
        {
            Id = Guid.NewGuid(),
            Name = $"{userName}-account",
            CreatedAt = now
        };
        user.AccountId = account.Id;

        var license = new License
        {
            Id = Guid.NewGuid(),
            AccountId = account.Id,
            LicenseKey = $"lic-{Guid.NewGuid():N}",
            Status = licenseStatus,
            IssuedAt = now,
            ExpiresAt = expiresAt,
            MaxInstances = maxInstances
        };

        context.Users.Add(user);
        context.Accounts.Add(account);
        context.Licenses.Add(license);
        await context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new SeededAccount(account.Id, license.Id, user.Id, userName);
    }

    /// <inheritdoc/>
    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }
}

/// <summary>
/// The identifiers of a seeded account, licence and user.
/// </summary>
/// <param name="AccountId">The account identifier.</param>
/// <param name="LicenseId">The licence identifier.</param>
/// <param name="UserId">The user identifier.</param>
/// <param name="UserName">The user name.</param>
internal sealed record SeededAccount(Guid AccountId, Guid LicenseId, Guid UserId, string UserName);
