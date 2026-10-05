// -----------------------------------------------------------------------------
// <copyright file="RunRankingServiceTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests.Lineage;

using Cloud.Data;
using Cloud.Services;
using Xunit;

public sealed class RunRankingServiceTests
{
    private readonly RunRankingService _sut;

    public RunRankingServiceTests()
    {
        _sut = new RunRankingService();
    }

    [Fact]
    public void RankRuns_PrimaryPath_CleanRunsOnly_RanksByNetProfit()
    {
        // Arrange
        var r1 = new FlowRun { Id = Guid.NewGuid(), NetProfit = 100m, Relation = null };
        var r2 = new FlowRun { Id = Guid.NewGuid(), NetProfit = 200m, Relation = null };
        var r3 = new FlowRun { Id = Guid.NewGuid(), NetProfit = 50m, Relation = null };
        var runs = new[] { r1, r2, r3 };

        // Act
        var rankings = _sut.RankRuns(runs, RankingMetric.NetProfit, includeDiverged: false);

        // Assert
        Assert.Equal(3, rankings.Count);
        Assert.Equal(r2.Id, rankings[0].RunId); // 200
        Assert.Equal(r1.Id, rankings[1].RunId); // 100
        Assert.Equal(r3.Id, rankings[2].RunId); // 50

        Assert.All(rankings, r => Assert.False(r.IsDiverged));
    }

    [Fact]
    public void RankRuns_BoundaryPath_ExcludeDiverged_FiltersOutDivergedAndGapped()
    {
        // Arrange
        var clean = new FlowRun { Id = Guid.NewGuid(), NetProfit = 100m, Relation = null };
        var branched = new FlowRun { Id = Guid.NewGuid(), NetProfit = 500m, Relation = RunRelation.Branched };
        var gapped = new FlowRun { Id = Guid.NewGuid(), NetProfit = 1000m, Continuity = RunContinuity.Gapped };
        var runs = new[] { clean, branched, gapped };

        // Act
        var rankings = _sut.RankRuns(runs, RankingMetric.NetProfit, includeDiverged: false);

        // Assert
        Assert.Single(rankings);
        Assert.Equal(clean.Id, rankings[0].RunId);
    }

    [Fact]
    public void RankRuns_NegativePath_IncludeDiverged_IncludesButFlagsThem()
    {
        // Arrange
        var clean = new FlowRun { Id = Guid.NewGuid(), NetProfit = 100m, Relation = null };
        var branched = new FlowRun { Id = Guid.NewGuid(), NetProfit = 500m, Relation = RunRelation.Branched };
        var gappedOnly = new FlowRun { Id = Guid.NewGuid(), NetProfit = 800m, Continuity = RunContinuity.Gapped, Relation = null };
        var branchedAndGapped = new FlowRun { Id = Guid.NewGuid(), NetProfit = 900m, Continuity = RunContinuity.Gapped, Relation = RunRelation.Spliced };
        
        var runs = new[] { clean, branched, gappedOnly, branchedAndGapped };

        // Act
        var rankings = _sut.RankRuns(runs, RankingMetric.NetProfit, includeDiverged: true);

        // Assert
        Assert.Equal(4, rankings.Count);
        
        // 900
        Assert.Equal(branchedAndGapped.Id, rankings[0].RunId);
        Assert.True(rankings[0].IsDiverged);
        Assert.Equal("Spliced + Gapped", rankings[0].DivergenceFlag);

        // 800
        Assert.Equal(gappedOnly.Id, rankings[1].RunId);
        Assert.True(rankings[1].IsDiverged);
        Assert.Equal("Gapped", rankings[1].DivergenceFlag);

        // 500
        Assert.Equal(branched.Id, rankings[2].RunId);
        Assert.True(rankings[2].IsDiverged);
        Assert.Equal("Branched", rankings[2].DivergenceFlag);

        // 100
        Assert.Equal(clean.Id, rankings[3].RunId);
        Assert.False(rankings[3].IsDiverged);
        Assert.Null(rankings[3].DivergenceFlag);
    }

    [Fact]
    public void RankRuns_TestsAllMetrics()
    {
        // Arrange
        var run = new FlowRun { Id = Guid.NewGuid(), NetProfit = 10m, TotalReturn = 5m, SharpeRatio = 2.0, BestFitness = 4.0 };
        var runs = new[] { run };

        // Act & Assert
        Assert.Equal(10.0, _sut.RankRuns(runs, RankingMetric.NetProfit)[0].Score);
        Assert.Equal(5.0, _sut.RankRuns(runs, RankingMetric.TotalReturn)[0].Score);
        Assert.Equal(2.0, _sut.RankRuns(runs, RankingMetric.SharpeRatio)[0].Score);
        Assert.Equal(4.0, _sut.RankRuns(runs, RankingMetric.BestFitness)[0].Score);
        Assert.Equal(0.0, _sut.RankRuns(runs, (RankingMetric)999)[0].Score); // fallback
    }

    [Fact]
    public void SelectBestResult_PrimaryPath_ReturnsTopRun()
    {
        // Arrange
        var clean1 = new FlowRun { Id = Guid.NewGuid(), SharpeRatio = 1.2, Relation = null };
        var clean2 = new FlowRun { Id = Guid.NewGuid(), SharpeRatio = 2.5, Relation = null };
        var branched = new FlowRun { Id = Guid.NewGuid(), SharpeRatio = 5.0, Relation = RunRelation.Branched };
        var runs = new[] { clean1, clean2, branched };

        // Act (allowDiverged: false)
        var bestClean = _sut.SelectBestResult(runs, RankingMetric.SharpeRatio, allowDiverged: false);

        // Assert
        Assert.NotNull(bestClean);
        Assert.Equal(clean2.Id, bestClean.RunId);

        // Act (allowDiverged: true)
        var bestOverall = _sut.SelectBestResult(runs, RankingMetric.SharpeRatio, allowDiverged: true);

        // Assert
        Assert.NotNull(bestOverall);
        Assert.Equal(branched.Id, bestOverall.RunId);
        Assert.True(bestOverall.IsDiverged);
        Assert.Equal("Branched", bestOverall.DivergenceFlag);
    }
}
