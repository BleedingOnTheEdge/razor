// -----------------------------------------------------------------------------
// <copyright file="EngineManagementEdgeCaseTests.cs" company="BleedingOnTheEdge">
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
/// Adversarial and edge case tests for Engine Instance Lifecycle Management.
/// Tests key collision resistance, multiple rotations, cascading cleanup,
/// and idempotent revocation states.
/// </summary>
public sealed class EngineManagementEdgeCaseTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task ConsecutiveKeyRotations_GenerateUniqueKeysAndAlwaysInvalidatePredecessors()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        using HttpClient client = factory.CreateAuthorisedClient();

        var generatedKeys = new HashSet<string>(StringComparer.Ordinal);
        generatedKeys.Add(instance.ApiKey);

        string lastKey = instance.ApiKey;

        for (int i = 0; i < 3; i++)
        {
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

            // Verify novelty
            Assert.DoesNotContain(body.ApiKey, generatedKeys);
            generatedKeys.Add(body.ApiKey);
            lastKey = body.ApiKey;

            // Verify database has current hash
            using CloudDbContext db = factory.Database.CreateDbContext();
            EngineInstance stored = await db.EngineInstances.SingleAsync(inst => inst.Id == instance.InstanceId).ConfigureAwait(true);
            Assert.Equal(ApiKeyHasher.Hash(lastKey), stored.ApiKeyHash);
        }
    }

    [Fact]
    public async Task RevokingEngine_IsIdempotent_AndPreservesBannedStatus()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        using HttpClient client = factory.CreateAuthorisedClient();

        // First revocation
        using HttpResponseMessage firstResp = await client.PostAsJsonAsync(
            new Uri($"/api/instances/{instance.InstanceId}/revoke", UriKind.Relative),
            new
            {
                Reason = "Security incident"
            },
            JsonOptions).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NoContent, firstResp.StatusCode);

        // Second revocation (idempotent)
        using HttpResponseMessage secondResp = await client.PostAsJsonAsync(
            new Uri($"/api/instances/{instance.InstanceId}/revoke", UriKind.Relative),
            new
            {
                Reason = "Follow-up audit"
            },
            JsonOptions).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NoContent, secondResp.StatusCode);

        using CloudDbContext db = factory.Database.CreateDbContext();
        EngineInstance stored = await db.EngineInstances.SingleAsync(inst => inst.Id == instance.InstanceId).ConfigureAwait(true);
        Assert.Equal(EngineInstanceStatus.Banned, stored.Status);
        Assert.StartsWith("REVOKED:", stored.ApiKeyHash, StringComparison.Ordinal);
    }

    [Fact]
    public async Task DeleteEngine_CascadesCleanly_WithoutForeignKeyViolations()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        // Add dependent records (extension manifest entry, engine command)
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            var manifestEntry = new ExtensionManifestEntry
            {
                Id = Guid.NewGuid(),
                EngineInstanceId = instance.InstanceId,
                Kind = ExtensionKind.Strategy,
                Name = "AdversarialTestStrategy",
                ReportedAt = DateTimeOffset.UtcNow
            };
            var command = new EngineCommand
            {
                Id = Guid.NewGuid(),
                EngineInstanceId = instance.InstanceId,
                NumericCommandId = 1001,
                CommandType = "Ping",
                CorrelationId = "corr-cascade-" + Guid.NewGuid().ToString("N"),
                Status = CommandStatus.Dispatched,
                SubmittedAt = DateTimeOffset.UtcNow
            };
            db.ExtensionManifestEntries.Add(manifestEntry);
            db.EngineCommands.Add(command);
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage deleteResp = await client.DeleteAsync(
            new Uri($"/api/instances/{instance.InstanceId}", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        // Verify engine and dependent entries/commands are removed
        using CloudDbContext verifyDb = factory.Database.CreateDbContext();
        bool engineExists = await verifyDb.EngineInstances.AnyAsync(i => i.Id == instance.InstanceId).ConfigureAwait(true);
        Assert.False(engineExists);

        bool manifestExists = await verifyDb.ExtensionManifestEntries.AnyAsync(m => m.EngineInstanceId == instance.InstanceId).ConfigureAwait(true);
        Assert.False(manifestExists);

        bool commandsExist = await verifyDb.EngineCommands.AnyAsync(c => c.EngineInstanceId == instance.InstanceId).ConfigureAwait(true);
        Assert.False(commandsExist);
    }

    [Fact]
    public async Task UpdateEngine_AcceptsUnicodeAndSpecialCharacters()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        using HttpClient client = factory.CreateAuthorisedClient();

        string fancyName = "🚀 Quantum Engine - [Tokyo-AZ-1] ⚡ / #99";
        using HttpResponseMessage response = await client.PutAsJsonAsync(
            new Uri($"/api/instances/{instance.InstanceId}", UriKind.Relative),
            new
            {
                Name = fancyName
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        UpdateEngineResponse? body = await response.Content.ReadFromJsonAsync<UpdateEngineResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(body);
        Assert.Equal(fancyName, body.Name);
    }
}
