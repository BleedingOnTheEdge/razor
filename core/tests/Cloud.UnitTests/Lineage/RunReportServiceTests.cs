// -----------------------------------------------------------------------------
// <copyright file="RunReportServiceTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests.Lineage;

using Cloud.Data;
using Cloud.Services;
using Xunit;

public sealed class RunReportServiceTests
{
    private readonly RunReportService _sut;

    public RunReportServiceTests()
    {
        _sut = new RunReportService();
    }

    [Fact]
    public void GenerateReport_PrimaryPath_OriginalRun_GeneratesCleanReport()
    {
        // Arrange
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            Relation = null,
            Continuity = RunContinuity.Contiguous,
            IsPartial = false,
            NetProfit = 1000m,
            SharpeRatio = 1.5,
            TradeCount = 50
        };

        // Act
        RunReport report = _sut.GenerateReport(run);

        // Assert
        Assert.True(report.IsComparable);
        Assert.False(report.IsDiverged);
        Assert.False(report.HeadlineFiguresSuppressed);
        Assert.NotNull(report.Aggregates);
        Assert.Equal(1000m, report.Aggregates.NetProfit);
        Assert.Equal(50, report.Aggregates.TradeCount);
        Assert.Null(report.WarningMessage);
    }

    [Fact]
    public void GenerateReport_BoundaryPath_DivergedRun_IsReportableButNotComparable()
    {
        // Arrange
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            Relation = RunRelation.Branched,
            Continuity = RunContinuity.Contiguous,
            IsPartial = false,
            NetProfit = 500m
        };

        // Act
        RunReport report = _sut.GenerateReport(run);

        // Assert
        Assert.False(report.IsComparable);
        Assert.True(report.IsDiverged);
        Assert.Equal("Branched", report.DivergenceFlag);

        // Headline figures are NOT suppressed for diverged-but-contiguous runs
        Assert.False(report.HeadlineFiguresSuppressed);
        Assert.NotNull(report.Aggregates);
        Assert.Equal(500m, report.Aggregates.NetProfit);
    }

    [Fact]
    public void GenerateReport_NegativePath_GappedRun_SuppressesHeadlineFigures()
    {
        // Arrange
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            Relation = RunRelation.Appended,
            Continuity = RunContinuity.Gapped,
            IsPartial = true,
            NetProfit = 1200m,
            TradeCount = 10
        };
        run.Gaps.Add(new RunGap
        {
            StartStep = 100,
            EndStep = 200,
            Reason = "Data feed failure"
        });

        // Act
        RunReport report = _sut.GenerateReport(run);

        // Assert
        Assert.False(report.IsComparable);
        Assert.True(report.IsDiverged);
        Assert.True(report.HeadlineFiguresSuppressed);
        Assert.Equal("Appended + Gapped", report.DivergenceFlag);

        // Aggregates over gaps are nullified except invariant counts
        Assert.NotNull(report.Aggregates);
        Assert.Null(report.Aggregates.NetProfit);
        Assert.Equal(10, report.Aggregates.TradeCount);

        Assert.NotNull(report.WarningMessage);
        Assert.Contains("suppressed because the run contains known gaps", report.WarningMessage, StringComparison.Ordinal);
        Assert.Contains("Data feed failure", report.WarningMessage, StringComparison.Ordinal);
    }

    [Fact]
    public void GenerateReport_BoundaryPath_OriginalGappedRun_IsFlaggedAsGapped()
    {
        // Arrange
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            Relation = null,
            Continuity = RunContinuity.Gapped,
            IsPartial = true,
            NetProfit = 1200m
        };

        // Act
        RunReport report = _sut.GenerateReport(run);

        // Assert
        Assert.True(report.IsDiverged);
        Assert.Equal("Gapped", report.DivergenceFlag);
    }

    [Fact]
    public void GenerateReport_PrimaryPath_RunWithInterventions_MapsInterventions()
    {
        // Arrange
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            Relation = null,
            Continuity = RunContinuity.Contiguous,
            IsPartial = false,
            NetProfit = 1000m
        };
        run.Interventions.Add(new RunIntervention
        {
            StepIndex = 10,
            PreviousFingerprint = "old",
            NewFingerprint = "new",
            Actor = "operator",
            Reason = "manual fix",
            ModificationsSummary = "fixed bug",
            BeforePayloadJson = "{}",
            AfterPayloadJson = "{}"
        });

        // Act
        RunReport report = _sut.GenerateReport(run);

        // Assert
        Assert.Single(report.Interventions);
        Assert.Equal("manual fix", report.Interventions[0].Reason);
        Assert.Equal("{}", report.Interventions[0].BeforePayloadJson);
    }

    [Fact]
    public void GenerateReport_BoundaryPath_NullGapsAndInterventions_DoesNotThrow()
    {
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            Relation = RunRelation.Spliced,
            Continuity = RunContinuity.Contiguous,
            IsPartial = false,
            Gaps = null!,
            Interventions = null!
        };

        RunReport report = _sut.GenerateReport(run);
        Assert.True(report.IsDiverged);
        Assert.Equal("Spliced", report.DivergenceFlag);
        Assert.Empty(report.Gaps);
        Assert.Empty(report.Interventions);
    }

    [Fact]
    public void GenerateReport_WithWinningDnaJson_ExtractsDnaParametersAndGenes()
    {
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            Continuity = RunContinuity.Contiguous,
            WinningDnaJson = "{\"Genes\":[10.5, 20.5],\"Parameters\":{\"Period\":14,\"Mode\":\"Fast\"},\"Slots\":{\"Strategy\":\"CustomStrat\",\"Adapter\":\"CustomAdapter\"},\"Fitness\":0.95}"
        };

        RunReport report = _sut.GenerateReport(run);

        Assert.NotNull(report.WinningDna);
        Assert.Equal(2, report.WinningDna.Genes.Count);
        Assert.Equal(10.5, report.WinningDna.Genes[0]);
        Assert.Equal("CustomStrat", report.WinningDna.Slots.Strategy);
        Assert.Equal("CustomAdapter", report.WinningDna.Slots.Adapter);
        Assert.Equal(0.95, report.WinningDna.Fitness);
    }

    [Fact]
    public void GenerateReport_WithConfigurationJson_ExtractsStrategyAndSymbols()
    {
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            Continuity = RunContinuity.Contiguous,
            ConfigurationJson = "{\"StrategyName\":\"RsiStrategy\",\"AdapterName\":\"Binance\",\"Symbols\":[\"SOL/USDT\"],\"strategy\":{\"Period\":14,\"Name\":\"Rsi\",\"genes\":[1.0, 2.0]}}"
        };

        RunReport report = _sut.GenerateReport(run);

        Assert.NotNull(report.WinningDna);
        Assert.Equal("RsiStrategy", report.WinningDna.Slots.Strategy);
        Assert.Equal("Binance", report.WinningDna.Slots.Adapter);
        Assert.Equal("SOL/USDT", report.WinningDna.Execution.Symbols[0]);
    }

    [Fact]
    public void GenerateReport_WithFullResultPayload_ExtractsTradesDetailedMetricsAndGenerations()
    {
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            Kind = RunKind.Optimization,
            Continuity = RunContinuity.Contiguous,
            ResultPayloadJson = "{\"Result\":{\"Trades\":[{\"Ticket\":1234,\"Symbol\":\"BTC/USDT\",\"Side\":\"Buy\",\"Volume\":1.5,\"OpenPrice\":50000.0,\"OpenTime\":\"2026-10-10\",\"ClosePrice\":51000.0,\"CloseTime\":\"2026-10-11\",\"Profit\":1500.0,\"ReturnPct\":3.0,\"Commission\":5.0,\"Swap\":1.0,\"StopLoss\":49000.0,\"TakeProfit\":52000.0,\"ExitReason\":\"TakeProfit\"}],\"EquityCurve\":[{\"Timestamp\":\"2026-10-10\",\"Balance\":100000.0,\"Equity\":100000.0,\"DrawdownPct\":0.0},{\"Timestamp\":\"2026-10-11\",\"Balance\":101500.0,\"Equity\":101500.0,\"DrawdownPct\":0.0}],\"DetailedMetrics\":{\"GrossProfit\":1500.0,\"GrossLoss\":0.0,\"ProfitFactor\":10.0,\"WinRate\":100.0,\"LossRate\":0.0,\"WinningTrades\":1,\"LosingTrades\":0,\"SortinoRatio\":3.5,\"CalmarRatio\":5.0,\"Expectancy\":1500.0,\"AverageWin\":1500.0,\"AverageLoss\":0.0,\"WinLossRatio\":10.0,\"LargestWin\":1500.0,\"LargestLoss\":0.0,\"MaxConsecutiveWins\":1,\"MaxConsecutiveLosses\":0,\"AverageHoldingPeriodSeconds\":86400.0,\"MaxDrawdownPct\":0.0,\"MaxDrawdownAmount\":0.0},\"GenerationProgress\":[{\"Generation\":1,\"BestFitness\":0.95,\"AverageFitness\":0.70,\"Diversity\":0.85,\"Populations\":[{\"IndividualId\":1,\"Fitness\":0.80,\"Parameters\":{\"Fast\":\"10\"}},{\"IndividualId\":2,\"Fitness\":0.95,\"Parameters\":{\"Fast\":\"14\"}}]}]}}"
        };

        RunReport report = _sut.GenerateReport(run);

        Assert.NotNull(report.Trades);
        Assert.NotEmpty(report.Trades);
        Assert.Equal(1234, report.Trades[0].Ticket);
        Assert.NotNull(report.EquityCurve);
        Assert.Equal(2, report.EquityCurve.Count);
        Assert.NotNull(report.DetailedMetrics);
        Assert.Equal(1500.0m, report.DetailedMetrics.GrossProfit);
        Assert.NotNull(report.GenerationProgress);
        Assert.Single(report.GenerationProgress);
        Assert.Equal(0.95, report.GenerationProgress[0].BestFitness);
    }

    [Fact]
    public void GenerateReport_WithInvalidJson_DoesNotThrowAndFallsBack()
    {
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            Continuity = RunContinuity.Contiguous,
            WinningDnaJson = "{ invalid json }",
            ConfigurationJson = "{ broken json }",
            ResultPayloadJson = "{ not json }"
        };

        RunReport report = _sut.GenerateReport(run);
        Assert.NotNull(report);
        Assert.NotNull(report.WinningDna);
        Assert.NotNull(report.Trades);
        Assert.Empty(report.Trades);
        Assert.NotNull(report.EquityCurve);
        Assert.Empty(report.EquityCurve);
    }

    [Fact]
    public void GenerateReport_RunWithMissingTelemetry_ReturnsEmptyCollectionsWithoutFabrication()
    {
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            Status = RunStatus.Completed,
            Continuity = RunContinuity.Contiguous,
            TradeCount = 25,
            NetProfit = 1500m,
            ResultPayloadJson = null
        };

        RunReport report = _sut.GenerateReport(run);
        Assert.NotNull(report);
        Assert.False(report.IsPartial);
        Assert.False(report.HeadlineFiguresSuppressed);
        Assert.NotNull(report.Trades);
        Assert.Empty(report.Trades);
        Assert.NotNull(report.EquityCurve);
        Assert.Empty(report.EquityCurve);
    }
}

