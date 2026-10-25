// -----------------------------------------------------------------------------
// <copyright file="BundleAndSchemaBranchCoverageTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Net.Http.Json;
using Cloud.Data;
using Cloud.Endpoints;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Xunit;

public sealed class BundleAndSchemaBranchCoverageTests : IDisposable
{
    private readonly CloudTestDatabase _db = new();
    private readonly TestTimeProvider _timeProvider = new(DateTimeOffset.UtcNow);
    private readonly BundleService _service;

    public BundleAndSchemaBranchCoverageTests()
    {
        _service = new BundleService(_db, _timeProvider);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public void DatabaseSchemaCompatibility_ProviderChecks_CoverAllBranches()
    {
        Assert.False(DatabaseSchemaCompatibility.IsPostgreSqlProvider(null));
        Assert.False(DatabaseSchemaCompatibility.IsPostgreSqlProvider("Microsoft.Data.Sqlite"));
        Assert.True(DatabaseSchemaCompatibility.IsPostgreSqlProvider("Npgsql.EntityFrameworkCore.PostgreSQL"));
        Assert.True(DatabaseSchemaCompatibility.IsPostgreSqlProvider("PostgreSQL"));
        Assert.True(DatabaseSchemaCompatibility.IsPostgreSqlProvider("npgsql"));
    }

    [Fact]
    public async Task BundleService_Guards_And_Fallbacks_CoverAllBranches()
    {
        // 1. GetBundleByIdAsync guards
        await Assert.ThrowsAsync<ArgumentException>(() => _service.GetBundleByIdAsync(""));
        await Assert.ThrowsAsync<ArgumentException>(() => _service.GetBundleByIdAsync("   "));

        // 2. CreateBundleAsync guards
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.CreateBundleAsync(null!));

        // 3. UpdateBundleAsync guards
        await Assert.ThrowsAsync<ArgumentException>(() => _service.UpdateBundleAsync("", new TradingBundle()));
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.UpdateBundleAsync("BND-123", null!));

        // 4. DeleteBundleAsync guards
        await Assert.ThrowsAsync<ArgumentException>(() => _service.DeleteBundleAsync(""));

        // 5. CreateSnapshotAsync guards & fallbacks
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateSnapshotAsync("", "v1.0.0", "Name", "{}"));
        var nullSnap = await _service.CreateSnapshotAsync("NONEXISTENT", "v1.0.0", "Name", "{}");
        Assert.Null(nullSnap);

        // 6. AttachDnaToSnapshotAsync guards & fallbacks
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.AttachDnaToSnapshotAsync(Guid.NewGuid(), null!));
        var missingDna = await _service.AttachDnaToSnapshotAsync(Guid.NewGuid(), new BundleDna());
        Assert.Null(missingDna);

        // 7. GetBundlesAsync publicity branch
        var pubBundle = await _service.CreateBundleAsync(new TradingBundle
        {
            Name = "Public Bundle",
            IsPublic = true,
            DefaultConfigurationsJson = "{\"Gene\":42}"
        });
        var privBundle = await _service.CreateBundleAsync(new TradingBundle
        {
            Name = "Private Bundle",
            IsPublic = false,
        });

        var publicOnly = await _service.GetBundlesAsync(isPublic: true);
        Assert.Contains(publicOnly, b => b.Id == pubBundle.Id);
        Assert.DoesNotContain(publicOnly, b => b.Id == privBundle.Id);

        var privateOnly = await _service.GetBundlesAsync(isPublic: false);
        Assert.Contains(privateOnly, b => b.Id == privBundle.Id);

        // 8. CreateSnapshot with whitespace fallback
        var fallbackSnap = await _service.CreateSnapshotAsync(pubBundle.Id, "", "  ", "");
        Assert.NotNull(fallbackSnap);
        Assert.StartsWith("v1.", fallbackSnap.Version, StringComparison.Ordinal);
        Assert.StartsWith("Snapshot ", fallbackSnap.Name, StringComparison.Ordinal);
        Assert.Equal("{\"Gene\":42}", fallbackSnap.SnapshotStateJson);

        // 9. Existing ID collision handling in CreateBundleAsync
        var duplicate = new TradingBundle
        {
            Id = pubBundle.Id,
            Name = "Duplicate ID Bundle",
        };
        var resolved = await _service.CreateBundleAsync(duplicate);
        Assert.NotNull(resolved.Id);
        Assert.NotEqual(pubBundle.Id, resolved.Id);
    }

    [Fact]
    public async Task BundleEndpoints_DirectHandlers_CoverEdgeCases()
    {
        using var factory = new CloudWebApplicationFactory();
        using var client = factory.CreateAuthorisedClient();

        // 1. CreateBundle with fallbacks (empty currency, negative price, null configs)
        var fallbackReq = new SaveBundleRequest
        {
            Name = "Fallback Bundle",
            Currency = " ",
            AdapterSlotIdsJson = null!,
            HookSlotIdsJson = "  ",
            DefaultConfigurationsJson = null!,
            Price = -10,
        };
        var createRes = await client.PostAsJsonAsync(new Uri("/api/bundles", UriKind.Relative), fallbackReq);
        Assert.Equal(System.Net.HttpStatusCode.Created, createRes.StatusCode);
        var created = await createRes.Content.ReadFromJsonAsync<TradingBundle>();
        Assert.NotNull(created);

        // 2. AttachSnapshotDnaEndpoint with empty status & not found
        var attachRes = await client.PostAsJsonAsync(
            new Uri($"/api/bundles/snapshots/{Guid.NewGuid()}/dnas", UriKind.Relative),
            new AttachDnaRequest { BacktestStatus = " " });
        Assert.Equal(System.Net.HttpStatusCode.NotFound, attachRes.StatusCode);

        // 3. AttachSnapshotDnaEndpoint with Guid.Empty snapshotId
        var emptyAttachRes = await client.PostAsJsonAsync(
            new Uri($"/api/bundles/snapshots/{Guid.Empty}/dnas", UriKind.Relative),
            new AttachDnaRequest { BacktestStatus = "Untested" });
        Assert.Equal(System.Net.HttpStatusCode.NotFound, emptyAttachRes.StatusCode);

        // 4. CreateBundle validation failure (empty name)
        var invalidCreateRes = await client.PostAsJsonAsync(
            new Uri("/api/bundles", UriKind.Relative),
            new SaveBundleRequest { Name = "   " });
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, invalidCreateRes.StatusCode);

        // 5. CreateBundle with all null optional fields
        var sparseCreateRes = await client.PostAsJsonAsync(
            new Uri("/api/bundles", UriKind.Relative),
            new SaveBundleRequest
            {
                Name = "Sparse Bundle",
                Id = null,
                Description = null!,
                DocumentationMarkdown = null!,
                StrategySlotId = null!,
                AdapterSlotIdsJson = null!,
                HookSlotIdsJson = null!,
                DefaultConfigurationsJson = null!,
                Currency = null!,
            });
        Assert.Equal(System.Net.HttpStatusCode.Created, sparseCreateRes.StatusCode);
        var sparseBundle = await sparseCreateRes.Content.ReadFromJsonAsync<TradingBundle>();
        Assert.NotNull(sparseBundle);

        // 6. GetBundleByIdEndpoint: not found
        var getNotFound = await client.GetAsync(new Uri("/api/bundles/NONEXISTENT-999", UriKind.Relative));
        Assert.Equal(System.Net.HttpStatusCode.NotFound, getNotFound.StatusCode);

        // 7. UpdateBundleEndpoint: not found
        var updateNotFound = await client.PutAsJsonAsync(
            new Uri("/api/bundles/NONEXISTENT-999", UriKind.Relative),
            new SaveBundleRequest { Name = "Missing" });
        Assert.Equal(System.Net.HttpStatusCode.NotFound, updateNotFound.StatusCode);

        // 8. UpdateBundleEndpoint: valid update with all null optional properties
        var sparseUpdateRes = await client.PutAsJsonAsync(
            new Uri($"/api/bundles/{sparseBundle.Id}", UriKind.Relative),
            new SaveBundleRequest
            {
                Name = null!,
                Description = null!,
                DocumentationMarkdown = null!,
                Currency = null!,
                StrategySlotId = null!,
                AdapterSlotIdsJson = null!,
                HookSlotIdsJson = null!,
                DefaultConfigurationsJson = null!,
                Price = -5,
            });
        Assert.Equal(System.Net.HttpStatusCode.OK, sparseUpdateRes.StatusCode);

        // 9. DeleteBundleEndpoint: not found
        var deleteNotFound = await client.DeleteAsync(new Uri("/api/bundles/NONEXISTENT-999", UriKind.Relative));
        Assert.Equal(System.Net.HttpStatusCode.NotFound, deleteNotFound.StatusCode);

        // 10. CreateBundleSnapshotEndpoint: bundle not found
        var snapNotFound = await client.PostAsJsonAsync(
            new Uri("/api/bundles/NONEXISTENT-999/snapshots", UriKind.Relative),
            new CreateSnapshotRequest { Version = "v1.0.0" });
        Assert.Equal(System.Net.HttpStatusCode.NotFound, snapNotFound.StatusCode);

        // 11. Create snapshot on valid bundle then attach DNA with all null properties
        var snapRes = await client.PostAsJsonAsync(
            new Uri($"/api/bundles/{created.Id}/snapshots", UriKind.Relative),
            new CreateSnapshotRequest { Version = "v1.0.0", Name = "Base Snapshot" });
        Assert.Equal(System.Net.HttpStatusCode.OK, snapRes.StatusCode);
        var snapshot = await snapRes.Content.ReadFromJsonAsync<BundleSnapshot>();
        Assert.NotNull(snapshot);

        var sparseDnaRes = await client.PostAsJsonAsync(
            new Uri($"/api/bundles/snapshots/{snapshot.Id}/dnas", UriKind.Relative),
            new AttachDnaRequest
            {
                DnaId = null!,
                Name = null!,
                ParametersJson = null!,
                BacktestStatus = null!,
                ReportSummary = null!,
            });
        Assert.Equal(System.Net.HttpStatusCode.OK, sparseDnaRes.StatusCode);

        // 12. Query filtering branches in GetBundlesEndpoint
        var searchRes = await client.GetAsync(
            new Uri($"/api/bundles?accountId={Guid.NewGuid()}&isPublic=true&search=Sparse", UriKind.Relative));
        Assert.Equal(System.Net.HttpStatusCode.OK, searchRes.StatusCode);

        var searchPrivateRes = await client.GetAsync(
            new Uri("/api/bundles?isPublic=false", UriKind.Relative));
        Assert.Equal(System.Net.HttpStatusCode.OK, searchPrivateRes.StatusCode);
    }

    [Fact]
    public async Task BundleService_SearchFilters_And_Clamping_CoverAllBranches()
    {
        // 1. GenerateBundleId clamping
        var clampedMin = BundleService.GenerateBundleId(4);
        Assert.Equal(8, clampedMin.Length);
        var clampedMax = BundleService.GenerateBundleId(20);
        Assert.Equal(12, clampedMax.Length);

        // 2. Search by Description and Id
        var descBundle = await _service.CreateBundleAsync(new TradingBundle
        {
            Name = "Desc Test",
            Description = "UniqueKeywordInDesc",
            IsPublic = true,
        });

        var matchDesc = await _service.GetBundlesAsync(search: "UniqueKeywordInDesc");
        Assert.Contains(matchDesc, b => b.Id == descBundle.Id);

        var matchId = await _service.GetBundlesAsync(search: descBundle.Id);
        Assert.Contains(matchId, b => b.Id == descBundle.Id);

        // 3. Search with whitespace
        var allWithWsSearch = await _service.GetBundlesAsync(search: "   ");
        Assert.NotEmpty(allWithWsSearch);

        // 4. AccountId = Guid.Empty
        var emptyAccountResults = await _service.GetBundlesAsync(accountId: Guid.Empty, isPublic: true);
        Assert.Contains(emptyAccountResults, b => b.Id == descBundle.Id);

        // 5. Update non-existent bundle
        var updateMissing = await _service.UpdateBundleAsync("NONEXISTENT", new TradingBundle { Name = "X" });
        Assert.Null(updateMissing);

        // 6. Delete non-existent bundle
        var deleteMissing = await _service.DeleteBundleAsync("NONEXISTENT");
        Assert.False(deleteMissing);
    }
}
