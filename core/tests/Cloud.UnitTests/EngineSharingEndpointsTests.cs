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
}
