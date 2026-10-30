// -----------------------------------------------------------------------------
// <copyright file="EngineSharingEndpointsTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cloud.Data;
using Cloud.Endpoints;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Integration tests for temporary engine sharing endpoints (Create, List, Revoke).
/// </summary>
public sealed class EngineSharingEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task CreateEngineShare_Succeeds_WhenOwnerCreatesValidShare()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount seeded = await factory.Database.SeedAccountAsync("share-owner").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, new TestTimeProvider(DateTimeOffset.UtcNow));
        RegistrationOutcome outcome = await regService
            .RegisterAsync(seeded.AccountId, seeded.LicenseId, "engine-share-1", "Sharable Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        var request = new
        {
            SharedWithEmail = "colleague@razor.platform",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(7),
            CanRead = true,
            CanControl = true,
            CanRunFlows = false
        };

        client.DefaultRequestHeaders.Add("X-Account-Id", seeded.AccountId.ToString());

        using HttpResponseMessage response = await client.PostAsJsonAsync(
            new Uri($"/api/instances/{instanceId}/shares", UriKind.Relative),
            request,
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        EngineShareView? share = await response.Content.ReadFromJsonAsync<EngineShareView>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(share);
        Assert.Equal(instanceId, share.EngineInstanceId);
        Assert.Equal("colleague@razor.platform", share.SharedWithEmail);
        Assert.True(share.CanRead);
        Assert.True(share.CanControl);
        Assert.False(share.CanRunFlows);
        Assert.False(share.IsExpired);

        // Verify List endpoint returns the share
        using HttpResponseMessage listResp = await client.GetAsync(
            new Uri($"/api/instances/{instanceId}/shares", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        List<EngineShareView>? list = await listResp.Content.ReadFromJsonAsync<List<EngineShareView>>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(list);
        Assert.Contains(list, s => s.Id == share.Id);

        // Verify Revoke endpoint
        using HttpResponseMessage revokeResp = await client.DeleteAsync(
            new Uri($"/api/instances/{instanceId}/shares/{share.Id}", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NoContent, revokeResp.StatusCode);

        // Verify database reflects revocation
        using CloudDbContext verifyDb = factory.Database.CreateDbContext();
        EngineShare stored = await verifyDb.EngineShares.SingleAsync(s => s.Id == share.Id).ConfigureAwait(true);
        Assert.True(stored.IsRevoked);
    }

    [Fact]
    public async Task CreateEngineShare_ReturnsNotFound_WhenEngineDoesNotExist()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        Guid missingId = Guid.NewGuid();
        var request = new
        {
            SharedWithEmail = "user@razor.platform",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(1)
        };

        using HttpResponseMessage response = await client.PostAsJsonAsync(
            new Uri($"/api/instances/{missingId}/shares", UriKind.Relative),
            request,
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateEngineShare_ReturnsForbidden_WhenRequesterIsNotOwner()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount realOwner = await factory.Database.SeedAccountAsync("real-owner").ConfigureAwait(true);
        SeededAccount otherAccount = await factory.Database.SeedAccountAsync("other-account").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, new TestTimeProvider(DateTimeOffset.UtcNow));
        RegistrationOutcome outcome = await regService
            .RegisterAsync(realOwner.AccountId, realOwner.LicenseId, "engine-prot-1", "Protected Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        client.DefaultRequestHeaders.Add("X-Account-Id", otherAccount.AccountId.ToString());

        var request = new
        {
            SharedWithEmail = "recipient@razor.platform",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(1)
        };

        using HttpResponseMessage response = await client.PostAsJsonAsync(
            new Uri($"/api/instances/{instanceId}/shares", UriKind.Relative),
            request,
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreateEngineShare_ReturnsBadRequest_WhenExpirationIsInThePast()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount seeded = await factory.Database.SeedAccountAsync("past-exp-owner").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, new TestTimeProvider(DateTimeOffset.UtcNow));
        RegistrationOutcome outcome = await regService
            .RegisterAsync(seeded.AccountId, seeded.LicenseId, "engine-exp-1", "Expiring Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        client.DefaultRequestHeaders.Add("X-Account-Id", seeded.AccountId.ToString());

        var request = new
        {
            SharedWithEmail = "valid@razor.platform",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(-1) // In past!
        };

        using HttpResponseMessage response = await client.PostAsJsonAsync(
            new Uri($"/api/instances/{instanceId}/shares", UriKind.Relative),
            request,
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RevokeEngineShare_ReturnsNotFound_WhenShareDoesNotExist()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        Guid instanceId = Guid.NewGuid();
        Guid missingShareId = Guid.NewGuid();

        using HttpResponseMessage response = await client.DeleteAsync(
            new Uri($"/api/instances/{instanceId}/shares/{missingShareId}", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateEngineShare_Succeeds_WithUserIdOnlyAndDefaultExpiry()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount seeded = await factory.Database.SeedAccountAsync("user-share-owner").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, new TestTimeProvider(DateTimeOffset.UtcNow));
        RegistrationOutcome outcome = await regService
            .RegisterAsync(seeded.AccountId, seeded.LicenseId, "engine-user-1", "User Sharable", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        client.DefaultRequestHeaders.Add("X-Account-Id", seeded.AccountId.ToString());

        var request = new
        {
            SharedWithEmail = (string?)null,
            SharedWithUserId = Guid.NewGuid(),
            ExpiresAtUtc = default(DateTimeOffset)
        };

        using HttpResponseMessage response = await client.PostAsJsonAsync(
            new Uri($"/api/instances/{instanceId}/shares", UriKind.Relative),
            request,
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private static readonly string[] SampleItems = ["a", "b", "c"];

    [Fact]
    public void EngineShare_IsActive_CoversAllBranchCombinations()
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        var share = new EngineShare { ExpiresAtUtc = now.AddHours(1), IsRevoked = false };
        Assert.True(share.IsActive(now));

        share.IsRevoked = true;
        Assert.False(share.IsActive(now));

        share.IsRevoked = false;
        share.ExpiresAtUtc = now.AddHours(-1);
        Assert.False(share.IsActive(now));
    }

    [Fact]
    public void PagedResult_And_FlexibleNullableGuidConverter_CoverAllEdgeCases()
    {
        // PagedResult branch coverage
        var empty = PagedResult.Create(Array.Empty<string>(), null, null);
        Assert.Equal(0, empty.TotalCount);
        Assert.Equal(1, empty.TotalPages);
        Assert.Equal(1, empty.Page);
        Assert.Equal(25, empty.PageSize);
        Assert.Empty(empty.Items);

        var paginated = PagedResult.Create(SampleItems, 2, 2);
        Assert.Equal(3, paginated.TotalCount);
        Assert.Equal(2, paginated.TotalPages);
        Assert.Equal(2, paginated.Page);
        Assert.Equal(2, paginated.PageSize);
        Assert.Single(paginated.Items);
        Assert.Equal("c", paginated.Items[0]);

        // FlexibleNullableGuidConverter branch coverage
        var options = new JsonSerializerOptions { Converters = { new FlexibleNullableGuidConverter() } };
        Guid? fromNull = JsonSerializer.Deserialize<Guid?>("null", options);
        Assert.Null(fromNull);

        Guid? fromEmptyStr = JsonSerializer.Deserialize<Guid?>("\"\"", options);
        Assert.Null(fromEmptyStr);

        Guid? fromWhitespace = JsonSerializer.Deserialize<Guid?>("\"   \"", options);
        Assert.Null(fromWhitespace);

        Guid? fromInvalid = JsonSerializer.Deserialize<Guid?>("\"not-a-valid-guid\"", options);
        Assert.Null(fromInvalid);

        Guid? fromNumber = JsonSerializer.Deserialize<Guid?>("12345", options);
        Assert.Null(fromNumber);

        Guid id = Guid.NewGuid();
        Guid? fromValid = JsonSerializer.Deserialize<Guid?>($"\"{id}\"", options);
        Assert.Equal(id, fromValid);

        string serializedNull = JsonSerializer.Serialize<Guid?>(null, options);
        Assert.Equal("null", serializedNull);

        string serializedValid = JsonSerializer.Serialize<Guid?>(id, options);
        Assert.Equal($"\"{id}\"", serializedValid);
    }

    [Fact]
    public async Task EngineRegistrationService_ShareMethodsAndAccessControl_CoversAllBranches()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededAccount owner = await factory.Database.SeedAccountAsync("share-service-owner").ConfigureAwait(true);
        SeededAccount other = await factory.Database.SeedAccountAsync("share-service-other").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, new TestTimeProvider(DateTimeOffset.UtcNow));

        RegistrationOutcome outcome = await regService
            .RegisterAsync(owner.AccountId, owner.LicenseId, "share-engine-test", "Share Test Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        // 1. CheckInstanceAccessAsync: All null identifiers returns true
        bool allNullAccess = await regService.CheckInstanceAccessAsync(instanceId, null, null, null, "Read").ConfigureAwait(true);
        Assert.True(allNullAccess);

        // 2. CheckInstanceAccessAsync: Non-existent instance returns false
        bool missingInstanceAccess = await regService.CheckInstanceAccessAsync(Guid.NewGuid(), owner.AccountId, null, null, "Read").ConfigureAwait(true);
        Assert.False(missingInstanceAccess);

        // 3. CheckInstanceAccessAsync: Owner access returns true
        bool ownerAccess = await regService.CheckInstanceAccessAsync(instanceId, owner.AccountId, null, null, "Control").ConfigureAwait(true);
        Assert.True(ownerAccess);

        // 4. CheckInstanceAccessAsync: Non-owner without share returns false
        bool nonOwnerAccess = await regService.CheckInstanceAccessAsync(instanceId, other.AccountId, null, null, "Control").ConfigureAwait(true);
        Assert.False(nonOwnerAccess);

        // 5. CreateShareAsync: Error cases
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            regService.CreateShareAsync(Guid.NewGuid(), owner.AccountId, "test@test.com", sharedWithUserId: null, expiresAtUtc: DateTimeOffset.UtcNow.AddDays(1)));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            regService.CreateShareAsync(instanceId, other.AccountId, "test@test.com", sharedWithUserId: null, expiresAtUtc: DateTimeOffset.UtcNow.AddDays(1)));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            regService.CreateShareAsync(instanceId, owner.AccountId, "test@test.com", sharedWithUserId: null, expiresAtUtc: DateTimeOffset.UtcNow.AddDays(-1)));

        // 6. Create valid shares for userId and userEmail
        Guid targetUserId = Guid.NewGuid();
        EngineShare userShare = await regService.CreateShareAsync(
            instanceId, owner.AccountId, null, sharedWithUserId: targetUserId,
            expiresAtUtc: DateTimeOffset.UtcNow.AddDays(2), canRead: true, canControl: true, canRunFlows: false).ConfigureAwait(true);

        EngineShare emailShare = await regService.CreateShareAsync(
            instanceId, owner.AccountId, "target@user.com", sharedWithUserId: null,
            expiresAtUtc: DateTimeOffset.UtcNow.AddDays(2), canRead: true, canControl: false, canRunFlows: true).ConfigureAwait(true);

        // 7. GetSharesAsync
        IReadOnlyList<EngineShare> shares = await regService.GetSharesAsync(instanceId).ConfigureAwait(true);
        Assert.Equal(2, shares.Count);

        // 8. CheckInstanceAccessAsync: Test actions Control, RunFlows, Read
        bool userCanControl = await regService.CheckInstanceAccessAsync(instanceId, null, targetUserId, null, "Control").ConfigureAwait(true);
        Assert.True(userCanControl);
        bool userCanRunFlows = await regService.CheckInstanceAccessAsync(instanceId, null, targetUserId, null, "RunFlows").ConfigureAwait(true);
        Assert.False(userCanRunFlows);
        bool userCanRead = await regService.CheckInstanceAccessAsync(instanceId, null, targetUserId, null, "Read").ConfigureAwait(true);
        Assert.True(userCanRead);

        bool emailCanControl = await regService.CheckInstanceAccessAsync(instanceId, null, null, "target@user.com", "Control").ConfigureAwait(true);
        Assert.False(emailCanControl);
        bool emailCanRunFlows = await regService.CheckInstanceAccessAsync(instanceId, null, null, "target@user.com", "RunFlows").ConfigureAwait(true);
        Assert.True(emailCanRunFlows);

        // 9. ListAsync with share filters
        var userInstances = await regService.ListAsync(other.AccountId, userId: targetUserId).ConfigureAwait(true);
        Assert.Contains(userInstances, i => i.Id == instanceId);

        var emailInstances = await regService.ListAsync(other.AccountId, userEmail: "target@user.com").ConfigureAwait(true);
        Assert.Contains(emailInstances, i => i.Id == instanceId);

        // 10. RevokeShareAsync: Error cases and success
        bool missingRevoke = await regService.RevokeShareAsync(Guid.NewGuid(), owner.AccountId).ConfigureAwait(true);
        Assert.False(missingRevoke);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            regService.RevokeShareAsync(userShare.Id, other.AccountId));

        bool revoked = await regService.RevokeShareAsync(userShare.Id, owner.AccountId).ConfigureAwait(true);
        Assert.True(revoked);

        bool revokedAccess = await regService.CheckInstanceAccessAsync(instanceId, null, targetUserId, null, "Read").ConfigureAwait(true);
        Assert.False(revokedAccess);
    }
}
