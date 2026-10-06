// -----------------------------------------------------------------------------
// <copyright file="LineageServiceTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests.Lineage;

using Cloud.Data;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.Extensions.Logging.Abstractions;
using System.Text.Json;
using Xunit;

public sealed class LineageServiceTests : IDisposable
{
    private readonly CloudTestDatabase _db;
    private readonly LineageService _sut;

    public LineageServiceTests()
    {
        _db = new CloudTestDatabase();
        _sut = new LineageService(_db, TimeProvider.System, NullLogger<LineageService>.Instance);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task CreateOriginalRun_PrimaryPath_CreatesRunAndReturnsIt()
    {
        // Arrange
        SeededAccount account = await _db.SeedAccountAsync();
        EngineInstance instance = await _db.SeedEngineInstanceAsync(account.AccountId, account.LicenseId);

        // Act
        FlowRun run = await _sut.CreateOriginalRunAsync(instance.Id, RunKind.Optimization);

        // Assert
        Assert.NotNull(run);
        Assert.Equal(instance.Id, run.EngineInstanceId);
        Assert.Equal(RunKind.Optimization, run.Kind);
        Assert.Null(run.ParentRunId);
        Assert.Equal(RunStatus.Pending, run.Status);
        Assert.False(run.IsPartial);
    }

    [Fact]
    public async Task CreateOriginalRun_NegativePath_ThrowsForEmptyGuid()
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.CreateOriginalRunAsync(Guid.Empty, RunKind.Optimization));
    }

    [Fact]
    public async Task CreateOriginalRun_NegativePath_ThrowsForNonExistentEngine()
    {
        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() => _sut.CreateOriginalRunAsync(Guid.NewGuid(), RunKind.Optimization));
    }

    [Fact]
    public async Task CreateChildRun_PrimaryPath_SplicedContiguous_CreatesWithInterventions()
    {
        // Arrange
        SeededAccount account = await _db.SeedAccountAsync();
        EngineInstance instance = await _db.SeedEngineInstanceAsync(account.AccountId, account.LicenseId);
        FlowRun parent = await _sut.CreateOriginalRunAsync(instance.Id, RunKind.Optimization);

        var forkPoint = new ForkPoint { Generation = 10, WindowIndex = 2 };
        var intervention = new InterventionSpecification(
            150,
            "old-hash",
            "new-hash",
            "operator",
            "Manual override"
        );

        // Act
        FlowRun child = await _sut.CreateChildRunAsync(
            parent.Id,
            RunRelation.Spliced,
            RunContinuity.Contiguous,
            forkPoint,
            baseSeed: 12345,
            randomPosition: "S1_S2",
            interventions: [intervention]
        );

        // Assert
        Assert.NotNull(child);
        Assert.Equal(parent.Id, child.ParentRunId);
        Assert.Equal(RunRelation.Spliced, child.Relation);
        Assert.Equal(RunContinuity.Contiguous, child.Continuity);
        Assert.Equal(10, child.ForkPointGeneration);
        Assert.Equal(2, child.ForkPointWindowIndex);
        Assert.Equal(12345, child.BaseSeed);
        Assert.Equal("S1_S2", child.RandomPosition);
        Assert.False(child.IsPartial);
        
        // Assert interventions
        FlowRun fetched = (await _sut.GetRunAsync(child.Id))!;
        Assert.Single(fetched.Interventions);
        Assert.Equal("Manual override", fetched.Interventions.First().Reason);
    }

    [Fact]
    public async Task CreateChildRun_BoundaryPath_Gapped_RequiresGapSpecification()
    {
        // Arrange
        SeededAccount account = await _db.SeedAccountAsync();
        EngineInstance instance = await _db.SeedEngineInstanceAsync(account.AccountId, account.LicenseId);
        FlowRun parent = await _sut.CreateOriginalRunAsync(instance.Id, RunKind.Optimization);

        // Act & Assert (Gaps null)
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.CreateChildRunAsync(
            parent.Id,
            RunRelation.Appended,
            RunContinuity.Gapped,
            new ForkPoint { Step = 100 },
            null,
            null
        ));

        // Act & Assert (Gaps empty)
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.CreateChildRunAsync(
            parent.Id,
            RunRelation.Appended,
            RunContinuity.Gapped,
            new ForkPoint { Step = 100 },
            null,
            null,
            gaps: []
        ));
    }

    [Fact]
    public async Task CreateChildRun_PrimaryPath_Gapped_CreatesWithGapsAndMarksPartial()
    {
        // Arrange
        SeededAccount account = await _db.SeedAccountAsync();
        EngineInstance instance = await _db.SeedEngineInstanceAsync(account.AccountId, account.LicenseId);
        FlowRun parent = await _sut.CreateOriginalRunAsync(instance.Id, RunKind.Optimization);

        var forkPoint = new ForkPoint { Step = 500 };
        var gap = new GapSpecification(500, 600, "Execution lost");

        // Act
        FlowRun child = await _sut.CreateChildRunAsync(
            parent.Id,
            RunRelation.Appended,
            RunContinuity.Gapped,
            forkPoint,
            null,
            null,
            gaps: [gap]
        );

        // Assert
        Assert.True(child.IsPartial);
        FlowRun fetched = (await _sut.GetRunAsync(child.Id))!;
        Assert.Single(fetched.Gaps);
        Assert.Equal("Execution lost", fetched.Gaps.First().Reason);
    }

    [Fact]
    public async Task CreateChildRun_NegativePath_ThrowsForNonExistentParent()
    {
        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() => _sut.CreateChildRunAsync(
            Guid.NewGuid(),
            RunRelation.Branched,
            RunContinuity.Contiguous,
            new ForkPoint { Step = 1 },
            null,
            null
        ));
    }

    [Fact]
    public async Task RecordGapAsync_PrimaryPath_AddsGapAndMarksPartial()
    {
        // Arrange
        SeededAccount account = await _db.SeedAccountAsync();
        EngineInstance instance = await _db.SeedEngineInstanceAsync(account.AccountId, account.LicenseId);
        FlowRun run = await _sut.CreateOriginalRunAsync(instance.Id, RunKind.Optimization);

        var gap = new GapSpecification(10, 20, "Network timeout");

        // Act
        await _sut.RecordGapAsync(run.Id, gap);

        // Assert
        FlowRun fetched = (await _sut.GetRunAsync(run.Id))!;
        Assert.True(fetched.IsPartial);
        Assert.Single(fetched.Gaps);
        Assert.Equal("Network timeout", fetched.Gaps.First().Reason);
    }

    [Fact]
    public async Task RecordInterventionAsync_PrimaryPath_AddsIntervention()
    {
        // Arrange
        SeededAccount account = await _db.SeedAccountAsync();
        EngineInstance instance = await _db.SeedEngineInstanceAsync(account.AccountId, account.LicenseId);
        FlowRun run = await _sut.CreateOriginalRunAsync(instance.Id, RunKind.Optimization);

        var intervention = new InterventionSpecification(10, "old", "new", "user", "fix");

        // Act
        await _sut.RecordInterventionAsync(run.Id, intervention);

        // Assert
        FlowRun fetched = (await _sut.GetRunAsync(run.Id))!;
        Assert.Single(fetched.Interventions);
        Assert.Equal("fix", fetched.Interventions.First().Reason);
    }
}
