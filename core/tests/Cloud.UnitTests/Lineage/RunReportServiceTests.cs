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
}
