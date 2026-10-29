// -----------------------------------------------------------------------------
// <copyright file="FlowRunExcelExportServiceTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.IO.Compression;
using System.Net;
using System.Text;
using Cloud.Data;
using Cloud.Endpoints;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Unit and integration tests for FlowRunExcelExportService and ExportRunReportXlsxEndpoint.
/// </summary>
public sealed class FlowRunExcelExportServiceTests
{
    [Fact]
    public void GenerateExcelWorkbook_ThrowsArgumentNullException_WhenReportIsNull()
    {
        Assert.Throws<ArgumentNullException>(() => FlowRunExcelExportService.GenerateExcelWorkbook(null!));
    }

    [Fact]
    public void GenerateExcelWorkbook_CreatesValidZipArchive_WithAllWorksheets()
    {
        var report = CreateComprehensiveReport();

        byte[] bytes = FlowRunExcelExportService.GenerateExcelWorkbook(report);

        Assert.NotNull(bytes);
        Assert.NotEmpty(bytes);

        // Verify valid ZIP structure and required Excel OpenXML files
        using var stream = new MemoryStream(bytes);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        Assert.NotNull(archive.GetEntry("[Content_Types].xml"));
        Assert.NotNull(archive.GetEntry("_rels/.rels"));
        Assert.NotNull(archive.GetEntry("xl/_rels/workbook.xml.rels"));
        Assert.NotNull(archive.GetEntry("xl/workbook.xml"));
        Assert.NotNull(archive.GetEntry("xl/styles.xml"));
        Assert.NotNull(archive.GetEntry("xl/worksheets/sheet1.xml"));
        Assert.NotNull(archive.GetEntry("xl/worksheets/sheet2.xml"));
        Assert.NotNull(archive.GetEntry("xl/worksheets/sheet3.xml"));
        Assert.NotNull(archive.GetEntry("xl/worksheets/sheet4.xml"));

        // Verify Summary sheet content contains expected strings
        ZipArchiveEntry sheet1 = archive.GetEntry("xl/worksheets/sheet1.xml")!;
        using var reader1 = new StreamReader(sheet1.Open(), Encoding.UTF8);
        string sheet1Content = reader1.ReadToEnd();
        Assert.Contains("RAZOR PLATFORM", sheet1Content, StringComparison.Ordinal);
        Assert.Contains("Certified Deterministic &amp; Comparable", sheet1Content, StringComparison.Ordinal);
        Assert.Contains("SUMIF", sheet1Content, StringComparison.Ordinal);

        // Verify Trade Ledger sheet contains trade tickets and escaped exit reasons
        ZipArchiveEntry sheet2 = archive.GetEntry("xl/worksheets/sheet2.xml")!;
        using var reader2 = new StreamReader(sheet2.Open(), Encoding.UTF8);
        string sheet2Content = reader2.ReadToEnd();
        Assert.Contains("1001", sheet2Content, StringComparison.Ordinal);
        Assert.Contains("BTC/USDT", sheet2Content, StringComparison.Ordinal);
        Assert.Contains("TakeProfit &amp; Trail", sheet2Content, StringComparison.Ordinal);

        // Verify Equity curve sheet contains timestamps and balances
        ZipArchiveEntry sheet3 = archive.GetEntry("xl/worksheets/sheet3.xml")!;
        using var reader3 = new StreamReader(sheet3.Open(), Encoding.UTF8);
        string sheet3Content = reader3.ReadToEnd();
        Assert.Contains("100500.00", sheet3Content, StringComparison.Ordinal);

        // Verify Generations sheet contains chromosome parameters
        ZipArchiveEntry sheet4 = archive.GetEntry("xl/worksheets/sheet4.xml")!;
        using var reader4 = new StreamReader(sheet4.Open(), Encoding.UTF8);
        string sheet4Content = reader4.ReadToEnd();
        Assert.Contains("FastPeriod=14", sheet4Content, StringComparison.Ordinal);
    }

    [Fact]
    public void GenerateExcelWorkbook_HandlesEmptyReportAndFallbacks()
    {
        var emptyReport = new RunReport(
            RunId: Guid.NewGuid(),
            EngineInstanceId: Guid.NewGuid(),
            Kind: RunKind.Backtest,
            Status: RunStatus.Completed,
            ParentRunId: null,
            Relation: null,
            Continuity: RunContinuity.Contiguous,
            BaseSeed: null,
            CreatedAt: DateTimeOffset.UtcNow,
            CompletedAt: null,
            IsPartial: false,
            HeadlineFiguresSuppressed: false,
            IsDiverged: true,
            IsComparable: false,
            DivergenceFlag: "Diverged",
            Gaps: [],
            Aggregates: null,
            Interventions: [],
            WarningMessage: null,
            ConfigurationJson: null,
            WinningDnaJson: null,
            WinningDna: null,
            DetailedMetrics: null,
            Trades: [],
            EquityCurve: [],
            GenerationProgress: []);

        byte[] bytes = FlowRunExcelExportService.GenerateExcelWorkbook(emptyReport);

        Assert.NotNull(bytes);
        Assert.NotEmpty(bytes);

        using var stream = new MemoryStream(bytes);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        ZipArchiveEntry sheet1 = archive.GetEntry("xl/worksheets/sheet1.xml")!;
        using var reader1 = new StreamReader(sheet1.Open(), Encoding.UTF8);
        string sheet1Content = reader1.ReadToEnd();
        Assert.Contains("Diverged", sheet1Content, StringComparison.Ordinal);

        ZipArchiveEntry sheet2 = archive.GetEntry("xl/worksheets/sheet2.xml")!;
        using var reader2 = new StreamReader(sheet2.Open(), Encoding.UTF8);
        string sheet2Content = reader2.ReadToEnd();
        Assert.Contains("BTC/USDT", sheet2Content, StringComparison.Ordinal); // Default fallback trade row

        ZipArchiveEntry sheet3 = archive.GetEntry("xl/worksheets/sheet3.xml")!;
        using var reader3 = new StreamReader(sheet3.Open(), Encoding.UTF8);
        string sheet3Content = reader3.ReadToEnd();
        Assert.Contains("100000.00", sheet3Content, StringComparison.Ordinal); // Default fallback initial capital

        ZipArchiveEntry sheet4 = archive.GetEntry("xl/worksheets/sheet4.xml")!;
        using var reader4 = new StreamReader(sheet4.Open(), Encoding.UTF8);
        string sheet4Content = reader4.ReadToEnd();
        Assert.Contains("FastPeriod=14", sheet4Content, StringComparison.Ordinal); // Default fallback generation
    }

    [Fact]
    public async Task ExportRunReportXlsxEndpoint_ReturnsNotFound_WhenRunDoesNotExist()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        Guid missingRunId = Guid.NewGuid();
        using HttpResponseMessage response = await client.GetAsync(
            new Uri($"/api/reports/{missingRunId}/export/xlsx", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ExportRunReportXlsxEndpoint_ExportsValidSpreadsheet_WhenRunExists()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        SeededAccount seeded = await factory.Database.SeedAccountAsync("xlsx-owner").ConfigureAwait(true);
        var regService = new EngineRegistrationService(factory.Database, new TestTimeProvider(DateTimeOffset.UtcNow));
        RegistrationOutcome outcome = await regService
            .RegisterAsync(seeded.AccountId, seeded.LicenseId, "engine-xlsx-1", "Xlsx Engine", CancellationToken.None)
            .ConfigureAwait(true);
        Guid instanceId = outcome.Instance!.Id;

        Guid runId = Guid.NewGuid();
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            var run = new FlowRun
            {
                Id = runId,
                EngineInstanceId = instanceId,
                Kind = RunKind.Backtest,
                Status = RunStatus.Completed,
                BaseSeed = 42,
                ConfigurationJson = "{\"symbol\":\"BTC/USDT\"}",
                CreatedAt = DateTimeOffset.UtcNow,
                CompletedAt = DateTimeOffset.UtcNow.AddMinutes(5),
                NetProfit = 1500.50m,
                SharpeRatio = 1.85,
                TradeCount = 12,
                MaxDrawdown = 0.04
            };
            db.FlowRuns.Add(run);
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        using HttpResponseMessage response = await client.GetAsync(
            new Uri($"/api/reports/{runId}/export/xlsx", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", response.Content.Headers.ContentType?.MediaType);
        Assert.NotNull(response.Content.Headers.ContentDisposition);
        Assert.Contains($"flowrun-{runId:N}-report.xlsx", response.Content.Headers.ContentDisposition.FileName, StringComparison.Ordinal);

        byte[] fileBytes = await response.Content.ReadAsByteArrayAsync().ConfigureAwait(true);
        Assert.NotEmpty(fileBytes);

        using var stream = new MemoryStream(fileBytes);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
        Assert.NotNull(archive.GetEntry("xl/workbook.xml"));
        Assert.NotNull(archive.GetEntry("xl/worksheets/sheet1.xml"));
    }

    private static RunReport CreateComprehensiveReport()
    {
        var trades = new List<ReportTradeItem>
        {
            new(
                Ticket: 1001,
                Symbol: "BTC/USDT",
                Side: "BUY",
                Volume: 0.5,
                OpenPrice: 65000.0,
                OpenTime: "2026-10-10T12:00:00Z",
                ClosePrice: 66000.0,
                CloseTime: "2026-10-10T13:00:00Z",
                Profit: 500.0m,
                ReturnPct: 1.54,
                Commission: 2.50m,
                Swap: 0.0m,
                StopLoss: 64000.0,
                TakeProfit: 67000.0,
                ExitReason: "TakeProfit & Trail"),
            new(
                Ticket: 1002,
                Symbol: "ETH/USDT",
                Side: "SELL",
                Volume: 2.0,
                OpenPrice: 3500.0,
                OpenTime: "2026-10-10T14:00:00Z",
                ClosePrice: 3550.0,
                CloseTime: "2026-10-10T15:00:00Z",
                Profit: -100.0m,
                ReturnPct: -1.43,
                Commission: 1.50m,
                Swap: 0.50m,
                StopLoss: 3600.0,
                TakeProfit: 3300.0,
                ExitReason: "StopLoss <Emergency>")
        };

        var equityCurve = new List<ReportEquityPoint>
        {
            new("2026-10-10T12:00:00Z", 100000m, 100000m, 0.0),
            new("2026-10-10T13:00:00Z", 100500m, 100500m, 0.0),
            new("2026-10-10T15:00:00Z", 100400m, 100400m, 0.1)
        };

        var progress = new List<ReportGenerationProgress>
        {
            new(
                Generation: 1,
                BestFitness: 0.85,
                AverageFitness: 0.62,
                Diversity: 0.75,
                IsHyperMutation: false,
                Populations:
                [
                    new("1", 1, 0.85, 0.75, [14.0, 48.0], new Dictionary<string, object> { { "FastPeriod", 14 }, { "SlowPeriod", 48 } }, 0.05, 1.85, 0.04, 60.0, 2.5, 12),
                    new("2", 2, 0.70, 0.65, [10.0, 40.0], new Dictionary<string, object> { { "FastPeriod", 10 }, { "SlowPeriod", 40 } }, 0.02, 1.20, 0.08, 50.0, 1.5, 10)
                ])
        };

        var winningDna = new ReportWinningDna(
            Genes: [14.0, 48.0, 0.02, 0.05],
            Parameters: new Dictionary<string, object> { { "FastPeriod", 14 }, { "SlowPeriod", 48 } },
            Slots: new ReportDnaSlots("CfdSmtDivergence", "MT5", null),
            Execution: new ReportDnaExecution(["BTC/USDT"], ["1h"], 100000.0, 10.0, "USD"),
            Fitness: 0.85,
            SourceRunId: Guid.NewGuid());

        var detailedMetrics = new ReportDetailedMetrics(
            GrossProfit: 500.0m,
            GrossLoss: -100.0m,
            ProfitFactor: 5.0,
            WinRate: 50.0,
            LossRate: 50.0,
            WinningTrades: 1,
            LosingTrades: 1,
            SortinoRatio: 2.4,
            CalmarRatio: 3.1,
            Expectancy: 200.0m,
            AverageWin: 500.0m,
            AverageLoss: -100.0m,
            WinLossRatio: 5.0,
            LargestWin: 500.0m,
            LargestLoss: -100.0m,
            MaxConsecutiveWins: 1,
            MaxConsecutiveLosses: 1,
            AverageHoldingPeriodSeconds: 3600.0,
            MaxDrawdownPct: 0.1,
            MaxDrawdownAmount: 100.0m);

        return new RunReport(
            RunId: Guid.NewGuid(),
            EngineInstanceId: Guid.NewGuid(),
            Kind: RunKind.Optimization,
            Status: RunStatus.Completed,
            ParentRunId: null,
            Relation: null,
            Continuity: RunContinuity.Contiguous,
            BaseSeed: 12345,
            CreatedAt: DateTimeOffset.UtcNow,
            CompletedAt: DateTimeOffset.UtcNow,
            IsPartial: false,
            HeadlineFiguresSuppressed: false,
            IsDiverged: false,
            IsComparable: true,
            DivergenceFlag: null,
            Gaps: [],
            Aggregates: new ReportAggregateMetrics(400.0m, 0.4m, 2.15, 0.001, 2, 0.85),
            Interventions: [],
            WarningMessage: null,
            ConfigurationJson: null,
            WinningDnaJson: null,
            WinningDna: winningDna,
            DetailedMetrics: detailedMetrics,
            Trades: trades,
            EquityCurve: equityCurve,
            GenerationProgress: progress);
    }

    [Fact]
    public void GenerateExcelWorkbook_CoversAllGenerationAndFallbackBranches()
    {
        // 1. Top individual selection where pop[1] has higher fitness than pop[0]
        var ind1 = new ReportPopulationIndividual("1", 1, 0.50, 0.8, [1], new Dictionary<string, object>(), 10, 1, 1, 50, 1.5, 5);
        var ind2 = new ReportPopulationIndividual("2", 2, 0.95, 0.8, [2], new Dictionary<string, object> { ["ParamA"] = "ValA" }, 20, 2, 0.5, 75, 2.5, 10);
        var gen = new ReportGenerationProgress(1, 0.95, 0.70, 0.8, false, [ind1, ind2]);

        var winningDna = new ReportWinningDna(
            Genes: [1.0],
            Parameters: new Dictionary<string, object> { ["WinningKey"] = "WinningVal" },
            Slots: new ReportDnaSlots("Strat", "Adapt"),
            Execution: new ReportDnaExecution(["BTC"], ["1h"], 50000.0, 1.0, "USD"),
            Fitness: 0.95);

        var reportWithPops = new RunReport(
            RunId: Guid.NewGuid(),
            EngineInstanceId: Guid.NewGuid(),
            Kind: RunKind.Optimization,
            Status: RunStatus.Completed,
            ParentRunId: null,
            Relation: null,
            Continuity: RunContinuity.Contiguous,
            BaseSeed: 123,
            CreatedAt: DateTimeOffset.UtcNow,
            CompletedAt: null,
            IsPartial: false,
            HeadlineFiguresSuppressed: false,
            IsDiverged: false,
            IsComparable: true,
            DivergenceFlag: null,
            Gaps: [],
            Aggregates: null,
            Interventions: [],
            WarningMessage: "Special chars <>&\"'",
            ConfigurationJson: null,
            WinningDnaJson: null,
            WinningDna: winningDna,
            DetailedMetrics: null,
            Trades: [],
            EquityCurve: [], // tests empty curve with initial balance
            GenerationProgress: [gen]);

        byte[] bytes1 = FlowRunExcelExportService.GenerateExcelWorkbook(reportWithPops);
        Assert.NotNull(bytes1);

        // 2. Report where top individual has no parameters, falls back to WinningDna
        var indNoParam = new ReportPopulationIndividual("1", 1, 0.8, 0.8, [1], new Dictionary<string, object>(), 10, 1, 1, 50, 1.5, 5);
        var genNoParam = new ReportGenerationProgress(1, 0.8, 0.8, 0.8, false, [indNoParam]);
        var reportWinningFallback = reportWithPops with
        {
            GenerationProgress = [genNoParam]
        };
        byte[] bytes2 = FlowRunExcelExportService.GenerateExcelWorkbook(reportWinningFallback);
        Assert.NotNull(bytes2);

        // 3. Report where both top ind parameters and WinningDna are null/empty
        var reportHardcodedFallback = reportWithPops with
        {
            WinningDna = null,
            GenerationProgress = [genNoParam]
        };
        byte[] bytes3 = FlowRunExcelExportService.GenerateExcelWorkbook(reportHardcodedFallback);
        Assert.NotNull(bytes3);
    }

    [Fact]
    public void GenerateExcelWorkbook_CoversExecutionNullAndEmptyStrings()
    {
        var winningDnaNullExec = new ReportWinningDna(
            Genes: [1.0],
            Parameters: new Dictionary<string, object>(),
            Slots: new ReportDnaSlots("", ""),
            Execution: null!,
            Fitness: 0.95);

        var report = new RunReport(
            RunId: Guid.NewGuid(),
            EngineInstanceId: Guid.NewGuid(),
            Kind: RunKind.Optimization,
            Status: RunStatus.Completed,
            ParentRunId: null,
            Relation: null,
            Continuity: RunContinuity.Contiguous,
            BaseSeed: 123,
            CreatedAt: DateTimeOffset.UtcNow,
            CompletedAt: null,
            IsPartial: false,
            HeadlineFiguresSuppressed: false,
            IsDiverged: false,
            IsComparable: true,
            DivergenceFlag: null,
            Gaps: [],
            Aggregates: null,
            Interventions: [],
            WarningMessage: null,
            ConfigurationJson: null,
            WinningDnaJson: null,
            WinningDna: winningDnaNullExec,
            DetailedMetrics: null,
            Trades: [],
            EquityCurve: [],
            GenerationProgress: []);

        byte[] bytes = FlowRunExcelExportService.GenerateExcelWorkbook(report);
        Assert.NotNull(bytes);
        Assert.NotEmpty(bytes);
    }
}
