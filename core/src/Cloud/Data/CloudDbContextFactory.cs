// -----------------------------------------------------------------------------
// <copyright file="CloudDbContextFactory.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

/// <summary>
/// The design-time factory <c>dotnet ef</c> uses to build the model for migrations.
/// </summary>
/// <remarks>
/// <para>
/// The migration tooling needs a context instance but never opens a connection for <c>migrations add</c>,
/// so the connection string is taken from the <c>CLOUD_DB_CONNECTION</c> environment variable when it is
/// set and otherwise falls back to <see cref="DesignTimeFallbackConnection"/> — a credential-free local
/// placeholder that exists only so the model can be built on a workstation with no PostgreSQL server.
/// It is not used at runtime: the running application requires a real connection string and refuses to
/// start without one (see <see cref="CloudOptions"/>).
/// </para>
/// <para>
/// The provider must stay <c>UseNpgsql</c> here. The generated migration is provider specific, and a
/// migration scaffolded against a different provider would not apply to the deployment database.
/// </para>
/// </remarks>
internal sealed class CloudDbContextFactory : IDesignTimeDbContextFactory<CloudDbContext>
{
    /// <summary>The placeholder connection string used when no environment variable is present.</summary>
    internal const string DesignTimeFallbackConnection = "Host=localhost;Database=razor_cloud;Username=postgres";

    /// <inheritdoc/>
    public CloudDbContext CreateDbContext(string[] args)
    {
        string connectionString =
            Environment.GetEnvironmentVariable(CloudOptions.ConnectionStringVariable) ?? DesignTimeFallbackConnection;

        var options = new DbContextOptionsBuilder<CloudDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new CloudDbContext(options);
    }
}
