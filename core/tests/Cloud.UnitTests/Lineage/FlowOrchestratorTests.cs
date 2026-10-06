// -----------------------------------------------------------------------------
// <copyright file="FlowOrchestratorTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests.Lineage;

using Cloud.Data;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

public sealed class FlowOrchestratorTests : IDisposable
{
    private readonly CloudTestDatabase _db;
    private readonly LineageService _lineageService;
    private readonly FlowOrchestrator _sut;

    public FlowOrchestratorTests()
    {
        _db = new CloudTestDatabase();
        _lineageService = new LineageService(_db, TimeProvider.System, NullLogger<LineageService>.Instance);
        _sut = new FlowOrchestrator(_db, _lineageService, TimeProvider.System, NullLogger<FlowOrchestrator>.Instance);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task StartOriginalRun_PrimaryPath_StartsRunAndSetsSeed()
    {
        // Arrange
        SeededAccount account = await _db.SeedAccountAsync();
        EngineInstance instance = await _db.SeedEngineInstanceAsync(account.AccountId, account.LicenseId);

        // Act
        FlowRun run = await _sut.StartOriginalRunAsync(instance.Id, RunKind.Optimization, baseSeed: 999);

        // Assert
        Assert.Equal(RunStatus.Running, run.Status);
        Assert.Equal(999, run.BaseSeed);
    }

    [Fact]
    public async Task PauseRun_PrimaryPath_TransitionsToPaused()
    {
        // Arrange
        SeededAccount account = await _db.SeedAccountAsync();
        EngineInstance instance = await _db.SeedEngineInstanceAsync(account.AccountId, account.LicenseId);
        FlowRun run = await _sut.StartOriginalRunAsync(instance.Id, RunKind.Optimization);

        // Act
        FlowRun paused = await _sut.PauseRunAsync(run.Id);

        // Assert
        Assert.Equal(RunStatus.Paused, paused.Status);
    }

    [Fact]
    public async Task PauseRun_NegativePath_ThrowsForNonExistentRun()
    {
        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() => _sut.PauseRunAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task ResumeWithIntervention_PrimaryPath_CreatesSplicedChild()
    {
        // Arrange
        SeededAccount account = await _db.SeedAccountAsync();
        EngineInstance instance = await _db.SeedEngineInstanceAsync(account.AccountId, account.LicenseId);
        FlowRun parent = await _sut.StartOriginalRunAsync(instance.Id, RunKind.Optimization, baseSeed: 100);

        var intervention = new InterventionSpecification(
            10,
            "hash1",
            "hash2",
            "operator",
            "Fixing mistake"
        );

        // Act
        FlowRun child = await _sut.ResumeWithInterventionAsync(
            parent.Id,
            new ForkPoint { Step = 10 },
            intervention,
            "S1"
        );

        // Assert
        Assert.Equal(RunRelation.Spliced, child.Relation);
        Assert.Equal(RunContinuity.Contiguous, child.Continuity);
        Assert.Equal(RunStatus.Running, child.Status);
        Assert.Equal(100, child.BaseSeed); // Inherited
        Assert.Equal("S1", child.RandomPosition);
        
        FlowRun fetchedParent = (await _lineageService.GetRunAsync(parent.Id))!;
        Assert.Equal(RunStatus.Paused, fetchedParent.Status); // Parent must be paused
    }

    [Fact]
    public async Task BranchFromCheckpoint_PrimaryPath_CreatesBranchedChild()
    {
        // Arrange
        SeededAccount account = await _db.SeedAccountAsync();
        EngineInstance instance = await _db.SeedEngineInstanceAsync(account.AccountId, account.LicenseId);
        FlowRun parent = await _sut.StartOriginalRunAsync(instance.Id, RunKind.Optimization);

        var intervention = new InterventionSpecification(
            5,
            "hashA",
            "hashB",
            "operator",
            "Testing alternative strategy"
        );

        // Act
        FlowRun child = await _sut.BranchFromCheckpointAsync(
            parent.Id,
            new ForkPoint { Step = 5 },
            intervention,
            "S2",
            childSeed: 500
        );

        // Assert
        Assert.Equal(RunRelation.Branched, child.Relation);
        Assert.Equal(RunStatus.Running, child.Status);
        Assert.Equal(500, child.BaseSeed); // Overridden
    }

    [Fact]
    public async Task CompleteRun_PrimaryPath_SetsMetricsAndCompletedState()
    {
        // Arrange
        SeededAccount account = await _db.SeedAccountAsync();
        EngineInstance instance = await _db.SeedEngineInstanceAsync(account.AccountId, account.LicenseId);
        FlowRun run = await _sut.StartOriginalRunAsync(instance.Id, RunKind.Optimization);

        var metrics = new ReportAggregateMetrics(
            NetProfit: 1000m,
            TotalReturn: 10.5m,
            SharpeRatio: 2.1,
            MaxDrawdown: -5.0,
            TradeCount: 100,
            BestFitness: 1.2
        );

        // Act
        FlowRun completed = await _sut.CompleteRunAsync(run.Id, metrics);

        // Assert
        Assert.Equal(RunStatus.Completed, completed.Status);
        Assert.Equal(1000m, completed.NetProfit);
        Assert.Equal(2.1, completed.SharpeRatio);
    }

    [Fact]
    public async Task ReplayAsync_PrimaryPath_CreatesReplayedRun()
    {
        // Arrange
        SeededAccount account = await _db.SeedAccountAsync();
        EngineInstance instance = await _db.SeedEngineInstanceAsync(account.AccountId, account.LicenseId);
        FlowRun parent = await _sut.StartOriginalRunAsync(instance.Id, RunKind.Optimization);

        var spec = new ReplaySpecification(parent.Id, new ForkPoint { Step = 10 }, [], null, null);

        // Act
        FlowRun replay = await _sut.ReplayAsync(spec);

        // Assert
        Assert.Equal(RunRelation.Spliced, replay.Relation);
        Assert.Equal(RunStatus.Pending, replay.Status);
    }
}
