// -----------------------------------------------------------------------------
// <copyright file="ProfileServiceSlotAssignmentTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using Cloud.Data;
using Cloud.Endpoints;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Xunit;

/// <summary>
/// Verifies self-healing marketplace extension slot provisioning and online status reporting.
/// </summary>
public sealed class ProfileServiceSlotAssignmentTests
{
    [Fact]
    public async Task SetSelectionAsync_WithMarketplaceItem_AutomaticallyProvisionsManifestAndSucceeds()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        using (CloudDbContext db = context.Database.CreateDbContext())
        {
            db.MarketplaceItems.Add(new MarketplaceItem
            {
                Id = Guid.NewGuid(),
                Name = "BinanceFuturesAdapter",
                Kind = ExtensionKind.Adapter,
                Price = 0,
                Author = "RazorTeam",
                Description = "High-speed Binance Futures adapter",
                CreatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        SelectionOutcome outcome = await context.Profiles
            .SetSelectionAsync(context.InstanceId, ExtensionKind.Adapter, "BinanceFuturesAdapter", isActive: true, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Succeeded, outcome.Status);

        using (CloudDbContext verifyDb = context.Database.CreateDbContext())
        {
            bool hasManifest = await verifyDb.ExtensionManifestEntries
                .AnyAsync(e => e.EngineInstanceId == context.InstanceId && e.Name == "BinanceFuturesAdapter" && e.Kind == ExtensionKind.Adapter)
                .ConfigureAwait(true);
            Assert.True(hasManifest);
        }
    }

    [Fact]
    public async Task SetSelectionAsync_WithAcquiredItem_AutomaticallyProvisionsManifestAndSucceeds()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        var itemId = Guid.NewGuid();
        using (CloudDbContext db = context.Database.CreateDbContext())
        {
            var instance = await db.EngineInstances.FindAsync(context.InstanceId).ConfigureAwait(true);
            Assert.NotNull(instance);

            var item = new MarketplaceItem
            {
                Id = itemId,
                Name = "PremiumTrendStrategy",
                Kind = ExtensionKind.Strategy,
                Price = 99,
                Author = "QuantPro",
                Description = "Institutional trend following strategy",
                CreatedAt = DateTimeOffset.UtcNow
            };
            db.MarketplaceItems.Add(item);

            db.MarketplaceAcquisitions.Add(new MarketplaceAcquisition
            {
                Id = Guid.NewGuid(),
                AccountId = instance.AccountId,
                MarketplaceItemId = itemId,
                LicenseKey = "LIC-TEST-001",
                AcquiredAt = DateTimeOffset.UtcNow
            });

            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        SelectionOutcome outcome = await context.Profiles
            .SetSelectionAsync(context.InstanceId, ExtensionKind.Strategy, "PremiumTrendStrategy", isActive: true, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Succeeded, outcome.Status);
    }

    private static readonly System.Text.Json.JsonSerializerOptions JsonOptions = new(System.Text.Json.JsonSerializerDefaults.Web)
    {
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    [Fact]
    public async Task GetInstanceEndpoint_ReportsAccurateConnectivityBasedOnHeartbeat()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        using HttpClient client = factory.CreateAuthorisedClient();

        // Fresh heartbeat
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            var inst = await db.EngineInstances.FindAsync(instance.InstanceId).ConfigureAwait(true);
            Assert.NotNull(inst);
            inst.LastSeenAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        using HttpResponseMessage freshResp = await client.GetAsync(new Uri($"/api/instances/{instance.InstanceId}", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(System.Net.HttpStatusCode.OK, freshResp.StatusCode);
        var freshView = await System.Net.Http.Json.HttpContentJsonExtensions.ReadFromJsonAsync<GetInstanceResponse>(freshResp.Content, JsonOptions).ConfigureAwait(true);
        Assert.NotNull(freshView);
        Assert.True(freshView.IsConnected);

        // Stale heartbeat
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            var inst = await db.EngineInstances.FindAsync(instance.InstanceId).ConfigureAwait(true);
            Assert.NotNull(inst);
            inst.LastSeenAt = DateTimeOffset.UtcNow.AddMinutes(-5);
            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        using HttpResponseMessage staleResp = await client.GetAsync(new Uri($"/api/instances/{instance.InstanceId}", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(System.Net.HttpStatusCode.OK, staleResp.StatusCode);
        var staleView = await System.Net.Http.Json.HttpContentJsonExtensions.ReadFromJsonAsync<GetInstanceResponse>(staleResp.Content, JsonOptions).ConfigureAwait(true);
        Assert.NotNull(staleView);
        Assert.False(staleView.IsConnected);
    }

    [Fact]
    public async Task ListInstancesEndpoint_ReportsConnectedStateAccurately()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        using HttpClient client = factory.CreateAuthorisedClient();

        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            var inst = await db.EngineInstances.FindAsync(instance.InstanceId).ConfigureAwait(true);
            Assert.NotNull(inst);
            inst.LastSeenAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        using HttpResponseMessage listResp = await client.GetAsync(new Uri("/api/instances", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(System.Net.HttpStatusCode.OK, listResp.StatusCode);
        var list = await System.Net.Http.Json.HttpContentJsonExtensions.ReadFromJsonAsync<List<InstanceListItemView>>(listResp.Content, JsonOptions).ConfigureAwait(true);
        Assert.NotNull(list);
        var item = list.First(i => i.InstanceId == instance.InstanceId);
        Assert.True(item.IsConnected);
    }

    [Fact]
    public async Task SetSelectionAsync_WithUnknownExtension_RejectsSelection()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        SelectionOutcome outcome = await context.Profiles
            .SetSelectionAsync(context.InstanceId, ExtensionKind.Strategy, "NonExistentStrategyXYZ", isActive: true, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Rejected, outcome.Status);
        Assert.NotNull(outcome.FailureReason);
        Assert.Contains("The Engine has not reported", outcome.FailureReason, StringComparison.Ordinal);
    }

    [Fact]
    public async Task SetSelectionAsync_DeactivatingSelection_Succeeds()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        SelectionOutcome outcome = await context.Profiles
            .SetSelectionAsync(context.InstanceId, ExtensionKind.Adapter, "AnyAdapter", isActive: false, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Succeeded, outcome.Status);
    }
}

