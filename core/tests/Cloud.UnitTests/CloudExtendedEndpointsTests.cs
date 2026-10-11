// -----------------------------------------------------------------------------
// <copyright file="CloudExtendedEndpointsTests.cs" company="BleedingOnTheEdge">
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
using Cloud.Events;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Verifies the expanded HTTP endpoints and real-time streaming surface exposed for frontend dashboards and marketplace.
/// </summary>
public sealed class CloudExtendedEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private static async Task<T?> ReadJsonAsync<T>(HttpResponseMessage response)
    {
        return await response.Content.ReadFromJsonAsync<T>(JsonOptions).ConfigureAwait(true);
    }

    private static Uri Relative(string url) => new(url, UriKind.Relative);

    private static async Task<HttpResponseMessage> GetRelativeAsync(HttpClient client, string url) =>
        await client.GetAsync(Relative(url)).ConfigureAwait(true);

    private static async Task<HttpResponseMessage> PostRelativeAsync(HttpClient client, string url, HttpContent? content = null) =>
        await client.PostAsync(Relative(url), content).ConfigureAwait(true);

    private static async Task<HttpResponseMessage> PostJsonRelativeAsync<T>(HttpClient client, string url, T body) =>
        await client.PostAsJsonAsync(Relative(url), body, JsonOptions).ConfigureAwait(true);

    [Fact]
    public async Task ListInstances_ReturnsAllRegisteredInstancesWithConnectionState()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await GetRelativeAsync(client, "/api/instances").ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<InstanceListItemView>? list = await ReadJsonAsync<List<InstanceListItemView>>(response).ConfigureAwait(true);

        Assert.NotNull(list);
        Assert.Single(list);
        Assert.Equal(instance.InstanceId, list[0].InstanceId);
        Assert.False(list[0].IsConnected);

        // Filter by account ID
        using HttpResponseMessage filteredResp = await GetRelativeAsync(client, $"/api/instances?accountId={instance.AccountId}").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, filteredResp.StatusCode);
        List<InstanceListItemView>? filteredList = await ReadJsonAsync<List<InstanceListItemView>>(filteredResp).ConfigureAwait(true);
        Assert.NotNull(filteredList);
        Assert.Single(filteredList);
    }

    [Fact]
    public async Task GetInstanceManifest_ReturnsReportedCatalogueEntries()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            db.ExtensionManifestEntries.Add(new ExtensionManifestEntry
            {
                Id = Guid.NewGuid(),
                EngineInstanceId = instance.InstanceId,
                Kind = ExtensionKind.Strategy,
                Name = "TrendFollowingStrategy",
                ReportedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await GetRelativeAsync(client, $"/api/instances/{instance.InstanceId}/manifest").ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<ManifestEntryView>? manifest = await ReadJsonAsync<List<ManifestEntryView>>(response).ConfigureAwait(true);

        Assert.NotNull(manifest);
        Assert.Single(manifest);
        Assert.Equal("TrendFollowingStrategy", manifest[0].Name);
        Assert.Equal(ExtensionKind.Strategy, manifest[0].Kind);

        // Unknown instance returns 404
        using HttpResponseMessage notFoundResp = await GetRelativeAsync(client, $"/api/instances/{Guid.NewGuid()}/manifest").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, notFoundResp.StatusCode);
    }

    [Fact]
    public async Task ListInstanceCommands_ReturnsCommandHistory()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            db.EngineCommands.Add(new EngineCommand
            {
                Id = Guid.NewGuid(),
                EngineInstanceId = instance.InstanceId,
                CommandType = "RunBacktest",
                CorrelationId = "corr-101",
                Status = CommandStatus.Pending,
                SubmittedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await GetRelativeAsync(client, $"/api/instances/{instance.InstanceId}/commands").ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<CommandListItemView>? commands = await ReadJsonAsync<List<CommandListItemView>>(response).ConfigureAwait(true);

        Assert.NotNull(commands);
        Assert.Single(commands);
        Assert.Equal("RunBacktest", commands[0].CommandType);
        Assert.Equal("corr-101", commands[0].CorrelationId);

        // Filter by Pending status
        using HttpResponseMessage pendingResp = await GetRelativeAsync(client, $"/api/instances/{instance.InstanceId}/commands?status=Pending").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, pendingResp.StatusCode);
        List<CommandListItemView>? pendingCommands = await ReadJsonAsync<List<CommandListItemView>>(pendingResp).ConfigureAwait(true);
        Assert.NotNull(pendingCommands);
        Assert.Single(pendingCommands);

        // Filter by Completed status returns empty list
        using HttpResponseMessage completedResp = await GetRelativeAsync(client, $"/api/instances/{instance.InstanceId}/commands?status=Completed").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, completedResp.StatusCode);
        List<CommandListItemView>? completedCommands = await ReadJsonAsync<List<CommandListItemView>>(completedResp).ConfigureAwait(true);
        Assert.NotNull(completedCommands);
        Assert.Empty(completedCommands);
    }

    [Fact]
    public async Task FlowRunEndpoints_LifecycleAndTransitionsSucceed()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();

        // 1. Start original run
        var startRequest = new StartRunRequest
        {
            InstanceId = instance.InstanceId,
            Kind = RunKind.Backtest,
            BaseSeed = 42
        };
        using HttpResponseMessage startResp = await PostJsonRelativeAsync(client, "/api/runs", startRequest).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Created, startResp.StatusCode);
        FlowRunView? createdRun = await ReadJsonAsync<FlowRunView>(startResp).ConfigureAwait(true);
        Assert.NotNull(createdRun);
        Assert.Equal(RunStatus.Running, createdRun.Status);

        // 2. Get run
        using HttpResponseMessage getResp = await GetRelativeAsync(client, $"/api/runs/{createdRun.Id}").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        FlowRunView? fetchedRun = await ReadJsonAsync<FlowRunView>(getResp).ConfigureAwait(true);
        Assert.NotNull(fetchedRun);
        Assert.Equal(createdRun.Id, fetchedRun.Id);

        // 3. Pause run
        using HttpResponseMessage pauseResp = await PostRelativeAsync(client, $"/api/runs/{createdRun.Id}/pause").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, pauseResp.StatusCode);
        FlowRunView? pausedRun = await ReadJsonAsync<FlowRunView>(pauseResp).ConfigureAwait(true);
        Assert.NotNull(pausedRun);
        Assert.Equal(RunStatus.Paused, pausedRun.Status);

        // 4. Resume run
        var resumeRequest = new ResumeRunRequest
        {
            ForkPoint = new ForkPoint(Step: 10),
            Intervention = new InterventionSpecification(
                StepIndex: 10,
                PreviousFingerprint: "fp1",
                NewFingerprint: "fp2",
                Actor: "operator",
                Reason: "Adjusted parameters")
        };
        using HttpResponseMessage resumeResp = await PostJsonRelativeAsync(client, $"/api/runs/{createdRun.Id}/resume", resumeRequest).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, resumeResp.StatusCode);
        FlowRunView? resumedRun = await ReadJsonAsync<FlowRunView>(resumeResp).ConfigureAwait(true);
        Assert.NotNull(resumedRun);
        Assert.Equal(RunStatus.Running, resumedRun.Status);

        // 5. Complete run with metrics
        var completeRequest = new CompleteRunRequest
        {
            NetProfit = 1500.50m,
            TotalReturn = 15.0m,
            SharpeRatio = 2.1,
            MaxDrawdown = 0.08,
            TradeCount = 42,
            BestFitness = 0.95
        };
        using HttpResponseMessage completeResp = await PostJsonRelativeAsync(client, $"/api/runs/{resumedRun.Id}/complete", completeRequest).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, completeResp.StatusCode);
        FlowRunView? completedRun = await ReadJsonAsync<FlowRunView>(completeResp).ConfigureAwait(true);
        Assert.NotNull(completedRun);
        Assert.Equal(RunStatus.Completed, completedRun.Status);
        Assert.Equal(1500.50m, completedRun.NetProfit);

        // 6. List runs for instance
        using HttpResponseMessage listResp = await GetRelativeAsync(client, $"/api/instances/{instance.InstanceId}/runs").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        List<FlowRunView>? runsList = await ReadJsonAsync<List<FlowRunView>>(listResp).ConfigureAwait(true);
        Assert.NotNull(runsList);
        Assert.Equal(2, runsList.Count);
        Assert.Contains(runsList, r => r.Id == createdRun.Id);
        Assert.Contains(runsList, r => r.Id == resumedRun.Id);
    }

    [Fact]
    public async Task GetRunReport_GeneratesAccurateAuditableReport()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        LineageService lineage = factory.Services.GetRequiredService<LineageService>();

        FlowRun run = await lineage.CreateOriginalRunAsync(instance.InstanceId, RunKind.Backtest).ConfigureAwait(true);

        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            FlowRun tracked = await db.FlowRuns.FirstAsync(r => r.Id == run.Id).ConfigureAwait(true);
            tracked.Status = RunStatus.Completed;
            tracked.NetProfit = 5000m;
            tracked.TotalReturn = 50m;
            tracked.SharpeRatio = 2.5;
            tracked.MaxDrawdown = 0.10;
            tracked.TradeCount = 100;
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await GetRelativeAsync(client, $"/api/runs/{run.Id}/report").ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        RunReport? report = await ReadJsonAsync<RunReport>(response).ConfigureAwait(true);

        Assert.NotNull(report);
        Assert.Equal(run.Id, report.RunId);
        Assert.False(report.IsPartial);
        Assert.False(report.HeadlineFiguresSuppressed);
        Assert.True(report.IsComparable);
        Assert.NotNull(report.Aggregates);
        Assert.Equal(5000m, report.Aggregates.NetProfit);

        // Unknown run returns 404
        using HttpResponseMessage notFoundReport = await GetRelativeAsync(client, $"/api/runs/{Guid.NewGuid()}/report").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, notFoundReport.StatusCode);
    }

    [Fact]
    public async Task GetRunReport_SuppressesHeadlineFiguresWhenGapped()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        LineageService lineage = factory.Services.GetRequiredService<LineageService>();

        FlowRun run = await lineage.CreateOriginalRunAsync(instance.InstanceId, RunKind.Backtest).ConfigureAwait(true);
        await lineage.RecordGapAsync(run.Id, new GapSpecification(10, 20, "Feed outage")).ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await GetRelativeAsync(client, $"/api/runs/{run.Id}/report").ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        RunReport? report = await ReadJsonAsync<RunReport>(response).ConfigureAwait(true);

        Assert.NotNull(report);
        Assert.True(report.IsPartial);
        Assert.True(report.HeadlineFiguresSuppressed);
        Assert.False(report.IsComparable);
        Assert.NotNull(report.Aggregates);
        Assert.Null(report.Aggregates.NetProfit);
        Assert.Null(report.Aggregates.SharpeRatio);
        Assert.NotNull(report.WarningMessage);
    }

    [Fact]
    public async Task GetRunRanking_RanksRunsAccordingToMetric()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        LineageService lineage = factory.Services.GetRequiredService<LineageService>();

        FlowRun run1 = await lineage.CreateOriginalRunAsync(instance.InstanceId, RunKind.Backtest).ConfigureAwait(true);
        FlowRun run2 = await lineage.CreateOriginalRunAsync(instance.InstanceId, RunKind.Backtest).ConfigureAwait(true);

        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            FlowRun r1 = await db.FlowRuns.FirstAsync(r => r.Id == run1.Id).ConfigureAwait(true);
            r1.NetProfit = 1000m;
            FlowRun r2 = await db.FlowRuns.FirstAsync(r => r.Id == run2.Id).ConfigureAwait(true);
            r2.NetProfit = 3000m;
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await GetRelativeAsync(client, $"/api/instances/{instance.InstanceId}/runs/ranking?metric=NetProfit").ConfigureAwait(true);

        if (response.StatusCode != HttpStatusCode.OK)
        {
            string err = await response.Content.ReadAsStringAsync().ConfigureAwait(true);
            Assert.Fail($"Status was {response.StatusCode}, body: {err}");
        }

        List<RankedRunResult>? results = await ReadJsonAsync<List<RankedRunResult>>(response).ConfigureAwait(true);

        Assert.NotNull(results);
        Assert.Equal(2, results.Count);
        Assert.Equal(run2.Id, results[0].RunId);
        Assert.Equal(1, results[0].Rank);
        Assert.Equal(3000.0, results[0].Score);
        Assert.Equal(run1.Id, results[1].RunId);
        Assert.Equal(2, results[1].Rank);
    }

    [Fact]
    public async Task MarketplaceEndpoints_PublishSearchAndAcquireFlowSucceeds()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededAccount account = await factory.Database.SeedAccountAsync().ConfigureAwait(true);
        MarketplaceService marketplace = factory.Services.GetRequiredService<MarketplaceService>();

        MarketplaceItem item = await marketplace.PublishItemAsync(
            "VolBreakout",
            ExtensionKind.Strategy,
            "1.2.0",
            "QuantMaster",
            "Volatility breakout trading system",
            99.0m,
            "1.0.0",
            isCurated: true).ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();

        // 1. Search items
        using HttpResponseMessage searchResp = await GetRelativeAsync(client, "/api/marketplace/items?query=breakout").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, searchResp.StatusCode);
        List<MarketplaceItemView>? items = await ReadJsonAsync<List<MarketplaceItemView>>(searchResp).ConfigureAwait(true);
        Assert.NotNull(items);
        Assert.Single(items);
        Assert.Equal(item.Id, items[0].Id);
        Assert.Equal("VolBreakout", items[0].Name);

        // 2. Get single item
        using HttpResponseMessage getResp = await GetRelativeAsync(client, $"/api/marketplace/items/{item.Id}").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        MarketplaceItemView? fetched = await ReadJsonAsync<MarketplaceItemView>(getResp).ConfigureAwait(true);
        Assert.NotNull(fetched);
        Assert.Equal(item.Id, fetched.Id);

        // 3. Acquire item
        var acquireReq = new AcquireMarketplaceItemRequest
        {
            ItemId = item.Id,
            AccountId = account.AccountId
        };
        using HttpResponseMessage acqResp = await PostJsonRelativeAsync(client, $"/api/marketplace/items/{item.Id}/acquire", acquireReq).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Created, acqResp.StatusCode);
        AcquisitionResponseView? acq = await ReadJsonAsync<AcquisitionResponseView>(acqResp).ConfigureAwait(true);
        Assert.NotNull(acq);
        Assert.Equal(item.Id, acq.ItemId);
        Assert.False(string.IsNullOrWhiteSpace(acq.LicenseKey));

        // Unknown item returns 404
        using HttpResponseMessage notFoundItem = await GetRelativeAsync(client, $"/api/marketplace/items/{Guid.NewGuid()}").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, notFoundItem.StatusCode);
    }

    [Fact]
    public async Task SwaggerDocument_IsGeneratedAndAccessible()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateClient();

        using HttpResponseMessage response = await GetRelativeAsync(client, "/swagger/v1/swagger.json").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string content = await response.Content.ReadAsStringAsync().ConfigureAwait(true);
        Assert.Contains("Razor Cloud Control Plane API", content, StringComparison.Ordinal);
        Assert.Contains("/api/instances", content, StringComparison.Ordinal);
        Assert.Contains("/api/runs", content, StringComparison.Ordinal);
        Assert.Contains("/api/marketplace/items", content, StringComparison.Ordinal);
    }

    [Fact]
    public async Task BranchRunEndpoint_ValidAndErrorCasesSucceed()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        using HttpClient client = factory.CreateAuthorisedClient();

        var startReq = new StartRunRequest { InstanceId = instance.InstanceId, Kind = RunKind.Backtest, BaseSeed = 100 };
        using HttpResponseMessage startResp = await PostJsonRelativeAsync(client, "/api/runs", startReq).ConfigureAwait(true);
        FlowRunView? run = await ReadJsonAsync<FlowRunView>(startResp).ConfigureAwait(true);
        Assert.NotNull(run);

        // Branching with missing reason should return 400
        var badBranchReq = new BranchRunRequest
        {
            ForkPoint = new ForkPoint(Step: 20),
            Intervention = new InterventionSpecification(20, "fp1", "fp2", "tester", "   ")
        };
        using HttpResponseMessage badBranchResp = await PostJsonRelativeAsync(client, $"/api/runs/{run.Id}/branch", badBranchReq).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, badBranchResp.StatusCode);

        // Branching unknown run should return 404
        var validBranchReq = new BranchRunRequest
        {
            ForkPoint = new ForkPoint(Step: 20),
            Intervention = new InterventionSpecification(20, "fp1", "fp2", "tester", "Branching for test")
        };
        using HttpResponseMessage notFoundBranchResp = await PostJsonRelativeAsync(client, $"/api/runs/{Guid.NewGuid()}/branch", validBranchReq).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, notFoundBranchResp.StatusCode);

        // Valid branch succeeds
        using HttpResponseMessage branchResp = await PostJsonRelativeAsync(client, $"/api/runs/{run.Id}/branch", validBranchReq).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, branchResp.StatusCode);
        FlowRunView? branched = await ReadJsonAsync<FlowRunView>(branchResp).ConfigureAwait(true);
        Assert.NotNull(branched);
        Assert.Equal(run.Id, branched.ParentRunId);
        Assert.Equal(RunRelation.Branched, branched.Relation);
    }

    [Fact]
    public async Task ReplayRunEndpoint_ValidAndErrorCasesSucceed()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        using HttpClient client = factory.CreateAuthorisedClient();

        var startReq = new StartRunRequest { InstanceId = instance.InstanceId, Kind = RunKind.Backtest, BaseSeed = 200 };
        using HttpResponseMessage startResp = await PostJsonRelativeAsync(client, "/api/runs", startReq).ConfigureAwait(true);
        FlowRunView? run = await ReadJsonAsync<FlowRunView>(startResp).ConfigureAwait(true);
        Assert.NotNull(run);

        // Replay unknown run should return 404
        var notFoundReplayReq = new ReplayRunRequest
        {
            BaseRunId = Guid.NewGuid(),
            ForkPoint = new ForkPoint(Step: 5),
            Interventions = [new InterventionSpecification(5, "a", "b", "tester", "Replay reason")]
        };
        using HttpResponseMessage notFoundReplayResp = await PostJsonRelativeAsync(client, "/api/runs/replay", notFoundReplayReq).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, notFoundReplayResp.StatusCode);

        // Valid replay succeeds
        var validReplayReq = new ReplayRunRequest
        {
            BaseRunId = run.Id,
            ForkPoint = new ForkPoint(Step: 5),
            Interventions = [new InterventionSpecification(5, "a", "b", "tester", "Replay reason")],
            ChildSeed = 201
        };
        using HttpResponseMessage replayResp = await PostJsonRelativeAsync(client, "/api/runs/replay", validReplayReq).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, replayResp.StatusCode);
        FlowRunView? replayed = await ReadJsonAsync<FlowRunView>(replayResp).ConfigureAwait(true);
        Assert.NotNull(replayed);
        Assert.Equal(run.Id, replayed.ParentRunId);
        Assert.Equal(RunRelation.Spliced, replayed.Relation);
    }

    [Fact]
    public async Task RunGapEndpoints_RecordAndRetrieveGapsSucceed()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        using HttpClient client = factory.CreateAuthorisedClient();

        var startReq = new StartRunRequest { InstanceId = instance.InstanceId, Kind = RunKind.Backtest, BaseSeed = 300 };
        using HttpResponseMessage startResp = await PostJsonRelativeAsync(client, "/api/runs", startReq).ConfigureAwait(true);
        FlowRunView? run = await ReadJsonAsync<FlowRunView>(startResp).ConfigureAwait(true);
        Assert.NotNull(run);

        // Record gap without reason returns 400
        var badGap = new RecordRunGapRequest { StartStep = 10, EndStep = 20, Reason = "  " };
        using HttpResponseMessage badGapResp = await PostJsonRelativeAsync(client, $"/api/runs/{run.Id}/gaps", badGap).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, badGapResp.StatusCode);

        // Record gap with unknown run returns 404
        var validGap = new RecordRunGapRequest { StartStep = 10, EndStep = 20, Reason = "Packet loss" };
        using HttpResponseMessage notFoundGapResp = await PostJsonRelativeAsync(client, $"/api/runs/{Guid.NewGuid()}/gaps", validGap).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, notFoundGapResp.StatusCode);

        // Valid gap record succeeds (201 Created)
        using HttpResponseMessage gapResp = await PostJsonRelativeAsync(client, $"/api/runs/{run.Id}/gaps", validGap).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Created, gapResp.StatusCode);
        GapView? createdGap = await ReadJsonAsync<GapView>(gapResp).ConfigureAwait(true);
        Assert.NotNull(createdGap);
        Assert.Equal(10, createdGap.StartStep);
        Assert.Equal(20, createdGap.EndStep);
        Assert.Equal("Packet loss", createdGap.Reason);

        // Retrieve gaps
        using HttpResponseMessage getGapsResp = await GetRelativeAsync(client, $"/api/runs/{run.Id}/gaps").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, getGapsResp.StatusCode);
        List<GapView>? gaps = await ReadJsonAsync<List<GapView>>(getGapsResp).ConfigureAwait(true);
        Assert.NotNull(gaps);
        Assert.Single(gaps);
        Assert.Equal(createdGap.Id, gaps[0].Id);
    }

    [Fact]
    public async Task RunInterventionsAndLineageEndpoints_RetrieveDetailsSucceed()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        using HttpClient client = factory.CreateAuthorisedClient();

        var startReq = new StartRunRequest { InstanceId = instance.InstanceId, Kind = RunKind.Backtest, BaseSeed = 400 };
        using HttpResponseMessage startResp = await PostJsonRelativeAsync(client, "/api/runs", startReq).ConfigureAwait(true);
        FlowRunView? run = await ReadJsonAsync<FlowRunView>(startResp).ConfigureAwait(true);
        Assert.NotNull(run);

        // Pause then resume with intervention
        using HttpResponseMessage pauseResp = await PostRelativeAsync(client, $"/api/runs/{run.Id}/pause").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, pauseResp.StatusCode);

        var resumeReq = new ResumeRunRequest
        {
            ForkPoint = new ForkPoint(Step: 15),
            Intervention = new InterventionSpecification(15, "hashA", "hashB", "operator", "Manual correction")
        };
        using HttpResponseMessage resumeResp = await PostJsonRelativeAsync(client, $"/api/runs/{run.Id}/resume", resumeReq).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, resumeResp.StatusCode);
        FlowRunView? child = await ReadJsonAsync<FlowRunView>(resumeResp).ConfigureAwait(true);
        Assert.NotNull(child);

        // Get interventions for child run
        using HttpResponseMessage intervResp = await GetRelativeAsync(client, $"/api/runs/{child.Id}/interventions").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, intervResp.StatusCode);
        List<InterventionView>? interventions = await ReadJsonAsync<List<InterventionView>>(intervResp).ConfigureAwait(true);
        Assert.NotNull(interventions);
        Assert.Single(interventions);
        Assert.Equal("Manual correction", interventions[0].Reason);
        Assert.Equal("operator", interventions[0].Actor);

        // Get lineage tree for child run
        using HttpResponseMessage lineageResp = await GetRelativeAsync(client, $"/api/runs/{child.Id}/lineage").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, lineageResp.StatusCode);
        LineageNode? rootNode = await ReadJsonAsync<LineageNode>(lineageResp).ConfigureAwait(true);
        Assert.NotNull(rootNode);
        Assert.Equal(run.Id, rootNode.RunId);
        Assert.Single(rootNode.Children);
        Assert.Equal(child.Id, rootNode.Children[0].RunId);

        // Lineage for unknown run returns 404
        using HttpResponseMessage notFoundLineage = await GetRelativeAsync(client, $"/api/runs/{Guid.NewGuid()}/lineage").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, notFoundLineage.StatusCode);
    }

    [Fact]
    public async Task StreamClientEvents_ConnectsAndStreamsEvents()
    {
        using var factory = new CloudWebApplicationFactory();
        IClientEventBroadcaster broadcaster = factory.Services.GetRequiredService<IClientEventBroadcaster>();
        using HttpClient client = factory.CreateAuthorisedClient();

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        using var request = new HttpRequestMessage(HttpMethod.Get, Relative("/api/events/stream"));
        using HttpResponseMessage response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cts.Token).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/event-stream", response.Content.Headers.ContentType?.MediaType);

        using var stream = await response.Content.ReadAsStreamAsync(cts.Token).ConfigureAwait(true);
        using var reader = new StreamReader(stream);

        string? handshake = await reader.ReadLineAsync(cts.Token).ConfigureAwait(true);
        Assert.Equal(": connected", handshake);

        _ = await reader.ReadLineAsync(cts.Token).ConfigureAwait(true); // newline after handshake

        var concreteBroadcaster = (ClientEventBroadcaster)broadcaster;
        for (int i = 0; i < 50 && concreteBroadcaster.ActiveSubscriptionsCount == 0; i++)
        {
            await Task.Delay(20, cts.Token).ConfigureAwait(true);
        }

        // Publish event to broadcaster
        var testEvent = new ClientEvent("telemetry_heartbeat", Guid.NewGuid(), null, "corr-test", DateTimeOffset.UtcNow, new
        {
            Status = "OK"
        });
        await broadcaster.PublishAsync(testEvent, cts.Token).ConfigureAwait(true);

        string? eventLine = await reader.ReadLineAsync(cts.Token).ConfigureAwait(true);
        string? dataLine = await reader.ReadLineAsync(cts.Token).ConfigureAwait(true);

        Assert.NotNull(eventLine);
        Assert.Contains("event: telemetry_heartbeat", eventLine, StringComparison.Ordinal);
        Assert.NotNull(dataLine);
        Assert.Contains("data:", dataLine, StringComparison.Ordinal);
    }

    [Fact]
    public async Task MarketplaceService_QueriesAndEdgeCasesSucceed()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededAccount account = await factory.Database.SeedAccountAsync().ConfigureAwait(true);
        MarketplaceService marketplace = factory.Services.GetRequiredService<MarketplaceService>();

        MarketplaceItem item = await marketplace.PublishItemAsync(
            "MeanReversion",
            ExtensionKind.Strategy,
            "1.0.0",
            "AuthorA",
            "Mean reversion algorithm",
            0m,
            "1.0.0",
            isCurated: false).ConfigureAwait(true);

        // Query non-existent item returns null
        MarketplaceItem? notFoundItem = await marketplace.GetItemAsync(Guid.NewGuid()).ConfigureAwait(true);
        Assert.Null(notFoundItem);

        // Acquire with invalid item id returns null
        MarketplaceAcquisition? badAcq1 = await marketplace.AcquireItemAsync(Guid.NewGuid(), account.AccountId).ConfigureAwait(true);
        Assert.Null(badAcq1);

        // Acquire with invalid account id returns null
        MarketplaceAcquisition? badAcq2 = await marketplace.AcquireItemAsync(item.Id, Guid.NewGuid()).ConfigureAwait(true);
        Assert.Null(badAcq2);

        // Acquire item
        MarketplaceAcquisition? acq = await marketplace.AcquireItemAsync(item.Id, account.AccountId).ConfigureAwait(true);
        Assert.NotNull(acq);

        // Re-acquire returns existing acquisition
        MarketplaceAcquisition? acqAgain = await marketplace.AcquireItemAsync(item.Id, account.AccountId).ConfigureAwait(true);
        Assert.NotNull(acqAgain);
        Assert.Equal(acq.Id, acqAgain.Id);

        // Get acquisitions for account
        IReadOnlyList<MarketplaceAcquisition> list = await marketplace.GetAcquisitionsForAccountAsync(account.AccountId).ConfigureAwait(true);
        Assert.Single(list);
        Assert.Equal(acq.Id, list[0].Id);

        // Acquire item bound to an engine instance
        SeededAccount account2 = await factory.Database.SeedAccountAsync("operator2").ConfigureAwait(true);
        EngineInstance seededEngine = await factory.Database.SeedEngineInstanceAsync(account2.AccountId, account2.LicenseId).ConfigureAwait(true);
        MarketplaceAcquisition? acqWithInstance = await marketplace.AcquireItemAsync(item.Id, account2.AccountId, seededEngine.Id).ConfigureAwait(true);
        Assert.NotNull(acqWithInstance);
        Assert.Equal(seededEngine.Id, acqWithInstance.EngineInstanceId);
        Assert.False(string.IsNullOrEmpty(acqWithInstance.LicenseKey));

        // Filter queries
        IReadOnlyList<MarketplaceItem> curated = await marketplace.SearchItemsAsync(kind: ExtensionKind.Strategy, isCurated: true).ConfigureAwait(true);
        Assert.Empty(curated);

        IReadOnlyList<MarketplaceItem> uncurated = await marketplace.SearchItemsAsync(kind: ExtensionKind.Strategy, isCurated: false).ConfigureAwait(true);
        Assert.Single(uncurated);

        IReadOnlyList<MarketplaceItem> otherKind = await marketplace.SearchItemsAsync(kind: ExtensionKind.Indicator).ConfigureAwait(true);
        Assert.Empty(otherKind);

        // Edge cases for PublishItemAsync
        MarketplaceItem defaulted = await marketplace.PublishItemAsync(
            "DefaultedItem",
            ExtensionKind.Adapter,
            version: "",
            author: "Tester",
            description: null!,
            price: -5m,
            sdkVersion: "").ConfigureAwait(true);

        Assert.Equal("1.0.0", defaulted.Version);
        Assert.Equal("1.0.0", defaulted.SdkVersion);
        Assert.Equal(0m, defaulted.Price);
        Assert.Equal(string.Empty, defaulted.Description);

        await Assert.ThrowsAsync<ArgumentException>(() => marketplace.PublishItemAsync("", ExtensionKind.Adapter, "1.0", "Auth", "desc", 0m, "1.0")).ConfigureAwait(true);
        await Assert.ThrowsAsync<ArgumentException>(() => marketplace.PublishItemAsync("Name", ExtensionKind.Adapter, "1.0", "", "desc", 0m, "1.0")).ConfigureAwait(true);

        // Acquire via endpoint with non-existent item returns 404
        using HttpClient client = factory.CreateAuthorisedClient();
        var badAcqReq = new AcquireMarketplaceItemRequest { ItemId = Guid.NewGuid(), AccountId = account.AccountId };
        using HttpResponseMessage badAcqResp = await PostJsonRelativeAsync(client, $"/api/marketplace/items/{Guid.NewGuid()}/acquire", badAcqReq).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, badAcqResp.StatusCode);
    }

    [Fact]
    public async Task LineageService_ValidationAndGuardBranchesSucceed()
    {
        using var factory = new CloudWebApplicationFactory();
        LineageService lineage = factory.Services.GetRequiredService<LineageService>();
        FlowOrchestrator orchestrator = factory.Services.GetRequiredService<FlowOrchestrator>();

        // Missing reason in RecordInterventionAsync
        await Assert.ThrowsAsync<ArgumentException>(() => lineage.RecordInterventionAsync(
            Guid.NewGuid(),
            new InterventionSpecification(1, "a", "b", "c", "  "))).ConfigureAwait(true);

        // Unknown run in RecordInterventionAsync
        await Assert.ThrowsAsync<KeyNotFoundException>(() => lineage.RecordInterventionAsync(
            Guid.NewGuid(),
            new InterventionSpecification(1, "a", "b", "c", "Reason"))).ConfigureAwait(true);

        // Missing reason in RecordGapAsync
        await Assert.ThrowsAsync<ArgumentException>(() => lineage.RecordGapAsync(
            Guid.NewGuid(),
            new GapSpecification(1, 2, "   "))).ConfigureAwait(true);

        // Unknown run in RecordGapAsync
        await Assert.ThrowsAsync<KeyNotFoundException>(() => lineage.RecordGapAsync(
            Guid.NewGuid(),
            new GapSpecification(1, 2, "Reason"))).ConfigureAwait(true);

        // Unknown run in FlowOrchestrator.ResumeWithInterventionAsync
        await Assert.ThrowsAsync<KeyNotFoundException>(() => orchestrator.ResumeWithInterventionAsync(
            Guid.NewGuid(),
            new ForkPoint(1),
            new InterventionSpecification(1, "a", "b", "c", "Valid reason"),
            newRandomPosition: null,
            childSeed: null)).ConfigureAwait(true);
    }

    [Fact]
    public async Task ClientEventBroadcaster_FiltersByInstanceId()
    {
        var broadcaster = new ClientEventBroadcaster();
        var targetInstance = Guid.NewGuid();
        var otherInstance = Guid.NewGuid();

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
        var received = new List<ClientEvent>();

        var consumeTask = Task.Run(async () =>
        {
            await foreach (var ev in broadcaster.SubscribeAsync(targetInstance, cts.Token).ConfigureAwait(false))
            {
                received.Add(ev);
                if (received.Count == 1)
                {
                    await cts.CancelAsync().ConfigureAwait(false);
                    break;
                }
            }
        });

        while (broadcaster.ActiveSubscriptionsCount == 0)
        {
            await Task.Delay(10).ConfigureAwait(true);
        }

        // Publish event for different instance -> should be ignored
        await broadcaster.PublishAsync(new ClientEvent("ignored", otherInstance, null, null, DateTimeOffset.UtcNow, null)).ConfigureAwait(true);

        // Publish event for target instance -> should be delivered
        await broadcaster.PublishAsync(new ClientEvent("target", targetInstance, null, null, DateTimeOffset.UtcNow, null)).ConfigureAwait(true);

        try
        {
            await consumeTask.ConfigureAwait(true);
        }
        catch (OperationCanceledException) { }

        Assert.Single(received);
        Assert.Equal("target", received[0].EventType);
    }

    [Fact]
    public async Task RunEndpoints_ErrorAndValidationCasesSucceed()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        // Start run with non-existent instance -> 404
        var startBad = new StartRunRequest { InstanceId = Guid.NewGuid(), Kind = RunKind.Backtest, BaseSeed = 1 };
        using HttpResponseMessage startResp = await PostJsonRelativeAsync(client, "/api/runs", startBad).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, startResp.StatusCode);

        // Get non-existent run -> 404
        using HttpResponseMessage getResp = await GetRelativeAsync(client, $"/api/runs/{Guid.NewGuid()}").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);

        // Pause non-existent run -> 404
        using HttpResponseMessage pauseResp = await PostRelativeAsync(client, $"/api/runs/{Guid.NewGuid()}/pause").ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, pauseResp.StatusCode);

        // Complete non-existent run -> 404
        var completeBad = new CompleteRunRequest();
        using HttpResponseMessage completeResp = await PostJsonRelativeAsync(client, $"/api/runs/{Guid.NewGuid()}/complete", completeBad).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, completeResp.StatusCode);

        // Resume with invalid run id -> 404
        var resumeReq = new ResumeRunRequest
        {
            ForkPoint = new ForkPoint(Step: 1),
            Intervention = new InterventionSpecification(1, "a", "b", "c", "Valid reason")
        };
        using HttpResponseMessage resumeNotFoundResp = await PostJsonRelativeAsync(client, $"/api/runs/{Guid.NewGuid()}/resume", resumeReq).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, resumeNotFoundResp.StatusCode);

        // Resume with missing reason -> 400
        var resumeBad = new ResumeRunRequest
        {
            ForkPoint = new ForkPoint(Step: 1),
            Intervention = new InterventionSpecification(1, "a", "b", "c", "   ")
        };
        using HttpResponseMessage resumeBadResp = await PostJsonRelativeAsync(client, $"/api/runs/{Guid.NewGuid()}/resume", resumeBad).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, resumeBadResp.StatusCode);
    }
}
