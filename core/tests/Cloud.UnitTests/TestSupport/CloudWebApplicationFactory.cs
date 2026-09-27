// -----------------------------------------------------------------------------
// <copyright file="CloudWebApplicationFactory.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests.TestSupport;

using Cloud.Data;
using Cloud.Endpoints;
using Cloud.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

/// <summary>
/// Hosts the real Cloud application in-process for the HTTP and WebSocket tests.
/// </summary>
/// <remarks>
/// <para>
/// This runs <c>Program</c> itself — the composition root, the middleware, the FastEndpoints routes and the
/// <c>/engine</c> endpoint — so the tests exercise the pipeline Cloud actually serves rather than a
/// re-built approximation of it. The only substitution is the store: the composition root registers the
/// Npgsql provider, and this factory replaces the context factory with the in-memory SQLite one the other
/// tests use, so no PostgreSQL server is needed. Everything else, including the management API key and the
/// WebSocket protocol, is the production wiring.
/// </para>
/// <para>
/// The connection string and management key are supplied as host settings because <see cref="CloudOptions"/>
/// refuses to start without them; no real connection is ever opened, because the context factory is
/// replaced before a request is served.
/// </para>
/// </remarks>
internal sealed class CloudWebApplicationFactory : WebApplicationFactory<Program>
{
    /// <summary>The management API key the test host is configured with.</summary>
    internal const string ManagementApiKey = "test-management-key";

    private readonly bool _ownsDatabase;

    /// <summary>Initialises a new instance of the <see cref="CloudWebApplicationFactory"/> class.</summary>
    internal CloudWebApplicationFactory()
        : this(new CloudTestDatabase(), ownsDatabase: true)
    {
    }

    /// <summary>
    /// Initialises a new instance of the <see cref="CloudWebApplicationFactory"/> class over an existing
    /// store, so a test can seed state before the host is built.
    /// </summary>
    /// <param name="database">The store the hosted services use.</param>
    /// <param name="ownsDatabase">Whether this factory disposes the store.</param>
    internal CloudWebApplicationFactory(CloudTestDatabase database, bool ownsDatabase)
    {
        Database = database;
        _ownsDatabase = ownsDatabase;
    }

    /// <summary>Gets the store behind the hosted application.</summary>
    internal CloudTestDatabase Database
    {
        get;
    }

    /// <summary>
    /// Creates a client that presents the management API key, which is what the whole <c>/api</c> surface
    /// requires.
    /// </summary>
    /// <returns>The authorised client, which the caller disposes.</returns>
    internal HttpClient CreateAuthorisedClient()
    {
        HttpClient client = CreateClient();
        client.DefaultRequestHeaders.Add(ManagementApiKeyMiddleware.HeaderName, ManagementApiKey);
        return client;
    }

    /// <summary>
    /// Seeds an account with a licence and registers one Engine instance through the production
    /// registration service, so the tests start from state Cloud itself accepted.
    /// </summary>
    /// <param name="database">The store to seed.</param>
    /// <param name="engineId">The Engine identifier to register.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The seeded identifiers.</returns>
    internal static async Task<SeededInstance> SeedInstanceAsync(
        CloudTestDatabase database,
        string engineId = "engine-1",
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(database);

        SeededAccount account = await database.SeedAccountAsync(cancellationToken: cancellationToken).ConfigureAwait(false);
        var registration = new EngineRegistrationService(database, TimeProvider.System);
        RegistrationOutcome outcome = await registration
            .RegisterAsync(account.AccountId, account.LicenseId, engineId, "test instance", cancellationToken)
            .ConfigureAwait(false);

        return new SeededInstance(account.AccountId, account.LicenseId, outcome.Instance!.Id, outcome.ApiKey!);
    }

    /// <inheritdoc/>
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.UseSetting("Cloud:ConnectionString", "Host=unused;Database=unused");
        builder.UseSetting("Cloud:ManagementApiKey", ManagementApiKey);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IDbContextFactory<CloudDbContext>>();
            services.AddSingleton<IDbContextFactory<CloudDbContext>>(Database);
        });
    }

    /// <inheritdoc/>
    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && _ownsDatabase)
        {
            Database.Dispose();
        }
    }
}

/// <summary>
/// The identifiers of an account, licence and registered instance, and the API key issued for it.
/// </summary>
/// <param name="AccountId">The account identifier.</param>
/// <param name="LicenseId">The licence identifier.</param>
/// <param name="InstanceId">The registered instance identifier.</param>
/// <param name="ApiKey">The API key returned by registration.</param>
internal sealed record SeededInstance(Guid AccountId, Guid LicenseId, Guid InstanceId, string ApiKey);
