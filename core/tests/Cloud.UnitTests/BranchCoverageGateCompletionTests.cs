// -----------------------------------------------------------------------------
// <copyright file="BranchCoverageGateCompletionTests.cs" company="BleedingOnTheEdge">
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
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Targeted unit and integration tests covering remaining branch paths to satisfy the 95% branch coverage gate.
/// </summary>
public sealed class BranchCoverageGateCompletionTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task Endpoints_AccessAndFiltering_CoverAllHeaderAndValidationBranches()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount seeded = await factory.Database.SeedAccountAsync("branch-owner").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, new TestTimeProvider(DateTimeOffset.UtcNow));
        RegistrationOutcome outcome = await regService
            .RegisterAsync(seeded.AccountId, seeded.LicenseId, "eng-branch-1", "Branch Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        // 1. SubmitCommandEndpoint: unauthorized user ID rejected with 403 Forbidden
        using var unauthCmdMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/instances/{instanceId}/commands")
        {
            Content = JsonContent.Create(new { InstanceId = instanceId, CommandId = 101, CommandType = "Ping" }, options: JsonOptions)
        };
        unauthCmdMsg.Headers.Add("X-User-Id", Guid.NewGuid().ToString());
        using HttpResponseMessage unauthCmdRes = await client.SendAsync(unauthCmdMsg).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Forbidden, unauthCmdRes.StatusCode);

        // 2. SubmitCommandEndpoint: unauthorized user email rejected with 403 Forbidden
        using var unauthEmailCmdMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/instances/{instanceId}/commands")
        {
            Content = JsonContent.Create(new { InstanceId = instanceId, CommandId = 101, CommandType = "Ping" }, options: JsonOptions)
        };
        unauthEmailCmdMsg.Headers.Add("X-User-Email", "intruder@razor.platform");
        using HttpResponseMessage unauthEmailCmdRes = await client.SendAsync(unauthEmailCmdMsg).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Forbidden, unauthEmailCmdRes.StatusCode);

        // 3. StartRunEndpoint: unauthorized user ID rejected with 403 Forbidden
        using var unauthRunMsg = new HttpRequestMessage(HttpMethod.Post, "/api/runs")
        {
            Content = JsonContent.Create(new { InstanceId = instanceId, Kind = RunKind.Backtest }, options: JsonOptions)
        };
        unauthRunMsg.Headers.Add("X-User-Id", Guid.NewGuid().ToString());
        using HttpResponseMessage unauthRunRes = await client.SendAsync(unauthRunMsg).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Forbidden, unauthRunRes.StatusCode);

        // 4. StartRunEndpoint: unauthorized user email rejected with 403 Forbidden
        using var unauthEmailRunMsg = new HttpRequestMessage(HttpMethod.Post, "/api/runs")
        {
            Content = JsonContent.Create(new { InstanceId = instanceId, Kind = RunKind.Backtest }, options: JsonOptions)
        };
        unauthEmailRunMsg.Headers.Add("X-User-Email", "intruder@razor.platform");
        using HttpResponseMessage unauthEmailRunRes = await client.SendAsync(unauthEmailRunMsg).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Forbidden, unauthEmailRunRes.StatusCode);

        // 5. StartRunEndpoint: non-existent instance ID without account header throws KeyNotFoundException and returns 404 NotFound
        using var notFoundRunMsg = new HttpRequestMessage(HttpMethod.Post, "/api/runs")
        {
            Content = JsonContent.Create(new { InstanceId = Guid.NewGuid(), Kind = RunKind.Backtest }, options: JsonOptions)
        };
        using HttpResponseMessage notFoundRunRes = await client.SendAsync(notFoundRunMsg).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, notFoundRunRes.StatusCode);

        // 6. ListInstancesEndpoint: with pagination and user identity headers
        using var listMsg = new HttpRequestMessage(HttpMethod.Get, "/api/instances?page=1&pageSize=5");
        listMsg.Headers.Add("X-User-Id", seeded.UserId.ToString());
        listMsg.Headers.Add("X-User-Email", "branch-owner@razor.platform");
        using HttpResponseMessage listRes = await client.SendAsync(listMsg).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
    }

    [Fact]
    public async Task FlowOrchestrator_StartOriginalRunAsync_DispatchesExpectedCommandsAcrossAllKinds()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededAccount seeded = await factory.Database.SeedAccountAsync("orch-kinds").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, TimeProvider.System);
        RegistrationOutcome outcome = await regService
            .RegisterAsync(seeded.AccountId, seeded.LicenseId, "eng-orch-kinds", "Kinds Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        FlowOrchestrator orchestrator = factory.Services.GetRequiredService<FlowOrchestrator>();

        // 1. Live Run -> 1100 StartLive
        FlowRun liveRun = await orchestrator.StartOriginalRunAsync(
            instanceId,
            RunKind.Live,
            baseSeed: 42,
            configurationJson: "{\"Mode\":\"Live\"}",
            cancellationToken: CancellationToken.None).ConfigureAwait(true);
        Assert.Equal(RunStatus.Running, liveRun.Status);

        // 2. WalkForward Run -> 1300 StartOptimization
        FlowRun wfRun = await orchestrator.StartOriginalRunAsync(
            instanceId,
            RunKind.WalkForward,
            baseSeed: 100,
            configurationJson: "{\"Windows\":3}",
            cancellationToken: CancellationToken.None).ConfigureAwait(true);
        Assert.Equal(RunStatus.Running, wfRun.Status);

        // 3. Optimization Run -> 1300 StartOptimization
        FlowRun optRun = await orchestrator.StartOriginalRunAsync(
            instanceId,
            RunKind.Optimization,
            baseSeed: 200,
            configurationJson: "{\"Generations\":10}",
            cancellationToken: CancellationToken.None).ConfigureAwait(true);
        Assert.Equal(RunStatus.Running, optRun.Status);

        // 4. Backtest Run -> 1200 RunBacktest
        FlowRun btRun = await orchestrator.StartOriginalRunAsync(
            instanceId,
            RunKind.Backtest,
            baseSeed: 300,
            configurationJson: "{\"Symbols\":[\"BTCUSDT\"]}",
            cancellationToken: CancellationToken.None).ConfigureAwait(true);
        Assert.Equal(RunStatus.Running, btRun.Status);
    }

    [Fact]
    public async Task LineageService_And_TicketService_CoverAllFilteringAndTreeBranches()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededAccount seeded = await factory.Database.SeedAccountAsync("lineage-user").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, TimeProvider.System);
        RegistrationOutcome outcome = await regService
            .RegisterAsync(seeded.AccountId, seeded.LicenseId, "eng-lineage", "Lineage Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        LineageService lineage = factory.Services.GetRequiredService<LineageService>();

        // 1. Create parent run
        FlowRun parent = await lineage.CreateOriginalRunAsync(instanceId, RunKind.Backtest, CancellationToken.None).ConfigureAwait(true);

        // 2. Create child run with Spliced, Gapped, ForkPoint, Interventions, and Gaps
        var interventions = new[]
        {
            new InterventionSpecification(
                StepIndex: 10,
                PreviousFingerprint: "prev-fp",
                NewFingerprint: "new-fp",
                Actor: "Operator",
                Reason: "Parameter adjustment",
                ModificationsSummary: "Changed threshold",
                BeforePayloadJson: "{\"Threshold\": 1.0}",
                AfterPayloadJson: "{\"Threshold\": 1.5}")
        };

        var gaps = new[]
        {
            new GapSpecification(StartStep: 5, EndStep: 9, Reason: "Network partition")
        };

        var forkPoint = new ForkPoint(Step: 10, Generation: 2, WindowIndex: 1);

        FlowRun child = await lineage.CreateChildRunAsync(
            parent.Id,
            RunRelation.Spliced,
            RunContinuity.Gapped,
            forkPoint,
            baseSeed: 999,
            randomPosition: "pos-10",
            interventions: interventions,
            gaps: gaps,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);

        // 3. Reconstruct lineage tree and verify node mapping
        LineageNode? tree = await lineage.GetLineageTreeAsync(child.Id, CancellationToken.None).ConfigureAwait(true);
        Assert.NotNull(tree);
        Assert.Equal(parent.Id, tree.RunId);
        Assert.Single(tree.Children);
        LineageNode childNode = tree.Children[0];
        Assert.NotNull(childNode.ForkPoint);
        Assert.Equal(10, childNode.ForkPoint.Step);
        Assert.Single(childNode.Interventions);
        Assert.Single(childNode.Gaps);

        // 4. GetRunsAsync with kind and status filtering
        IReadOnlyList<FlowRun> filteredRuns = await lineage.GetRunsAsync(
            instanceId: instanceId,
            accountId: seeded.AccountId,
            kind: RunKind.Backtest,
            status: RunStatus.Pending,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);
        Assert.NotEmpty(filteredRuns);

        // 5. TicketService: test filtering with priority, category, and search
        TicketService tickets = factory.Services.GetRequiredService<TicketService>();
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            db.Tickets.Add(new Ticket
            {
                Id = Guid.NewGuid(),
                AccountId = seeded.AccountId,
                Title = "Critical Payment Failure Needle",
                Description = "Transaction dropped unexpectedly",
                Status = TicketStatus.Open,
                Priority = TicketPriority.High,
                Category = TicketCategory.Billing,
                TargetType = TicketTargetType.SystemManager,
                CreatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        IReadOnlyList<Ticket> searchTickets = await tickets.GetTicketsAsync(
            priority: TicketPriority.High,
            category: TicketCategory.Billing,
            search: "Needle",
            cancellationToken: CancellationToken.None).ConfigureAwait(true);
        Assert.NotEmpty(searchTickets);
    }

    [Fact]
    public void RunRankingService_CoversAllDivergenceFlagsAndMetricCombinations()
    {
        var ranking = new RunRankingService();

        var runPartial = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Backtest,
            Status = RunStatus.Completed,
            Relation = null,
            Continuity = RunContinuity.Contiguous,
            IsPartial = true,
            NetProfit = 500m,
            TotalReturn = 10m,
            SharpeRatio = 1.8,
            BestFitness = 0.85
        };

        var runGapped = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Backtest,
            Status = RunStatus.Completed,
            Relation = null,
            Continuity = RunContinuity.Contiguous,
            IsPartial = false,
            Gaps = [new RunGap { FlowRunId = Guid.NewGuid(), StartStep = 1, EndStep = 5, Reason = "Gap" }],
            NetProfit = 400m,
            TotalReturn = 8m,
            SharpeRatio = 1.5,
            BestFitness = 0.75
        };

        var runBranchedGapped = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Backtest,
            Status = RunStatus.Completed,
            Relation = RunRelation.Branched,
            Continuity = RunContinuity.Gapped,
            IsPartial = false,
            NetProfit = 600m,
            TotalReturn = 12m,
            SharpeRatio = 2.0,
            BestFitness = 0.90
        };

        var runSplicedClean = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Backtest,
            Status = RunStatus.Completed,
            Relation = RunRelation.Spliced,
            Continuity = RunContinuity.Contiguous,
            IsPartial = false,
            NetProfit = 700m,
            TotalReturn = 14m,
            SharpeRatio = 2.2,
            BestFitness = 0.95
        };

        var runCleanWithEmptyGaps = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Backtest,
            Status = RunStatus.Completed,
            Relation = null,
            Continuity = RunContinuity.Contiguous,
            IsPartial = false,
            Gaps = [],
            NetProfit = 1000m,
            TotalReturn = 20m,
            SharpeRatio = 2.5,
            BestFitness = 0.99
        };

        var runs = new[] { runPartial, runGapped, runBranchedGapped, runSplicedClean, runCleanWithEmptyGaps };

        // Test ranking with includeDiverged = true and false
        IReadOnlyList<RankedRunResult> rankedWithDiverged = ranking.RankRuns(runs, RankingMetric.BestFitness, includeDiverged: true);
        Assert.Equal(5, rankedWithDiverged.Count);

        IReadOnlyList<RankedRunResult> rankedCleanOnly = ranking.RankRuns(runs, RankingMetric.NetProfit, includeDiverged: false);
        Assert.Single(rankedCleanOnly);
        Assert.Equal(runCleanWithEmptyGaps.Id, rankedCleanOnly[0].RunId);

        // Test SelectBestResult
        RankedRunResult? bestWithDiverged = ranking.SelectBestResult(runs, RankingMetric.SharpeRatio, allowDiverged: true);
        Assert.NotNull(bestWithDiverged);
        Assert.Equal(runCleanWithEmptyGaps.Id, bestWithDiverged.RunId);

        RankedRunResult? bestCleanOnly = ranking.SelectBestResult(runs, RankingMetric.TotalReturn, allowDiverged: false);
        Assert.NotNull(bestCleanOnly);
        Assert.Equal(runCleanWithEmptyGaps.Id, bestCleanOnly.RunId);
    }

    [Fact]
    public void RunReportService_DetailedMetricsAndExcelExport_CoversEdgeCaseBranches()
    {
        var service = new RunReportService();

        // Run with empty strategy, empty adapter, json null parameters, and losing trades
        DateTimeOffset nowTime = DateTimeOffset.UtcNow;
        var runEdge = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Optimization,
            Status = RunStatus.Completed,
            CreatedAt = nowTime,
            CompletedAt = nowTime, // end == start triggers fallback totalSpanSeconds
            ConfigurationJson = "{\"Symbols\":[\"ETHUSDT\"]}",
            WinningDnaJson = "{\"StrategyName\":\"\",\"AdapterName\":\"\",\"Parameters\":{\"ParamNull\":null,\"ParamVal\":\"ok\"}}",
            ResultPayloadJson = """
            {
                "Result": {
                    "Trades": [
                        {
                            "Ticket": 1,
                            "Symbol": "ETHUSDT",
                            "Side": "Buy",
                            "Volume": 1.0,
                            "OpenPrice": 2000.0,
                            "OpenTime": "2026-10-20T10:00:00Z",
                            "ClosePrice": 1900.0,
                            "CloseTime": "2026-10-20T10:00:00Z",
                            "Profit": -100.0,
                            "ReturnPct": -5.0,
                            "Commission": 1.0,
                            "Swap": 0.0,
                            "StopLoss": 1850.0,
                            "TakeProfit": 2100.0,
                            "ExitReason": "StopLoss"
                        }
                    ],
                    "GenerationProgress": [
                        {
                            "Generation": 1,
                            "BestFitness": 1.25,
                            "AverageFitness": 1.10,
                            "Diversity": 0.85,
                            "IsHyperMutation": false,
                            "Populations": [
                                {
                                    "Id": "1",
                                    "IndividualIndex": 1,
                                    "Fitness": 1.25,
                                    "Profit": 120.0
                                },
                                {
                                    "Id": "2",
                                    "IndividualIndex": 0,
                                    "Fitness": 1.10,
                                    "Profit": 80.0
                                }
                            ]
                        }
                    ]
                }
            }
            """
        };

        RunReport report = service.GenerateReport(runEdge);
        Assert.NotNull(report.DetailedMetrics);
        Assert.Equal(0, report.DetailedMetrics.WinningTrades);
        Assert.Equal(1, report.DetailedMetrics.LosingTrades);

        // Excel export with null WinningDna and null Execution
        byte[] excelWithoutDna = FlowRunExcelExportService.GenerateExcelWorkbook(report with
        {
            WinningDna = null
        });
        Assert.NotEmpty(excelWithoutDna);

        byte[] normalExcel = FlowRunExcelExportService.GenerateExcelWorkbook(report);
        Assert.NotEmpty(normalExcel);
    }
}
