// -----------------------------------------------------------------------------
// <copyright file="CoverageFloorCompletionTests.cs" company="BleedingOnTheEdge">
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
/// Hardens test coverage across Cloud service and endpoint branches to clear the 95% floor.
/// </summary>
public sealed class CoverageFloorCompletionTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task EngineRegistrationService_ListAsync_CoversAllFilterAndShareBranches()
    {
        using var testDb = new CloudTestDatabase();
        var regService = new EngineRegistrationService(testDb, TimeProvider.System);

        SeededAccount acc1 = await testDb.SeedAccountAsync("list-acc1").ConfigureAwait(true);
        SeededAccount acc2 = await testDb.SeedAccountAsync("list-acc2").ConfigureAwait(true);

        RegistrationOutcome out1 = await regService
            .RegisterAsync(acc1.AccountId, acc1.LicenseId, "eng-list-1", "Engine 1", CancellationToken.None)
            .ConfigureAwait(true);
        RegistrationOutcome out2 = await regService
            .RegisterAsync(acc2.AccountId, acc2.LicenseId, "eng-list-2", "Engine 2", CancellationToken.None)
            .ConfigureAwait(true);

        Guid eng1Id = out1.Instance!.Id;
        Guid eng2Id = out2.Instance!.Id;

        // Share engine 2 with user from account 1
        Guid shareUserId = acc1.UserId;
        await regService.CreateShareAsync(
            eng2Id,
            acc2.AccountId,
            "acc1-user@razor.platform",
            shareUserId,
            DateTimeOffset.UtcNow.AddDays(3),
            canRead: true,
            canControl: true,
            canRunFlows: true).ConfigureAwait(true);

        // 1. List for acc1 with userId matching share
        IReadOnlyList<EngineInstance> listUserShare = await regService
            .ListAsync(acc1.AccountId, shareUserId, null, CancellationToken.None)
            .ConfigureAwait(true);
        Assert.Equal(2, listUserShare.Count);
        Assert.Contains(listUserShare, i => i.Id == eng1Id);
        Assert.Contains(listUserShare, i => i.Id == eng2Id);

        // 2. List for acc1 with userEmail matching share
        IReadOnlyList<EngineInstance> listEmailShare = await regService
            .ListAsync(acc1.AccountId, null, "acc1-user@razor.platform", CancellationToken.None)
            .ConfigureAwait(true);
        Assert.Equal(2, listEmailShare.Count);

        // 3. List with null accountId returns all engines
        IReadOnlyList<EngineInstance> listAll = await regService
            .ListAsync(null, null, null, CancellationToken.None)
            .ConfigureAwait(true);
        Assert.True(listAll.Count >= 2);

        // 4. Create an expired share to cover s.ExpiresAtUtc > now == false
        EngineShare expShare = await regService.CreateShareAsync(
            eng2Id,
            acc2.AccountId,
            "expired@razor.platform",
            Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddDays(1),
            canRead: true,
            canControl: true,
            canRunFlows: true).ConfigureAwait(true);

        using (CloudDbContext db = testDb.CreateDbContext())
        {
            EngineShare shareRow = await db.EngineShares.SingleAsync(s => s.Id == expShare.Id).ConfigureAwait(true);
            shareRow.ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(-1);
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        // 5. Create account share with userId = null and userEmail = "" to cover s.SharedWithUserId == accId
        SeededAccount acc3 = await testDb.SeedAccountAsync("list-acc3").ConfigureAwait(true);
        await regService.CreateShareAsync(
            eng1Id,
            acc1.AccountId,
            string.Empty,
            acc3.AccountId,
            DateTimeOffset.UtcNow.AddDays(3),
            canRead: true,
            canControl: true,
            canRunFlows: true).ConfigureAwait(true);

        IReadOnlyList<EngineInstance> listAccShare = await regService
            .ListAsync(acc3.AccountId, null, null, CancellationToken.None)
            .ConfigureAwait(true);
        Assert.Contains(listAccShare, i => i.Id == eng1Id);

        // 6. Query with non-matching userId and userEmail
        IReadOnlyList<EngineInstance> listMismatch = await regService
            .ListAsync(acc1.AccountId, Guid.NewGuid(), "no-match@test.com", CancellationToken.None)
            .ConfigureAwait(true);
        Assert.Single(listMismatch);

        // 7. Auto registration with Guid.Empty accountId and licenseId
        RegistrationOutcome autoReg = await regService
            .RegisterAsync(Guid.Empty, Guid.Empty, "auto-eng", "Auto Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Assert.Equal(ServiceStatus.Succeeded, autoReg.Status);
    }

    [Fact]
    public async Task Endpoints_CheckInstanceAccess_RejectsUnauthorizedRequesters()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount owner = await factory.Database.SeedAccountAsync("prot-owner").ConfigureAwait(true);
        SeededAccount unauthorized = await factory.Database.SeedAccountAsync("unauth-user").ConfigureAwait(true);

        var regService = new EngineRegistrationService(factory.Database, TimeProvider.System);
        RegistrationOutcome out1 = await regService
            .RegisterAsync(owner.AccountId, owner.LicenseId, "prot-eng-1", "Protected Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = out1.Instance!.Id;

        client.DefaultRequestHeaders.Add("X-Account-Id", unauthorized.AccountId.ToString());

        // 1. SubmitCommand returns 403 Forbidden for unauthorized requester
        var cmdRequest = new
        {
            CommandId = 1,
            CommandType = "Ping",
            Parameters = "{}"
        };
        using HttpResponseMessage cmdResp = await client.PostAsJsonAsync(
            new Uri($"/api/instances/{instanceId}/commands", UriKind.Relative),
            cmdRequest,
            JsonOptions).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Forbidden, cmdResp.StatusCode);

        // 2. StartRun returns 403 Forbidden for unauthorized requester
        var runRequest = new
        {
            InstanceId = instanceId,
            Kind = RunKind.Backtest,
            BaseSeed = 100
        };
        using HttpResponseMessage runResp = await client.PostAsJsonAsync(
            new Uri("/api/runs", UriKind.Relative),
            runRequest,
            JsonOptions).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Forbidden, runResp.StatusCode);
    }

    [Fact]
    public async Task ListInstancesAndRuns_ServerPaginationAndFilters_CoverBranches()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount owner = await factory.Database.SeedAccountAsync("page-owner").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, TimeProvider.System);
        RegistrationOutcome out1 = await regService
            .RegisterAsync(owner.AccountId, owner.LicenseId, "page-eng-1", "Paged Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = out1.Instance!.Id;

        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            db.FlowRuns.Add(new FlowRun
            {
                Id = Guid.NewGuid(),
                EngineInstanceId = instanceId,
                Kind = RunKind.Backtest,
                Status = RunStatus.Completed,
                CreatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        client.DefaultRequestHeaders.Add("X-Account-Id", owner.AccountId.ToString());

        // 1. Paged instances
        using HttpResponseMessage pagedInstResp = await client.GetAsync(
            new Uri("/api/instances?Page=1&PageSize=5", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, pagedInstResp.StatusCode);
        PagedResult<InstanceListItemView>? pagedInst = await pagedInstResp.Content.ReadFromJsonAsync<PagedResult<InstanceListItemView>>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(pagedInst);
        Assert.Equal(1, pagedInst.TotalCount);

        // 2. Paged runs
        using HttpResponseMessage pagedRunsResp = await client.GetAsync(
            new Uri($"/api/runs?InstanceId={instanceId}&Page=1&PageSize=5", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, pagedRunsResp.StatusCode);
        PagedResult<FlowRunView>? pagedRuns = await pagedRunsResp.Content.ReadFromJsonAsync<PagedResult<FlowRunView>>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(pagedRuns);
        Assert.Equal(1, pagedRuns.TotalCount);
    }

    [Fact]
    public void RunReportService_CoversConfigurationFallbackAndZeroTradeMetrics()
    {
        var service = new RunReportService();

        // 1. Run with ConfigurationJson but null WinningDnaJson
        var configRun = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Optimization,
            Status = RunStatus.Completed,
            CreatedAt = DateTimeOffset.UtcNow.AddHours(-1),
            CompletedAt = DateTimeOffset.UtcNow,
            ConfigurationJson = """
            {
              "StrategyName": "CustomTrend",
              "AdapterName": "CustomBroker",
              "Symbols": ["ETH/USDT"],
              "Genes": [12.0, 36.0],
              "strategy": {
                "FastPeriod": 12.0,
                "Mode": "Aggressive",
                "genes": [12.0, 36.0]
              }
            }
            """
        };

        RunReport report1 = service.GenerateReport(configRun);
        Assert.NotNull(report1.WinningDna);
        Assert.Equal("CustomTrend", report1.WinningDna.Slots.Strategy);
        Assert.Equal("CustomBroker", report1.WinningDna.Slots.Adapter);

        // 2. Run with null ConfigurationJson and null WinningDnaJson (synthetic fallback)
        var emptyConfigRun = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Optimization,
            Status = RunStatus.Completed,
            CreatedAt = DateTimeOffset.UtcNow.AddHours(-1),
            CompletedAt = DateTimeOffset.UtcNow
        };

        RunReport report2 = service.GenerateReport(emptyConfigRun);
        Assert.NotNull(report2.WinningDna);
        Assert.Equal("TrendFollowing", report2.WinningDna.Slots.Strategy);

        // 3. Run with 0 trades and negative profit
        var lossRun = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Backtest,
            Status = RunStatus.Completed,
            CreatedAt = DateTimeOffset.UtcNow.AddHours(-1),
            CompletedAt = DateTimeOffset.UtcNow,
            TradeCount = 0,
            NetProfit = -500.0m
        };

        RunReport report3 = service.GenerateReport(lossRun);
        Assert.NotNull(report3.DetailedMetrics);
    }

    [Fact]
    public async Task CommandService_CompleteAsync_CoversFallbackAndErrorBranches()
    {
        using var testDb = new CloudTestDatabase();
        var cmdService = new CommandService(
            testDb,
            new CloudOptions(),
            TimeProvider.System,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<CommandService>.Instance);

        SeededAccount account = await testDb.SeedAccountAsync("cmd-owner").ConfigureAwait(true);
        var regService = new EngineRegistrationService(testDb, TimeProvider.System);
        RegistrationOutcome outcome = await regService
            .RegisterAsync(account.AccountId, account.LicenseId, "cmd-eng-1", "Command Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        // Submit command 101 with correlation ID "101"
        CommandOutcome submitOut = await cmdService.SubmitAsync(
            instanceId,
            101,
            "SoftReload",
            parametersJson: "{\"runId\":\"" + Guid.NewGuid() + "\"}",
            timeoutSeconds: 30,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);
        Assert.Equal(ServiceStatus.Succeeded, submitOut.Status);

        // Complete with failed status and error
        CommandCompletionResult failOutcome = await cmdService.CompleteAsync(
            instanceId,
            submitOut.Command!.CorrelationId,
            isSuccess: false,
            resultPayloadJson: null,
            error: "Runtime reload failed",
            cancellationToken: CancellationToken.None).ConfigureAwait(true);

        Assert.True(failOutcome.Recorded);

        // Submit command 102
        CommandOutcome submit2 = await cmdService.SubmitAsync(
            instanceId,
            102,
            "Ping",
            parametersJson: null,
            timeoutSeconds: 30,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);

        // Complete with success and null payload
        CommandCompletionResult succOutcome = await cmdService.CompleteAsync(
            instanceId,
            submit2.Command!.CorrelationId,
            isSuccess: true,
            resultPayloadJson: null,
            error: null,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);

        Assert.True(succOutcome.Recorded);

        // Submit command 103 with metrics payload to cover all property extraction branches
        CommandOutcome submit3 = await cmdService.SubmitAsync(
            instanceId,
            103,
            "RunBacktest",
            parametersJson: "{\"runId\":\"" + Guid.NewGuid().ToString() + "\"}",
            timeoutSeconds: 30,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);

        string metricsJson = """
        {
            "Result": {
                "NetProfit": 4200.50,
                "TotalReturn": 4.20,
                "SharpeRatio": 2.45,
                "MaxDrawdown": 1.85,
                "TradeCount": 42,
                "BestFitness": 0.98,
                "Dna": {
                    "Genes": [10.0, 20.0]
                }
            }
        }
        """;

        CommandCompletionResult metricsOutcome = await cmdService.CompleteAsync(
            instanceId,
            submit3.Command!.CorrelationId,
            isSuccess: true,
            resultPayloadJson: metricsJson,
            error: null,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);

        Assert.True(metricsOutcome.Recorded);

        // Submit command 104 with top-level metrics payload
        CommandOutcome submit4 = await cmdService.SubmitAsync(
            instanceId,
            104,
            "RunOptimization",
            parametersJson: "{\"runId\":\"" + Guid.NewGuid().ToString() + "\"}",
            timeoutSeconds: 30,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);

        string directMetricsJson = """
        {
            "NetProfit": 1500.00,
            "TotalReturn": 1.50,
            "SharpeRatio": 1.80,
            "MaxDrawdown": 2.10,
            "TradeCount": 20,
            "BestFitness": 0.85
        }
        """;

        CommandCompletionResult directOutcome = await cmdService.CompleteAsync(
            instanceId,
            submit4.Command!.CorrelationId,
            isSuccess: true,
            resultPayloadJson: directMetricsJson,
            error: null,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);

        Assert.True(directOutcome.Recorded);
    }

    [Fact]
    public void RunReportService_DetailedMetrics_CoversConsecutiveWinsLossesAndHoldings()
    {
        var service = new RunReportService();

        var runWithTrades = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Optimization,
            Status = RunStatus.Completed,
            CreatedAt = DateTimeOffset.UtcNow.AddHours(-3),
            CompletedAt = DateTimeOffset.UtcNow,
            SharpeRatio = 2.1,
            TotalReturn = 5.2m,
            NetProfit = 3000m,
            MaxDrawdown = 2.5,
            ResultPayloadJson = """
            {
                "Trades": [
                    {
                        "Ticket": 101,
                        "Symbol": "BTC/USDT",
                        "Side": "Buy",
                        "Volume": 1.0,
                        "OpenPrice": 60000.0,
                        "OpenTime": "2026-10-20T10:00:00Z",
                        "ClosePrice": 61000.0,
                        "CloseTime": "2026-10-20T10:30:00Z",
                        "Profit": 1000.0,
                        "ReturnPct": 1.66,
                        "Commission": 2.0,
                        "Swap": 0.0,
                        "StopLoss": 59000.0,
                        "TakeProfit": 62000.0,
                        "ExitReason": "TakeProfit"
                    },
                    {
                        "Ticket": 102,
                        "Symbol": "BTC/USDT",
                        "Side": "Sell",
                        "Volume": 1.0,
                        "OpenPrice": 61000.0,
                        "OpenTime": "2026-10-20T11:00:00Z",
                        "ClosePrice": 61500.0,
                        "CloseTime": "2026-10-20T11:45:00Z",
                        "Profit": -500.0,
                        "ReturnPct": -0.82,
                        "Commission": 2.0,
                        "Swap": 0.0,
                        "StopLoss": 62000.0,
                        "TakeProfit": 60000.0,
                        "ExitReason": "StopLoss"
                    },
                    {
                        "Ticket": 103,
                        "Symbol": "",
                        "Side": "",
                        "Volume": 0.0,
                        "OpenPrice": 60000.0,
                        "OpenTime": "2026-10-20T12:00:00Z",
                        "ClosePrice": 60500.0,
                        "CloseTime": "2026-10-20T12:30:00Z",
                        "Profit": 250.0,
                        "ReturnPct": 0.41,
                        "Commission": 1.0,
                        "Swap": 0.0,
                        "StopLoss": 59500.0,
                        "TakeProfit": 61000.0,
                        "ExitReason": ""
                    },
                    {
                        "Ticket": 104,
                        "Symbol": "BTC/USDT",
                        "Side": "Buy",
                        "Volume": 1.0,
                        "OpenPrice": 60500.0,
                        "OpenTime": "2026-10-20T13:00:00Z",
                        "ClosePrice": 60200.0,
                        "CloseTime": "2026-10-20T13:30:00Z",
                        "Profit": -150.0,
                        "ReturnPct": -0.25,
                        "Commission": 1.0,
                        "Swap": 0.0,
                        "StopLoss": 60000.0,
                        "TakeProfit": 61500.0,
                        "ExitReason": null
                    }
                ],
                "GenerationProgress": [
                    {
                        "Generation": 1,
                        "BestFitness": 0.95,
                        "AverageFitness": 0.70,
                        "Diversity": 0.85,
                        "Populations": [
                            {
                                "Id": "42",
                                "IndividualIndex": 0,
                                "Fitness": 0.95,
                                "Profit": 1250.0
                            },
                            {
                                "Id": "not_int",
                                "IndividualIndex": 0,
                                "Fitness": 0.75,
                                "Profit": 500.0
                            },
                            {
                                "Fitness": 0.50,
                                "Profit": 100.0
                            }
                        ]
                    }
                ]
            }
            """
        };

        RunReport report = service.GenerateReport(runWithTrades);
        Assert.NotNull(report.DetailedMetrics);
        Assert.Equal(1250.0m, report.DetailedMetrics.GrossProfit);
        Assert.Equal(650.0m, report.DetailedMetrics.GrossLoss);
        Assert.Equal(2, report.DetailedMetrics.WinningTrades);
        Assert.Equal(2, report.DetailedMetrics.LosingTrades);
        Assert.True(report.DetailedMetrics.AverageHoldingPeriodSeconds > 0);
        Assert.NotNull(report.GenerationProgress);
        Assert.Single(report.GenerationProgress);
        ReportGenerationProgress gen = report.GenerationProgress![0];
        Assert.NotNull(gen.Populations);
        Assert.Equal(3, gen.Populations!.Count);
        Assert.Equal(42, gen.Populations[0].IndividualIndex);
        Assert.Equal(1, gen.Populations[1].IndividualIndex);
        Assert.Equal("0", gen.Populations[2].Id);

        // Test Gapped divergence flag when Relation is null
        var gappedRun = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Backtest,
            Status = RunStatus.Completed,
            CreatedAt = DateTimeOffset.UtcNow,
            Relation = null,
            Continuity = RunContinuity.Gapped,
            IsPartial = false,
            TradeCount = 0
        };
        RunReport gappedReport = service.GenerateReport(gappedRun);
        Assert.Equal("Gapped", gappedReport.DivergenceFlag);

        // Test WinningDnaJson with empty genes and parameters
        var emptyDnaRun = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Optimization,
            Status = RunStatus.Completed,
            CreatedAt = DateTimeOffset.UtcNow,
            WinningDnaJson = "{\"Genes\":[],\"Parameters\":{},\"Slots\":{\"Strategy\":null,\"Adapter\":null}}"
        };
        RunReport emptyDnaReport = service.GenerateReport(emptyDnaRun);
        Assert.NotNull(emptyDnaReport.WinningDna);
        Assert.Equal(5, emptyDnaReport.WinningDna.Genes.Count);

        // Test ConfigurationJson with empty Symbols
        var emptySymbolsRun = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Optimization,
            Status = RunStatus.Completed,
            CreatedAt = DateTimeOffset.UtcNow,
            ConfigurationJson = "{\"Symbols\":[]}"
        };
        RunReport emptySymbolsReport = service.GenerateReport(emptySymbolsRun);
        Assert.NotNull(emptySymbolsReport.WinningDna);
        Assert.Equal("BTC/USDT", emptySymbolsReport.WinningDna.Execution.Symbols[0]);
    }

    [Fact]
    public void FlowRunExcelExportService_GenerateWorkbook_CoversNullCollectionsAndDetailedMetrics()
    {
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = Guid.NewGuid(),
            Kind = RunKind.Backtest,
            Status = RunStatus.Completed,
            CreatedAt = DateTimeOffset.UtcNow,
            TradeCount = 0
        };

        RunReport report = new RunReportService().GenerateReport(run);
        RunReport emptyReport = report with
        {
            Trades = null!,
            EquityCurve = null!,
            DetailedMetrics = null,
            WinningDna = null
        };

        byte[] workbookBytes = FlowRunExcelExportService.GenerateExcelWorkbook(emptyReport);
        Assert.NotNull(workbookBytes);
        Assert.True(workbookBytes.Length > 0);
    }

    [Fact]
    public async Task StreamClientEventsEndpoint_ClientCancellation_ExitsGracefully()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));
        try
        {
            using HttpResponseMessage resp = await client.GetAsync(
                new Uri("/api/events/stream", UriKind.Relative),
                HttpCompletionOption.ResponseHeadersRead,
                cts.Token).ConfigureAwait(true);
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
            using Stream stream = await resp.Content.ReadAsStreamAsync(cts.Token).ConfigureAwait(true);
            byte[] buffer = new byte[128];
            while (!cts.IsCancellationRequested)
            {
                int read = await stream.ReadAsync(buffer, cts.Token).ConfigureAwait(true);
                if (read == 0)
                {
                    break;
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected when client disconnects
        }
    }

    [Fact]
    public async Task CommandService_CompleteAsync_WithFlowRuns_CoversSuccessFaultedAndStartLive()
    {
        using var testDb = new CloudTestDatabase();
        var cmdService = new CommandService(
            testDb,
            new CloudOptions(),
            TimeProvider.System,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<CommandService>.Instance);

        SeededAccount account = await testDb.SeedAccountAsync("cmd-flow-runs").ConfigureAwait(true);
        var regService = new EngineRegistrationService(testDb, TimeProvider.System);
        RegistrationOutcome outcome = await regService
            .RegisterAsync(account.AccountId, account.LicenseId, "cmd-flow-eng", "Flow Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        Guid activeRunId = Guid.NewGuid();
        Guid failedRunId = Guid.NewGuid();
        Guid liveRunId = Guid.NewGuid();

        using (CloudDbContext db = testDb.CreateDbContext())
        {
            db.FlowRuns.AddRange(
                new FlowRun
                {
                    Id = activeRunId,
                    EngineInstanceId = instanceId,
                    Kind = RunKind.Backtest,
                    Status = RunStatus.Running,
                    CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-5)
                },
                new FlowRun
                {
                    Id = failedRunId,
                    EngineInstanceId = instanceId,
                    Kind = RunKind.Backtest,
                    Status = RunStatus.Running,
                    CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-10)
                },
                new FlowRun
                {
                    Id = liveRunId,
                    EngineInstanceId = instanceId,
                    Kind = RunKind.Live,
                    Status = RunStatus.Running,
                    CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-2)
                });
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        // 1. Complete with isSuccess = false and explicit runId (hits faulted branch)
        CommandOutcome submitFail = await cmdService.SubmitAsync(
            instanceId,
            201,
            "RunBacktest",
            parametersJson: "{\"runId\":\"" + failedRunId + "\"}",
            timeoutSeconds: 30,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);

        CommandCompletionResult failRes = await cmdService.CompleteAsync(
            instanceId,
            submitFail.Command!.CorrelationId,
            isSuccess: false,
            resultPayloadJson: null,
            error: "Engine faulted",
            cancellationToken: CancellationToken.None).ConfigureAwait(true);
        Assert.True(failRes.Recorded);

        // 2. Complete with StartLive (hits StartLive running status & null CompletedAt branches)
        CommandOutcome submitLive = await cmdService.SubmitAsync(
            instanceId,
            202,
            "StartLive",
            parametersJson: "{\"runId\":\"" + liveRunId + "\"}",
            timeoutSeconds: 30,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);

        CommandCompletionResult liveRes = await cmdService.CompleteAsync(
            instanceId,
            submitLive.Command!.CorrelationId,
            isSuccess: true,
            resultPayloadJson: "{\"Result\":{\"NetProfit\":100.0}}",
            error: null,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);
        Assert.True(liveRes.Recorded);

        // 3. Complete without runId in parameters (resolves active running run)
        CommandOutcome submitNoRunId = await cmdService.SubmitAsync(
            instanceId,
            203,
            "StartOptimization",
            parametersJson: "{}",
            timeoutSeconds: 30,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);

        CommandCompletionResult noRunIdRes = await cmdService.CompleteAsync(
            instanceId,
            submitNoRunId.Command!.CorrelationId,
            isSuccess: true,
            resultPayloadJson: null,
            error: null,
            cancellationToken: CancellationToken.None).ConfigureAwait(true);
        Assert.True(noRunIdRes.Recorded);
        Assert.Equal(liveRunId, noRunIdRes.RunId);
    }
}
