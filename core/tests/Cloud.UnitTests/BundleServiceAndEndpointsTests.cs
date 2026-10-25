// -----------------------------------------------------------------------------
// <copyright file="BundleServiceAndEndpointsTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cloud.Data;
using Cloud.Endpoints;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.AspNetCore.Http;
using Xunit;

public sealed class BundleServiceAndEndpointsTests : IDisposable
{
    private readonly CloudTestDatabase _db = new();
    private readonly TestTimeProvider _timeProvider = new(DateTimeOffset.UtcNow);
    private readonly BundleService _service;

    public BundleServiceAndEndpointsTests()
    {
        _service = new BundleService(_db, _timeProvider);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public void GenerateBundleId_Returns_Alphanumeric_String_Within_Length_Range()
    {
        var id = BundleService.GenerateBundleId(10);
        Assert.NotNull(id);
        Assert.Equal(10, id.Length);
        Assert.Matches("^[0-9A-Z]+$", id);

        var clampedMin = BundleService.GenerateBundleId(5);
        Assert.Equal(8, clampedMin.Length);

        var clampedMax = BundleService.GenerateBundleId(20);
        Assert.Equal(12, clampedMax.Length);
    }

    [Fact]
    public async Task Create_Get_Update_Delete_Bundle_Flow_Succeeds()
    {
        var accountId = Guid.NewGuid();
        var bundle = new TradingBundle
        {
            AccountId = accountId,
            Name = "Alpha Momentum",
            Description = "Dual EMA strategy with ATR risk rules.",
            DocumentationMarkdown = "# Alpha Momentum\nDocumentation",
            IsPublic = true,
            PublishedToMarketplace = false,
            Price = 1500000,
            Currency = "IRT",
            StrategySlotId = "TrendFollowing",
            AdapterSlotIdsJson = "[\"BinanceFutures\"]",
            HookSlotIdsJson = "[\"DrawdownCircuitBreaker\"]",
            DefaultConfigurationsJson = "{\"StopLossPct\": 2.0}",
        };

        // 1. Create
        var created = await _service.CreateBundleAsync(bundle);
        Assert.NotNull(created.Id);
        Assert.True(created.Id.Length >= 8);
        Assert.Equal("Alpha Momentum", created.Name);
        Assert.Equal("IRT", created.Currency);

        // 2. Get by ID
        var fetched = await _service.GetBundleByIdAsync(created.Id);
        Assert.NotNull(fetched);
        Assert.Equal(created.Id, fetched.Id);
        Assert.Equal(1500000, fetched.Price);

        // 3. List
        var list = await _service.GetBundlesAsync(accountId: accountId);
        Assert.Contains(list, b => b.Id == created.Id);

        var searchList = await _service.GetBundlesAsync(search: "Alpha");
        Assert.Contains(searchList, b => b.Id == created.Id);

        // 4. Update
        var update = new TradingBundle
        {
            Name = "Alpha Momentum V2",
            Description = "Updated description",
            DocumentationMarkdown = "# V2",
            IsPublic = true,
            PublishedToMarketplace = true,
            Price = 25,
            Currency = "USDT",
            StrategySlotId = "TrendFollowing",
            AdapterSlotIdsJson = "[\"BinanceFutures\",\"BybitLinear\"]",
            HookSlotIdsJson = "[\"DrawdownCircuitBreaker\",\"OrderRateLimiter\"]",
            DefaultConfigurationsJson = "{\"StopLossPct\": 1.5}",
        };

        var updated = await _service.UpdateBundleAsync(created.Id, update);
        Assert.NotNull(updated);
        Assert.Equal("Alpha Momentum V2", updated.Name);
        Assert.Equal("USDT", updated.Currency);
        Assert.Equal(25, updated.Price);

        // 5. Delete
        var deleted = await _service.DeleteBundleAsync(created.Id);
        Assert.True(deleted);

        var nonexistent = await _service.GetBundleByIdAsync(created.Id);
        Assert.Null(nonexistent);
    }

    [Fact]
    public async Task Snapshot_And_Dna_Attachment_Lifecycle_Succeeds()
    {
        var created = await _service.CreateBundleAsync(new TradingBundle
        {
            Name = "Snapshot Test Bundle",
            Currency = "Free",
            DefaultConfigurationsJson = "{\"RiskPerTrade\": 1.0}",
        });

        // Create Snapshot
        var snapshot = await _service.CreateSnapshotAsync(
            created.Id,
            "v1.0.0",
            "Baseline Genesis",
            "{\"RiskPerTrade\": 1.0, \"FastPeriod\": 12}");

        Assert.NotNull(snapshot);
        Assert.Equal(created.Id, snapshot.BundleId);
        Assert.Equal("v1.0.0", snapshot.Version);

        // Attach DNA
        var dna = new BundleDna
        {
            DnaId = "CHROM-883",
            Name = "Optimal Trend Chromosome",
            ParametersJson = "{\"FastPeriod\": 14, \"SlowPeriod\": 28}",
            BacktestStatus = "Backtested",
            Fitness = 3.12,
            NetProfit = 24500,
            ReportSummary = "Tested over 24-month horizon with Sharpe 2.4.",
        };

        var attached = await _service.AttachDnaToSnapshotAsync(snapshot.Id, dna);
        Assert.NotNull(attached);
        Assert.Equal(snapshot.Id, attached.BundleSnapshotId);
        Assert.Equal("Backtested", attached.BacktestStatus);

        // Fetch bundle with snapshot and DNA eager loading
        var bundleWithHistory = await _service.GetBundleByIdAsync(created.Id);
        Assert.NotNull(bundleWithHistory);
        Assert.Single(bundleWithHistory.Snapshots);
        var loadedSnap = bundleWithHistory.Snapshots.First();
        Assert.Single(loadedSnap.Dnas);
        Assert.Equal("CHROM-883", loadedSnap.Dnas.First().DnaId);
    }

    [Fact]
    public async Task Marketplace_Acquisition_Pins_Exact_Version_And_Rights()
    {
        var mktService = new MarketplaceService(_db, _timeProvider);
        var item = await mktService.PublishItemAsync(
            name: "EMA Cross Optimizer",
            kind: ExtensionKind.Strategy,
            version: "2.3.1",
            author: "QuantForge",
            description: "High speed EMA cross",
            price: 50,
            sdkVersion: "1.0.0");

        Assert.NotNull(item);
        Assert.Equal("2.3.1", item.Version);

        var seeded = await _db.SeedAccountAsync();
        var acquisition = await mktService.AcquireItemAsync(item.Id, seeded.AccountId);
        Assert.NotNull(acquisition);
        Assert.Equal("2.3.1", acquisition.AcquiredVersion);
        Assert.Equal("Perpetual", acquisition.LicenseType);
        Assert.Contains("canRunLive", acquisition.RightsJson, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Http_BundleEndpoints_EndToEnd_Crud_And_Branches()
    {
        using var factory = new CloudWebApplicationFactory();
        using var client = factory.CreateAuthorisedClient();

        // 1. GET /api/bundles (empty)
        var listRes = await client.GetAsync(new Uri("/api/bundles", UriKind.Relative));
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);

        // 2. POST /api/bundles (validation error on empty name)
        var badPayload = new SaveBundleRequest { Name = " " };
        var badRes = await client.PostAsJsonAsync(new Uri("/api/bundles", UriKind.Relative), badPayload);
        Assert.Equal(HttpStatusCode.BadRequest, badRes.StatusCode);

        // 3. POST /api/bundles (success)
        var createPayload = new SaveBundleRequest
        {
            Id = "BND-HTTP01",
            Name = "HTTP Test Bundle",
            Description = "Testing HTTP creation",
            Currency = "USDT",
            Price = 45,
            StrategySlotId = "TrendFollowing",
        };
        var createRes = await client.PostAsJsonAsync(new Uri("/api/bundles", UriKind.Relative), createPayload);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);

        // 4. GET /api/bundles/BND-HTTP01
        var getRes = await client.GetAsync(new Uri("/api/bundles/BND-HTTP01", UriKind.Relative));
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);

        // 5. GET /api/bundles/nonexistent -> 404
        var notFoundRes = await client.GetAsync(new Uri("/api/bundles/NONEXISTENT", UriKind.Relative));
        Assert.Equal(HttpStatusCode.NotFound, notFoundRes.StatusCode);

        // 6. PUT /api/bundles/BND-HTTP01
        var updatePayload = new SaveBundleRequest
        {
            Name = "HTTP Test Bundle Updated",
            Currency = "IRT",
            Price = 2000000,
        };
        var putRes = await client.PutAsJsonAsync(new Uri("/api/bundles/BND-HTTP01", UriKind.Relative), updatePayload);
        Assert.Equal(HttpStatusCode.OK, putRes.StatusCode);

        // 7. PUT /api/bundles/NONEXISTENT -> 404
        var putNotFound = await client.PutAsJsonAsync(new Uri("/api/bundles/NONEXISTENT", UriKind.Relative), updatePayload);
        Assert.Equal(HttpStatusCode.NotFound, putNotFound.StatusCode);

        // 8. POST /api/bundles/BND-HTTP01/snapshots
        var snapPayload = new CreateSnapshotRequest
        {
            Version = "v1.0.0",
            Name = "Snapshot 1",
            SnapshotStateJson = "{\"Param\":1}",
        };
        var snapRes = await client.PostAsJsonAsync(new Uri("/api/bundles/BND-HTTP01/snapshots", UriKind.Relative), snapPayload);
        Assert.Equal(HttpStatusCode.OK, snapRes.StatusCode);
        var createdSnap = await snapRes.Content.ReadFromJsonAsync<BundleSnapshot>();
        Assert.NotNull(createdSnap);

        // 9. POST /api/bundles/snapshots/{id}/dnas
        var dnaPayload = new AttachDnaRequest
        {
            DnaId = "DNA-001",
            Name = "Genome 1",
            BacktestStatus = "Backtested",
            Fitness = 2.5,
        };
        var dnaRes = await client.PostAsJsonAsync(new Uri($"/api/bundles/snapshots/{createdSnap.Id}/dnas", UriKind.Relative), dnaPayload);
        Assert.Equal(HttpStatusCode.OK, dnaRes.StatusCode);

        // 10. POST /api/bundles/snapshots/{emptyGuid}/dnas -> 404
        var dnaNotFound = await client.PostAsJsonAsync(new Uri($"/api/bundles/snapshots/{Guid.Empty}/dnas", UriKind.Relative), dnaPayload);
        Assert.Equal(HttpStatusCode.NotFound, dnaNotFound.StatusCode);

        // 11. DELETE /api/bundles/BND-HTTP01 -> 204
        var deleteRes = await client.DeleteAsync(new Uri("/api/bundles/BND-HTTP01", UriKind.Relative));
        Assert.Equal(HttpStatusCode.NoContent, deleteRes.StatusCode);

        // 12. DELETE /api/bundles/NONEXISTENT -> 404
        var delNotFound = await client.DeleteAsync(new Uri("/api/bundles/NONEXISTENT", UriKind.Relative));
        Assert.Equal(HttpStatusCode.NotFound, delNotFound.StatusCode);
    }
}
