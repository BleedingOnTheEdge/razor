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
}
