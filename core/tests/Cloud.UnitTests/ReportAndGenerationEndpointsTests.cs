// -----------------------------------------------------------------------------
// <copyright file="ReportAndGenerationEndpointsTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cloud.Data;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;

/// <summary>
/// Integration tests for ListReportsEndpoint, ListTradesEndpoint, GetTradeEndpoint,
/// ListGenerationsEndpoint, GetGenerationEndpoint, and GetPopulationEndpoint.
/// </summary>
public sealed class ReportAndGenerationEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task ListReportsEndpoint_ReturnsAllReports()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount seeded = await factory.Database.SeedAccountAsync("rep-owner").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, new TestTimeProvider(DateTimeOffset.UtcNow));
        RegistrationOutcome outcome = await regService
            .RegisterAsync(seeded.AccountId, seeded.LicenseId, "engine-rep-1", "Reports Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        Guid runId = Guid.NewGuid();
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            db.FlowRuns.Add(new FlowRun
            {
                Id = runId,
                EngineInstanceId = instanceId,
                Kind = RunKind.Optimization,
                Status = RunStatus.Completed,
                CreatedAt = DateTimeOffset.UtcNow,
                NetProfit = 2500m
            });
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        using HttpResponseMessage response = await client.GetAsync(
            new Uri("/api/reports", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        List<RunReport>? reports = await response.Content.ReadFromJsonAsync<List<RunReport>>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(reports);
        Assert.Contains(reports, r => r.RunId == runId);
    }

    [Fact]
    public async Task TradeEndpoints_ListAndGetTrades_HandlesFilteringAndPagination()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount seeded = await factory.Database.SeedAccountAsync("trade-owner").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, new TestTimeProvider(DateTimeOffset.UtcNow));
        RegistrationOutcome outcome = await regService
            .RegisterAsync(seeded.AccountId, seeded.LicenseId, "engine-trade-1", "Trade Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        Guid runId = Guid.NewGuid();
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            db.FlowRuns.Add(new FlowRun
            {
                Id = runId,
                EngineInstanceId = instanceId,
                Kind = RunKind.Backtest,
                Status = RunStatus.Completed,
                CreatedAt = DateTimeOffset.UtcNow,
                ResultPayloadJson = """
                {
                  "Trades": [
                    { "Ticket": 501, "Symbol": "BTC/USDT", "Side": "Buy", "Profit": 150.0 },
                    { "Ticket": 502, "Symbol": "ETH/USDT", "Side": "Sell", "Profit": -50.0 }
                  ]
                }
                """
            });
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        // 1. List with symbol filter
        using HttpResponseMessage filteredResp = await client.GetAsync(
            new Uri($"/api/reports/{runId}/trades?Symbol=BTC/USDT", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, filteredResp.StatusCode);

        // 2. List with pagination
        using HttpResponseMessage pagedResp = await client.GetAsync(
            new Uri($"/api/reports/{runId}/trades?Page=1&PageSize=1", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, pagedResp.StatusCode);
        PagedResult<ReportTradeItem>? paged = await pagedResp.Content.ReadFromJsonAsync<PagedResult<ReportTradeItem>>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(paged);
        Assert.Equal(1, paged.Page);
        Assert.Equal(2, paged.TotalCount);

        // 3. Get single trade
        using HttpResponseMessage singleResp = await client.GetAsync(
            new Uri($"/api/reports/{runId}/trades/501", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, singleResp.StatusCode);
        ReportTradeItem? trade = await singleResp.Content.ReadFromJsonAsync<ReportTradeItem>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(trade);
        Assert.Equal(501, trade.Ticket);

        // 4. Missing trade ticket
        using HttpResponseMessage missingTradeResp = await client.GetAsync(
            new Uri($"/api/reports/{runId}/trades/999999", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, missingTradeResp.StatusCode);

        // 5. Missing run
        using HttpResponseMessage missingRunResp = await client.GetAsync(
            new Uri($"/api/reports/{Guid.NewGuid()}/trades", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, missingRunResp.StatusCode);
    }

    [Fact]
    public async Task GenerationEndpoints_ListAndGetGenerations_HandlesPaginationAndIndividual()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount seeded = await factory.Database.SeedAccountAsync("gen-owner").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, new TestTimeProvider(DateTimeOffset.UtcNow));
        RegistrationOutcome outcome = await regService
            .RegisterAsync(seeded.AccountId, seeded.LicenseId, "engine-gen-1", "Gen Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        Guid runId = Guid.NewGuid();
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            db.FlowRuns.Add(new FlowRun
            {
                Id = runId,
                EngineInstanceId = instanceId,
                Kind = RunKind.Optimization,
                Status = RunStatus.Completed,
                CreatedAt = DateTimeOffset.UtcNow,
                ResultPayloadJson = """
                {
                  "GenerationProgress": [
                    {
                      "Generation": 1,
                      "BestFitness": 0.92,
                      "AverageFitness": 0.75,
                      "Diversity": 0.80,
                      "Populations": [
                        { "Id": "10", "Fitness": 0.92, "Profit": 5000.0 }
                      ]
                    }
                  ]
                }
                """
            });
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        // 1. List generations with pagination
        using HttpResponseMessage listResp = await client.GetAsync(
            new Uri($"/api/reports/{runId}/generations?Page=1&PageSize=10", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        PagedResult<ReportGenerationProgress>? paged = await listResp.Content.ReadFromJsonAsync<PagedResult<ReportGenerationProgress>>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(paged);
        Assert.Equal(1, paged.TotalCount);

        // 2. Get generation detail
        using HttpResponseMessage genResp = await client.GetAsync(
            new Uri($"/api/reports/{runId}/generations/1", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, genResp.StatusCode);
        ReportGenerationProgress? gen = await genResp.Content.ReadFromJsonAsync<ReportGenerationProgress>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(gen);
        Assert.Equal(1, gen.Generation);
        Assert.Equal(0.92, gen.BestFitness);

        // 3. Get population individual
        using HttpResponseMessage popResp = await client.GetAsync(
            new Uri($"/api/reports/{runId}/generations/1/populations/10", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, popResp.StatusCode);
        ReportPopulationIndividual? ind = await popResp.Content.ReadFromJsonAsync<ReportPopulationIndividual>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(ind);
        Assert.Equal("10", ind.Id);
        Assert.Equal(0.92, ind.Fitness);

        // 4. Missing generation returns 404
        using HttpResponseMessage missingGenResp = await client.GetAsync(
            new Uri($"/api/reports/{runId}/generations/999", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, missingGenResp.StatusCode);

        // 5. Missing population individual returns 404
        using HttpResponseMessage missingPopResp = await client.GetAsync(
            new Uri($"/api/reports/{runId}/generations/1/populations/999", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, missingPopResp.StatusCode);
    }

    [Fact]
    public async Task ReportAndTradeEndpoints_CoversUnpagedAndDirectTicketSearch()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount seeded = await factory.Database.SeedAccountAsync("unpaged-owner").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, new TestTimeProvider(DateTimeOffset.UtcNow));
        RegistrationOutcome outcome = await regService
            .RegisterAsync(seeded.AccountId, seeded.LicenseId, "engine-unpaged-1", "Unpaged Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        Guid runId = Guid.NewGuid();
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            db.FlowRuns.Add(new FlowRun
            {
                Id = runId,
                EngineInstanceId = instanceId,
                Kind = RunKind.Backtest,
                Status = RunStatus.Completed,
                CreatedAt = DateTimeOffset.UtcNow,
                TradeCount = 5,
                NetProfit = 1200m,
                ResultPayloadJson = """
                {
                  "Trades": [
                    {
                      "Ticket": 8881,
                      "Symbol": "ETH/USDT",
                      "Side": "Buy",
                      "Volume": 2.0,
                      "OpenPrice": 3500.0,
                      "OpenTime": "2026-10-10T12:00:00Z",
                      "ClosePrice": 3600.0,
                      "CloseTime": "2026-10-10T14:00:00Z",
                      "Profit": 200.0,
                      "ExitReason": "TakeProfit"
                    }
                  ]
                }
                """
            });
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        // 1. Direct trade ticket search across recent runs (/api/trades/{ticket})
        using HttpResponseMessage tradeResp = await client.GetAsync(new Uri("/api/trades/8881", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, tradeResp.StatusCode);
        ReportTradeItem? trade = await tradeResp.Content.ReadFromJsonAsync<ReportTradeItem>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(trade);
        Assert.Equal(8881, trade.Ticket);

        // Missing ticket returns 404
        using HttpResponseMessage missingTrade = await client.GetAsync(new Uri("/api/trades/99999", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, missingTrade.StatusCode);

        // 2. Unpaged /api/reports
        client.DefaultRequestHeaders.Add("X-Account-Id", seeded.AccountId.ToString());
        using HttpResponseMessage unpagedResp = await client.GetAsync(new Uri($"/api/reports?InstanceId={instanceId}", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, unpagedResp.StatusCode);
        List<RunReport>? reports = await unpagedResp.Content.ReadFromJsonAsync<List<RunReport>>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(reports);
        Assert.Single(reports);

        // 3. Unpaged /api/reports/{id}/generations
        using HttpResponseMessage unpagedGenResp = await client.GetAsync(new Uri($"/api/reports/{runId}/generations", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, unpagedGenResp.StatusCode);

        // 4. Missing run 404 on generation and population
        Guid missingRun = Guid.NewGuid();
        using HttpResponseMessage noRunGen = await client.GetAsync(new Uri($"/api/reports/{missingRun}/generations", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, noRunGen.StatusCode);

        using HttpResponseMessage noRunPop = await client.GetAsync(new Uri($"/api/reports/{missingRun}/generations/1/populations/1", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, noRunPop.StatusCode);
    }

}
