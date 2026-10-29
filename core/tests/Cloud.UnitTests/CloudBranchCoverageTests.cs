// -----------------------------------------------------------------------------
// <copyright file="CloudBranchCoverageTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.IO;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Cloud.Data;
using Cloud.Endpoints;
using Cloud.Events;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Targeted edge-case and branch coverage tests to satisfy the 95% branch coverage floor.
/// Exercises converters, middleware auth branches, licence expiry boundary conditions,
/// database seeding idempotency, and broadcaster filtering.
/// </summary>
public sealed class CloudBranchCoverageTests
{
    [Fact]
    public void FlexibleNullableGuidConverter_CoversAllBranchConditions()
    {
        var options = new JsonSerializerOptions();
        options.Converters.Add(new FlexibleNullableGuidConverter());

        // 1. Valid Guid string
        Guid expected = Guid.Parse("11111111-2222-3333-4444-555555555555");
        Guid? parsed = JsonSerializer.Deserialize<Guid?>($"\"{expected}\"", options);
        Assert.Equal(expected, parsed);

        // 2. Null or whitespace string
        Guid? emptyParsed = JsonSerializer.Deserialize<Guid?>("\"   \"", options);
        Assert.Null(emptyParsed);

        // 3. Non-Guid string
        Guid? invalidParsed = JsonSerializer.Deserialize<Guid?>("\"not-a-valid-guid\"", options);
        Assert.Null(invalidParsed);

        // 4. Null token
        Guid? nullTokenParsed = JsonSerializer.Deserialize<Guid?>("null", options);
        Assert.Null(nullTokenParsed);

        // 5. Non-string token (number)
        Guid? numberParsed = JsonSerializer.Deserialize<Guid?>("42", options);
        Assert.Null(numberParsed);

        // 6. Serialization with value
        string serializedWithVal = JsonSerializer.Serialize<Guid?>(expected, options);
        Assert.Contains(expected.ToString(), serializedWithVal, StringComparison.Ordinal);

        // 7. Serialization without value (null)
        string serializedNull = JsonSerializer.Serialize<Guid?>(null, options);
        Assert.Equal("null", serializedNull);
    }

    [Fact]
    public void License_IsRunnableAt_EvaluatesTemporalAndStatusBoundaries()
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;

        // 1. Active with null expiry -> runnable
        var unexpiring = new License { Status = LicenseStatus.Active, ExpiresAt = null };
        Assert.True(unexpiring.IsRunnableAt(now));

        // 2. Active with future expiry -> runnable
        var future = new License { Status = LicenseStatus.Active, ExpiresAt = now.AddDays(30) };
        Assert.True(future.IsRunnableAt(now));

        // 3. Active with past expiry -> NOT runnable
        var expired = new License { Status = LicenseStatus.Active, ExpiresAt = now.AddMinutes(-5) };
        Assert.False(expired.IsRunnableAt(now));

        // 4. Suspended with future expiry -> NOT runnable
        var suspended = new License { Status = LicenseStatus.Suspended, ExpiresAt = now.AddDays(30) };
        Assert.False(suspended.IsRunnableAt(now));

        // 5. Revoked with null expiry -> NOT runnable
        var revoked = new License { Status = LicenseStatus.Revoked, ExpiresAt = null };
        Assert.False(revoked.IsRunnableAt(now));
    }

    [Fact]
    public async Task DatabaseSeeder_SeedsIdempotentlyWithoutDuplicates()
    {
        using var testDb = new CloudTestDatabase();
        var hasher = new PasswordHasher<User>();

        // First execution seeds cleanly
        using (CloudDbContext db = testDb.CreateDbContext())
        {
            await DatabaseSeeder.SeedAsync(db, hasher).ConfigureAwait(true);

            Assert.True(await db.Users.AnyAsync(u => u.UserName == "superadmin").ConfigureAwait(true));
            Assert.Equal(4, await db.Users.CountAsync(u => u.Role == UserRole.Operator).ConfigureAwait(true));
            Assert.Equal(42, await db.Users.CountAsync(u => u.Role == UserRole.Trader).ConfigureAwait(true));
            Assert.Equal(18, await db.MarketplaceItems.CountAsync().ConfigureAwait(true));
        }

        // Second execution executes all existing-entity branches idempotently
        using (CloudDbContext db = testDb.CreateDbContext())
        {
            await DatabaseSeeder.SeedAsync(db, hasher).ConfigureAwait(true);

            // Counts should remain exact
            Assert.Equal(1, await db.Users.CountAsync(u => u.UserName == "superadmin").ConfigureAwait(true));
            Assert.Equal(4, await db.Users.CountAsync(u => u.Role == UserRole.Operator).ConfigureAwait(true));
            Assert.Equal(42, await db.Users.CountAsync(u => u.Role == UserRole.Trader).ConfigureAwait(true));
            Assert.Equal(18, await db.MarketplaceItems.CountAsync().ConfigureAwait(true));
        }
    }

    [Fact]
    public async Task ManagementApiKeyMiddleware_ExercisesAllRoutingAndAuthenticationBranches()
    {
        const string expectedKey = "mgmt-secret-key-42";
        var services = new ServiceCollection();
        ServiceProvider sp = services.BuildServiceProvider();

        RequestDelegate BuildPipeline(string? configuredKey)
        {
            var app = new ApplicationBuilder(sp);
            app.UseManagementApiKey(new CloudOptions { ManagementApiKey = configuredKey });
            app.Run(async ctx =>
            {
                ctx.Response.StatusCode = StatusCodes.Status200OK;
                await ctx.Response.WriteAsync("OK").ConfigureAwait(false);
            });
            return app.Build();
        }

        RequestDelegate pipeline = BuildPipeline(expectedKey);

        // 1. OPTIONS request passes without auth
        var optionsCtx = new DefaultHttpContext();
        optionsCtx.Request.Method = HttpMethods.Options;
        optionsCtx.Request.Path = "/api/instances";
        await pipeline(optionsCtx).ConfigureAwait(true);
        Assert.Equal(StatusCodes.Status200OK, optionsCtx.Response.StatusCode);

        // 2. Public bypass paths pass without credentials
        string[] publicBypasses = ["/api/auth/login", "/api/marketplace/items", "/api/community/threads", "/api/events/stream"];
        foreach (string path in publicBypasses)
        {
            var publicCtx = new DefaultHttpContext();
            publicCtx.Request.Path = path;
            await pipeline(publicCtx).ConfigureAwait(true);
            Assert.Equal(StatusCodes.Status200OK, publicCtx.Response.StatusCode);
        }

        // 3. Non-api path passes
        var nonApiCtx = new DefaultHttpContext();
        nonApiCtx.Request.Path = "/healthz";
        await pipeline(nonApiCtx).ConfigureAwait(true);
        Assert.Equal(StatusCodes.Status200OK, nonApiCtx.Response.StatusCode);

        // 4. Protected endpoint without key fails 401
        var unauthCtx = new DefaultHttpContext();
        unauthCtx.Request.Path = "/api/instances";
        await pipeline(unauthCtx).ConfigureAwait(true);
        Assert.Equal(StatusCodes.Status401Unauthorized, unauthCtx.Response.StatusCode);

        // 4b. Mutation endpoints to marketplace, community, tickets fail 401 without key
        string[] unauthMutations = ["/api/marketplace/items", "/api/community/threads", "/api/tickets"];
        foreach (string mutPath in unauthMutations)
        {
            var mutCtx = new DefaultHttpContext();
            mutCtx.Request.Method = HttpMethods.Post;
            mutCtx.Request.Path = mutPath;
            await pipeline(mutCtx).ConfigureAwait(true);
            Assert.Equal(StatusCodes.Status401Unauthorized, mutCtx.Response.StatusCode);
        }

        // 5. Protected endpoint with valid HeaderName passes
        var headerCtx = new DefaultHttpContext();
        headerCtx.Request.Path = "/api/instances";
        headerCtx.Request.Headers[ManagementApiKeyMiddleware.HeaderName] = expectedKey;
        await pipeline(headerCtx).ConfigureAwait(true);
        Assert.Equal(StatusCodes.Status200OK, headerCtx.Response.StatusCode);

        // 6. Protected endpoint with valid Authorization Bearer passes
        var bearerCtx = new DefaultHttpContext();
        bearerCtx.Request.Path = "/api/instances";
        bearerCtx.Request.Headers.Authorization = $"Bearer {expectedKey}";
        await pipeline(bearerCtx).ConfigureAwait(true);
        Assert.Equal(StatusCodes.Status200OK, bearerCtx.Response.StatusCode);

        // 7. Protected endpoint with invalid Authorization Bearer fails 401
        var badBearerCtx = new DefaultHttpContext();
        badBearerCtx.Request.Path = "/api/instances";
        badBearerCtx.Request.Headers.Authorization = "Bearer wrong-secret";
        await pipeline(badBearerCtx).ConfigureAwait(true);
        Assert.Equal(StatusCodes.Status401Unauthorized, badBearerCtx.Response.StatusCode);

        // 8. Protected endpoint with valid query param passes
        var queryCtx = new DefaultHttpContext();
        queryCtx.Request.Path = "/api/instances";
        queryCtx.Request.QueryString = new QueryString($"?apiKey={expectedKey}");
        await pipeline(queryCtx).ConfigureAwait(true);
        Assert.Equal(StatusCodes.Status200OK, queryCtx.Response.StatusCode);

        // 9. Protected endpoint with invalid query param fails 401
        var badQueryCtx = new DefaultHttpContext();
        badQueryCtx.Request.Path = "/api/instances";
        badQueryCtx.Request.QueryString = new QueryString("?apiKey=bad-token");
        await pipeline(badQueryCtx).ConfigureAwait(true);
        Assert.Equal(StatusCodes.Status401Unauthorized, badQueryCtx.Response.StatusCode);

        // 10. Pipeline with null or empty configured key rejects all protected calls
        RequestDelegate emptyKeyPipeline = BuildPipeline(string.Empty);
        var rejectedCtx = new DefaultHttpContext();
        rejectedCtx.Request.Path = "/api/instances";
        rejectedCtx.Request.Headers[ManagementApiKeyMiddleware.HeaderName] = "any";
        await emptyKeyPipeline(rejectedCtx).ConfigureAwait(true);
        Assert.Equal(StatusCodes.Status401Unauthorized, rejectedCtx.Response.StatusCode);
    }

    [Fact]
    public async Task ClientEventBroadcaster_FiltersByInstanceId_AndManagesSubscriptions()
    {
        var broadcaster = new ClientEventBroadcaster();
        Guid targetInstance = Guid.NewGuid();
        Guid otherInstance = Guid.NewGuid();

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        await using IAsyncEnumerator<ClientEvent> filteredEnum = broadcaster.SubscribeAsync(targetInstance, cts.Token).GetAsyncEnumerator(cts.Token);
        await using IAsyncEnumerator<ClientEvent> allEnum = broadcaster.SubscribeAsync(null, cts.Token).GetAsyncEnumerator(cts.Token);

        Task<bool> filteredReadTask = filteredEnum.MoveNextAsync().AsTask();
        Task<bool> allReadTask = allEnum.MoveNextAsync().AsTask();

        Assert.True(SpinWait.SpinUntil(() => broadcaster.ActiveSubscriptionsCount == 2, 1000));

        // Publish event for targetInstance
        var ev1 = new ClientEvent("heartbeat", targetInstance, null, null, DateTimeOffset.UtcNow, new
        {
        });
        await broadcaster.PublishAsync(ev1, CancellationToken.None).ConfigureAwait(true);

        // Publish event for otherInstance
        var ev2 = new ClientEvent("status", otherInstance, null, null, DateTimeOffset.UtcNow, new
        {
        });
        await broadcaster.PublishAsync(ev2, CancellationToken.None).ConfigureAwait(true);

        // Read from filteredEnum: should get ev1
        Assert.True(await filteredReadTask.ConfigureAwait(true));
        Assert.Equal(targetInstance, filteredEnum.Current.InstanceId);

        // Read from allEnum: should get ev1 then ev2
        Assert.True(await allReadTask.ConfigureAwait(true));
        Assert.Equal(targetInstance, allEnum.Current.InstanceId);

        Assert.True(await allEnum.MoveNextAsync().ConfigureAwait(true));
        Assert.Equal(otherInstance, allEnum.Current.InstanceId);
    }

    [Fact]
    public async Task CommunityService_HandlesBadgeDefaultsAndMissingThreads()
    {
        using var testDb = new CloudTestDatabase();
        var community = new CommunityService(testDb, TimeProvider.System);

        // 1. Replying to non-existent thread returns null
        CommunityReply? missing = await community.AddReplyAsync(
            Guid.NewGuid(),
            "alice",
            "Badge",
            "Reply text").ConfigureAwait(true);
        Assert.Null(missing);

        // 2. Create thread and reply with empty badge -> defaults to "Community"
        CommunityThread thread = await community.CreateThreadAsync(
            "General",
            "Market Discussion",
            "Welcome everyone",
            "bob",
            "Trader").ConfigureAwait(true);

        CommunityReply? reply1 = await community.AddReplyAsync(
            thread.Id,
            "charlie",
            "   ",
            "Hello there").ConfigureAwait(true);
        Assert.NotNull(reply1);
        Assert.Equal("Community", reply1.AuthorBadge);

        // 3. Reply with non-empty badge preserves custom badge
        CommunityReply? reply2 = await community.AddReplyAsync(
            thread.Id,
            "dave",
            "Pro Analyst",
            "Analysis content").ConfigureAwait(true);
        Assert.NotNull(reply2);
        Assert.Equal("Pro Analyst", reply2.AuthorBadge);
    }

    [Fact]
    public async Task FlowOrchestrator_CoversCommandDispatchAndEventBroadcaster()
    {
        using var testDb = new CloudTestDatabase();
        var lineageService = new LineageService(testDb, TimeProvider.System, Microsoft.Extensions.Logging.Abstractions.NullLogger<LineageService>.Instance);
        var broadcaster = new ClientEventBroadcaster();
        var cmdService = new CommandService(testDb, new CloudOptions(), TimeProvider.System, Microsoft.Extensions.Logging.Abstractions.NullLogger<CommandService>.Instance);
        var sut = new FlowOrchestrator(
            testDb,
            lineageService,
            TimeProvider.System,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<FlowOrchestrator>.Instance,
            broadcaster,
            cmdService);

        SeededAccount account = await testDb.SeedAccountAsync().ConfigureAwait(true);
        EngineInstance instance = await testDb.SeedEngineInstanceAsync(account.AccountId, account.LicenseId).ConfigureAwait(true);

        // Optimization (1201) with configurationJson
        FlowRun optRun = await sut.StartOriginalRunAsync(
            instance.Id,
            RunKind.Optimization,
            baseSeed: 100,
            configurationJson: "{\"strategy\":\"fast\"}").ConfigureAwait(true);
        Assert.Equal(RunStatus.Running, optRun.Status);
        Assert.Equal("{\"strategy\":\"fast\"}", optRun.ConfigurationJson);

        // WalkForward (1202) without configurationJson
        FlowRun wfRun = await sut.StartOriginalRunAsync(
            instance.Id,
            RunKind.WalkForward,
            baseSeed: 200,
            configurationJson: null).ConfigureAwait(true);
        Assert.Equal(RunStatus.Running, wfRun.Status);

        // Backtest (1200) default
        FlowRun btRun = await sut.StartOriginalRunAsync(
            instance.Id,
            RunKind.Backtest,
            baseSeed: 300,
            configurationJson: "{}").ConfigureAwait(true);
        Assert.Equal(RunStatus.Running, btRun.Status);

        // Pause with event broadcaster
        FlowRun paused = await sut.PauseRunAsync(optRun.Id).ConfigureAwait(true);
        Assert.Equal(RunStatus.Paused, paused.Status);
    }

    [Fact]
    public async Task UserProfileEndpoints_CoverBranchConditions()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        // 1. Get profile by username query
        using HttpResponseMessage respUser = await client.GetAsync(
            new Uri("/api/profile?userName=admin", UriKind.Relative)).ConfigureAwait(true);
        using JsonDocument doc = await respUser.Content.ReadFromJsonAsync<JsonDocument>().ConfigureAwait(true) ?? throw new InvalidOperationException();
        string? username = doc.RootElement.GetProperty("userName").GetString();
        string? userIdStr = doc.RootElement.GetProperty("userId").GetString();
        Assert.Equal("admin", username);

        // 2. Get profile by specific userId query
        using HttpResponseMessage respId = await client.GetAsync(
            new Uri($"/api/profile?userId={userIdStr}", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, respId.StatusCode);

        // 3. Update profile with Guid.Empty (default user fallback)
        using HttpResponseMessage updateDefault = await client.PutAsJsonAsync(
            new Uri("/api/profile", UriKind.Relative),
            new
            {
                UserId = Guid.Empty,
                DisplayName = "Default Superadmin"
            }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, updateDefault.StatusCode);

        // 4. Update profile for non-existent user returns 404
        using HttpResponseMessage updateMissing = await client.PutAsJsonAsync(
            new Uri("/api/profile", UriKind.Relative),
            new
            {
                UserId = Guid.NewGuid(),
                DisplayName = "Missing User"
            }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, updateMissing.StatusCode);
    }
}

