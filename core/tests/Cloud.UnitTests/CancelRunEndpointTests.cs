// -----------------------------------------------------------------------------
// <copyright file="CancelRunEndpointTests.cs" company="BleedingOnTheEdge">
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
/// Integration tests for CancelRunEndpoint.
/// </summary>
public sealed class CancelRunEndpointTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task CancelRun_ReturnsNotFound_WhenRunDoesNotExist()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        Guid missingRunId = Guid.NewGuid();
        using HttpResponseMessage response = await client.PostAsync(
            new Uri($"/api/runs/{missingRunId}/cancel", UriKind.Relative),
            null).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CancelRun_TransitionsRunToCancelled_WhenRunIsActive()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount seeded = await factory.Database.SeedAccountAsync("cancel-owner").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, new TestTimeProvider(DateTimeOffset.UtcNow));
        RegistrationOutcome outcome = await regService
            .RegisterAsync(seeded.AccountId, seeded.LicenseId, "engine-cancel-1", "Cancel Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        Guid runId = Guid.NewGuid();
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            var run = new FlowRun
            {
                Id = runId,
                EngineInstanceId = instanceId,
                Kind = RunKind.Optimization,
                Status = RunStatus.Running,
                BaseSeed = 42,
                ConfigurationJson = "{}",
                CreatedAt = DateTimeOffset.UtcNow
            };
            db.FlowRuns.Add(run);
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        using HttpResponseMessage response = await client.PostAsync(
            new Uri($"/api/runs/{runId}/cancel", UriKind.Relative),
            null).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        FlowRunView? view = await response.Content.ReadFromJsonAsync<FlowRunView>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(view);
        Assert.Equal(RunStatus.Cancelled, view.Status);

        using CloudDbContext verifyDb = factory.Database.CreateDbContext();
        FlowRun stored = await verifyDb.FlowRuns.SingleAsync(r => r.Id == runId).ConfigureAwait(true);
        Assert.Equal(RunStatus.Cancelled, stored.Status);
    }
}
