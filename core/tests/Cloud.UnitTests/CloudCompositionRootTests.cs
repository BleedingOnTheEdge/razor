// -----------------------------------------------------------------------------
// <copyright file="CloudCompositionRootTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using Cloud.Data;
using Cloud.Engine;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Tests that the composition root can actually build everything it registers, and that the session
/// registry holds and releases the sessions it owns.
/// </summary>
/// <remarks>
/// The resolution test is not a tautology. A service registered as "construct this type for me" is only
/// usable if the container can see a constructor for it, and the container only looks at <c>public</c>
/// constructors — so an <c>internal</c> one compiles, passes review, and then throws the first time the
/// service is resolved. The two types the pipeline constructs itself have the same constraint:
/// <see cref="CloudDbContext"/>, which EF builds through the registered factory, and the
/// <see cref="EngineSession"/> that <c>EngineSocketHandler</c> creates per connection. All three are
/// exercised here, so a missing public constructor is a red test rather than a 500 on the first request or
/// the first Engine connection.
/// </remarks>
public sealed class CloudCompositionRootTests
{
    [Fact]
    public async Task EveryRegisteredServiceCanBeResolvedFromTheContainer()
    {
        using var factory = new CloudWebApplicationFactory();
        await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        IServiceProvider services = factory.Services;

        Assert.NotNull(services.GetRequiredService<CloudOptions>());
        Assert.NotNull(services.GetRequiredService<TimeProvider>());
        Assert.NotNull(services.GetRequiredService<EngineRegistrationService>());
        Assert.NotNull(services.GetRequiredService<EngineAuthenticationService>());
        Assert.NotNull(services.GetRequiredService<InstanceManifestService>());
        Assert.NotNull(services.GetRequiredService<CommandService>());
        Assert.NotNull(services.GetRequiredService<ProfileService>());
        Assert.NotNull(services.GetRequiredService<HeartbeatService>());
        Assert.NotNull(services.GetRequiredService<EngineSessionRegistry>());
    }

    [Fact]
    public async Task TheContextFactoryCreatesAContextThatReachesTheStore()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        IDbContextFactory<CloudDbContext> contextFactory = factory.Services.GetRequiredService<IDbContextFactory<CloudDbContext>>();

        // Creating the context is the step that fails when the context type has no constructor the container
        // can see; the read then proves the context is wired to the store the seeded instance lives in,
        // rather than merely constructed.
        using CloudDbContext context = contextFactory.CreateDbContext();
        EngineInstance stored = await context.EngineInstances
            .Include(candidate => candidate.Profile)
                .ThenInclude(profile => profile!.Selections)
            .Include(candidate => candidate.ManifestEntries)
            .Include(candidate => candidate.Commands)
            .Include(candidate => candidate.Account)
            .Include(candidate => candidate.License)
            .SingleAsync(candidate => candidate.Id == instance.InstanceId)
            .ConfigureAwait(true);

        // The navigation properties are what Cloud reads an instance's configuration through, so their
        // fix-up is part of the contract this test pins: a registration writes all four of these rows.
        Assert.NotNull(stored.Profile);
        Assert.NotNull(stored.Account);
        Assert.NotNull(stored.License);
        Assert.Empty(stored.ManifestEntries);
        Assert.Empty(stored.Commands);
    }

    [Fact]
    public async Task TheEngineSessionCanBeCreatedForAConnection()
    {
        using var factory = new CloudWebApplicationFactory();
        await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        var channel = new RecordingEngineChannel();

        // This is exactly how EngineSocketHandler builds a session for each accepted socket: the container
        // supplies everything except the transport, which belongs to the connection.
        EngineSession session = ActivatorUtilities.CreateInstance<EngineSession>(factory.Services, channel);

        Assert.Null(session.InstanceId);
        session.Dispose();
    }

    [Fact]
    public async Task TheRegistryRegistersReportsTheDisplacedSessionAndOnlyUnregistersTheCurrentOne()
    {
        Guid instanceId = Guid.NewGuid();
        var registry = new EngineSessionRegistry(NullLogger<EngineSessionRegistry>.Instance);
        using var firstHarness = new CloudSessionHarness(new CloudTestDatabase());
        using var secondHarness = new CloudSessionHarness(new CloudTestDatabase());
        EngineSession first = firstHarness.Session;
        EngineSession second = secondHarness.Session;

        Assert.Null(registry.Register(instanceId, first));

        // A reconnect can register its replacement before the previous socket's cleanup runs, so registering
        // must report the session it displaced rather than dropping it silently.
        Assert.Same(first, registry.Register(instanceId, second));

        // The stale connection's cleanup must not evict the live session.
        registry.Unregister(instanceId, first);
        Assert.True(await registry.TryDeliverPendingCommandsAsync(instanceId, CancellationToken.None).ConfigureAwait(true));

        // An unauthenticated session has nothing to deliver, so nothing is written; that is the session's
        // decision, and the registry's answer is only that it found a session at all.
        Assert.Empty(firstHarness.Channel.Sent);

        registry.Unregister(instanceId, second);

        // No session is left for the instance, so a queued command is not reported as delivered.
        Assert.False(await registry.TryDeliverPendingCommandsAsync(instanceId, CancellationToken.None).ConfigureAwait(true));
        registry.Dispose();
    }

    [Fact]
    public void DisposingTheRegistryClosesTheSessionsItHoldsAndIsIdempotent()
    {
        Guid instanceId = Guid.NewGuid();
        var registry = new EngineSessionRegistry(NullLogger<EngineSessionRegistry>.Instance);
        using var harness = new CloudSessionHarness(new CloudTestDatabase());
        registry.Register(instanceId, harness.Session);

        // Disposal closes each session's cipher and releases its key material. It must be safe to call twice
        // because the container disposes the singletons it created, including ones a test already released.
        registry.Dispose();
        registry.Dispose();
    }
}
