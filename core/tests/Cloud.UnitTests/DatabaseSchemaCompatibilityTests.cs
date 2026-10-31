// -----------------------------------------------------------------------------

// <copyright file="DatabaseSchemaCompatibilityTests.cs" company="BleedingOnTheEdge">

//   Copyright (c) BleedingOnTheEdge. All rights reserved.

// </copyright>

// -----------------------------------------------------------------------------



namespace Cloud.UnitTests;



using Cloud.Data;

using Cloud.UnitTests.TestSupport;

using Xunit;



public sealed class DatabaseSchemaCompatibilityTests

{

    [Fact]

    public async Task EnsureSchemaAsync_NullDbContext_ThrowsArgumentNullException()

    {

        await Assert.ThrowsAsync<ArgumentNullException>(() =>

            DatabaseSchemaCompatibility.EnsureSchemaAsync(null!));

    }



    [Fact]

    public async Task EnsureSchemaAsync_SqliteDatabase_ReturnsGracefullyWithoutExecutingPostgreSqlDdl()

    {

        using var db = new CloudTestDatabase();

        using var context = db.CreateDbContext();



        // SQLite provider should return without throwing PostgreSQL syntax error

        await DatabaseSchemaCompatibility.EnsureSchemaAsync(context);



        Assert.NotNull(context.Database.ProviderName);

    }



    [Theory]

    [InlineData("Npgsql.EntityFrameworkCore.PostgreSQL", true)]

    [InlineData("Npgsql", true)]

    [InlineData("Microsoft.EntityFrameworkCore.Sqlite", false)]

    [InlineData(null, false)]

    [InlineData("", false)]

    public void IsPostgreSqlProvider_VariousProviders_ReturnsExpectedResult(string? provider, bool expected)

    {

        Assert.Equal(expected, DatabaseSchemaCompatibility.IsPostgreSqlProvider(provider));

    }



    [Fact]

    public async Task CloudDbContext_LegacyDeveloperRole_MapsToTrader()

    {

        using var db = new CloudTestDatabase();

        using var context = db.CreateDbContext();



        var account = new Account { Id = Guid.NewGuid(), Name = "DevTestAccount" };

        context.Accounts.Add(account);

        var newUser = new User

        {

            Id = Guid.NewGuid(),

            AccountId = account.Id,

            UserName = $"dev_{Guid.NewGuid():N}",

            PasswordHash = "dummy_hash",

            Role = UserRole.Trader

        };

        context.Users.Add(newUser);

        await context.SaveChangesAsync();



        await Microsoft.EntityFrameworkCore.RelationalDatabaseFacadeExtensions.ExecuteSqlRawAsync(

            context.Database,

            """UPDATE "Users" SET "Role" = 'Developer' WHERE "Id" = {0}""",

            newUser.Id);



        context.Entry(newUser).State = Microsoft.EntityFrameworkCore.EntityState.Detached;

        var userId = newUser.Id;



        var user = await context.Users.FindAsync(userId);

        Assert.NotNull(user);

        Assert.Equal(UserRole.Trader, user.Role);

    }

    [Fact]
    public async Task RowVersion_PopulatedAndRotatedOnEntityUpdate()
    {
        using var db = new CloudTestDatabase();
        using var context = db.CreateDbContext();

        var account = new Account
        {
            Id = Guid.NewGuid(),
            Name = "concurrency-test-account",
            CreatedAt = DateTimeOffset.UtcNow
        };
        context.Accounts.Add(account);
        await context.SaveChangesAsync();

        Assert.NotNull(account.RowVersion);
        Assert.NotEmpty(account.RowVersion);

        byte[] initialVersion = (byte[])account.RowVersion.Clone();

        account.Name = "updated-concurrency-test-account";
        await context.SaveChangesAsync();

        Assert.NotEqual(initialVersion, account.RowVersion);
    }
}

