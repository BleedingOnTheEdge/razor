// -----------------------------------------------------------------------------
// <copyright file="EngineCrudAndProfileEndpointsTests.cs" company="BleedingOnTheEdge">
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
/// Unit and integration tests for engine instance lifecycle operations (rename, rotate key, revoke, delete)
/// and user profile endpoints.
/// </summary>
public sealed class EngineCrudAndProfileEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task UpdateEngine_RenamesInstanceSuccessfully()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await client.PutAsJsonAsync(
            new Uri($"/api/instances/{instance.InstanceId}", UriKind.Relative),
            new
            {
                Name = "Renamed Production Engine"
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        UpdateEngineResponse? body = await response.Content.ReadFromJsonAsync<UpdateEngineResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(body);
        Assert.Equal("Renamed Production Engine", body.Name);

        using CloudDbContext db = factory.Database.CreateDbContext();
        EngineInstance stored = await db.EngineInstances.SingleAsync(i => i.Id == instance.InstanceId).ConfigureAwait(true);
        Assert.Equal("Renamed Production Engine", stored.Name);
    }

    [Fact]
    public async Task UpdateEngine_ReturnsNotFound_WhenInstanceDoesNotExist()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        Guid missingId = Guid.NewGuid();
        using HttpResponseMessage response = await client.PutAsJsonAsync(
            new Uri($"/api/instances/{missingId}", UriKind.Relative),
            new
            {
                Name = "Ghost Engine"
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RotateEngineKey_GeneratesNewApiKeyAndInvalidatesPreviousKey()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await client.PostAsJsonAsync(
            new Uri($"/api/instances/{instance.InstanceId}/rotate-key", UriKind.Relative),
            new
            {
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        RotateEngineKeyResponse? body = await response.Content.ReadFromJsonAsync<RotateEngineKeyResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body.ApiKey));
        Assert.NotEqual(instance.ApiKey, body.ApiKey);

        using CloudDbContext db = factory.Database.CreateDbContext();
        EngineInstance stored = await db.EngineInstances.SingleAsync(i => i.Id == instance.InstanceId).ConfigureAwait(true);
        Assert.Equal(ApiKeyHasher.Hash(body.ApiKey), stored.ApiKeyHash);
    }

    [Fact]
    public async Task RotateEngineKey_ReturnsNotFound_WhenInstanceDoesNotExist()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        Guid missingId = Guid.NewGuid();
        using HttpResponseMessage response = await client.PostAsJsonAsync(
            new Uri($"/api/instances/{missingId}/rotate-key", UriKind.Relative),
            new
            {
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RevokeEngine_InvalidatesKeyAndSetsRevokedHash()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await client.PostAsJsonAsync(
            new Uri($"/api/instances/{instance.InstanceId}/revoke", UriKind.Relative),
            new
            {
                Reason = "Compromised credential during penetration audit."
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        using CloudDbContext db = factory.Database.CreateDbContext();
        EngineInstance stored = await db.EngineInstances.SingleAsync(i => i.Id == instance.InstanceId).ConfigureAwait(true);
        Assert.StartsWith("REVOKED:", stored.ApiKeyHash, StringComparison.Ordinal);
        Assert.Equal(EngineInstanceStatus.Banned, stored.Status);
    }

    [Fact]
    public async Task RevokeEngine_ReturnsNotFound_WhenInstanceDoesNotExist()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        Guid missingId = Guid.NewGuid();
        using HttpResponseMessage response = await client.PostAsJsonAsync(
            new Uri($"/api/instances/{missingId}/revoke", UriKind.Relative),
            new
            {
                Reason = "Compromised"
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteEngine_RemovesInstanceFromCluster()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await client.DeleteAsync(
            new Uri($"/api/instances/{instance.InstanceId}", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        using CloudDbContext db = factory.Database.CreateDbContext();
        bool exists = await db.EngineInstances.AnyAsync(i => i.Id == instance.InstanceId).ConfigureAwait(true);
        Assert.False(exists);

        // Verification: Subsequent GET returns 404 NotFound
        using HttpResponseMessage getResp = await client.GetAsync(
            new Uri($"/api/instances/{instance.InstanceId}", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);
    }

    [Fact]
    public async Task DeleteEngine_ReturnsNotFound_WhenInstanceDoesNotExist()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        Guid missingId = Guid.NewGuid();
        using HttpResponseMessage response = await client.DeleteAsync(
            new Uri($"/api/instances/{missingId}", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetUserProfile_ReturnsProfilePayload()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        using HttpResponseMessage response = await client.GetAsync(
            new Uri("/api/profile", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        UserProfileView? profile = await response.Content.ReadFromJsonAsync<UserProfileView>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(profile);
        Assert.False(string.IsNullOrWhiteSpace(profile.UserName));
    }

    [Fact]
    public async Task UpdateUserProfile_UpdatesBioAndEmail()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        using HttpResponseMessage getInitial = await client.GetAsync(
            new Uri("/api/profile", UriKind.Relative)).ConfigureAwait(true);
        UserProfileView? initial = await getInitial.Content.ReadFromJsonAsync<UserProfileView>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(initial);

        using HttpResponseMessage updateResp = await client.PutAsJsonAsync(
            new Uri("/api/profile", UriKind.Relative),
            new
            {
                UserId = initial.UserId,
                DisplayName = "Chief Quantum Strategist",
                Email = "quantum@hedgefund.internal",
                Bio = "Algorithmic execution and high-frequency market making."
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);
        UserProfileView? updated = await updateResp.Content.ReadFromJsonAsync<UserProfileView>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(updated);
        Assert.Equal("Chief Quantum Strategist", updated.DisplayName);
        Assert.Equal("quantum@hedgefund.internal", updated.Email);
        Assert.Equal("Algorithmic execution and high-frequency market making.", updated.Bio);
    }
}
