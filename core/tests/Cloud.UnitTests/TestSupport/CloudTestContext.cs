// -----------------------------------------------------------------------------
// <copyright file="CloudTestContext.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests.TestSupport;

using Cloud;
using Cloud.Services;
using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// A database with a seeded account, licence and registered instance, plus the Cloud services wired to it.
/// </summary>
/// <remarks>
/// The tests that exercise provisioning seed their own state, because that is the behaviour under test.
/// The tests that exercise what happens to an existing instance start from here, which keeps each test
/// about one decision instead of restating the arrangement.
/// </remarks>
internal sealed class CloudTestContext : IDisposable
{
    private CloudTestContext(CloudTestDatabase database, Guid instanceId)
    {
        Database = database;
        InstanceId = instanceId;
        Time = new TestTimeProvider(DateTimeOffset.UnixEpoch);
        Options = new CloudOptions
        {
            ConnectionString = "unused",
            ManagementApiKey = "test-key",
            CommandQueueExpirySeconds = 60,
            CommandBatchSize = 2
        };

        Commands = new CommandService(database, Options, Time, NullLogger<CommandService>.Instance);
        Profiles = new ProfileService(database, Commands, Options);
        Manifests = new InstanceManifestService(database, Time);
    }

    /// <summary>Gets the store.</summary>
    internal CloudTestDatabase Database
    {
        get;
    }

    /// <summary>Gets the registered instance identifier.</summary>
    internal Guid InstanceId
    {
        get;
    }

    /// <summary>Gets the controllable clock.</summary>
    internal TestTimeProvider Time
    {
        get;
    }

    /// <summary>Gets the options in force.</summary>
    internal CloudOptions Options
    {
        get;
    }

    /// <summary>Gets the command service.</summary>
    internal CommandService Commands
    {
        get;
    }

    /// <summary>Gets the profile service.</summary>
    internal ProfileService Profiles
    {
        get;
    }

    /// <summary>Gets the manifest service.</summary>
    internal InstanceManifestService Manifests
    {
        get;
    }

    /// <summary>
    /// Creates a context with one registered instance.
    /// </summary>
    /// <returns>The context, which the caller disposes.</returns>
    internal static async Task<CloudTestContext> CreateWithInstanceAsync()
    {
        var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(false);

        var registration = new EngineRegistrationService(database, new TestTimeProvider(DateTimeOffset.UnixEpoch));
        RegistrationOutcome registered = await registration
            .RegisterAsync(account.AccountId, account.LicenseId, "engine-1", "instance", CancellationToken.None)
            .ConfigureAwait(false);

        return new CloudTestContext(database, registered.Instance!.Id);
    }

    /// <inheritdoc/>
    public void Dispose() => Database.Dispose();
}
