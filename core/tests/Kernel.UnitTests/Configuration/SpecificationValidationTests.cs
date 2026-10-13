// -----------------------------------------------------------------------------
// <copyright file="SpecificationValidationTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.UnitTests.Configuration;

using System;
using Kernel.Configuration;
using Sdk.Shared;
using Xunit;

public sealed class SpecificationValidationTests
{
    // ─── ExecutionSpecification ───────────────────────────────────────────────

    [Fact]
    public void ExecutionSpecification_CreateValidated_SucceedsWithValidParameters()
    {
        var start = DateTime.UtcNow.AddDays(-1);
        var end = DateTime.UtcNow;

        var spec = ExecutionSpecification.CreateValidated(
            startDate: start,
            endDate: end,
            warmupBars: 10,
            maxOpenPositions: 5,
            stopOutLevel: 0.5,
            latencyTicks: 100,
            geneInitializationSeed: 42,
            maxParallelThreads: 2);

        Assert.Equal(start, spec.StartDate);
        Assert.Equal(end, spec.EndDate);
        Assert.Equal(10, spec.WarmupWindowCount);
        Assert.Equal(5, spec.MaxOpenPositions);
        Assert.Equal(0.5, spec.StopOutLevel);
        Assert.Equal(100, spec.LatencyTicks);
        Assert.Equal(42, spec.GeneInitializationSeed);
    }

    [Fact]
    public void ExecutionSpecification_Validate_ThrowsOnInvalidDates()
    {
        var now = DateTime.UtcNow;
        var spec = new ExecutionSpecification
        {
            StartDate = now,
            EndDate = now.AddMinutes(-5),
            MaxOpenPositions = 5,
            StopOutLevel = 0.5
        };

        Assert.Throws<ConfigurationException>(() => spec.Validate());
    }

    [Theory]
    [InlineData(-1, 5, 0.5, "WarmupWindowCount cannot be negative.")]
    [InlineData(0, 0, 0.5, "MaxOpenPositions must be positive.")]
    [InlineData(0, 5, 0.0, "StopOutLevel must be between 0 and 1.")]
    [InlineData(0, 5, 1.5, "StopOutLevel must be between 0 and 1.")]
    public void ExecutionSpecification_Validate_ThrowsOnInvalidRanges(
        int warmup, int maxPositions, double stopOut, string expectedMessagePart)
    {
        var spec = new ExecutionSpecification
        {
            StartDate = DateTime.UtcNow.AddDays(-1),
            EndDate = DateTime.UtcNow,
            WarmupWindowCount = warmup,
            MaxOpenPositions = maxPositions,
            StopOutLevel = stopOut
        };

        var ex = Assert.Throws<ConfigurationException>(() => spec.Validate());
        Assert.Contains(expectedMessagePart, ex.Message, StringComparison.Ordinal);
    }

    // ─── LiveSpecification ───────────────────────────────────────────────────

    [Fact]
    public void LiveSpecification_CreateValidated_SucceedsWithValidParameters()
    {
        var spec = LiveSpecification.CreateValidated(magicNumber: 12345, orderGuardTimeoutSeconds: 10);
        Assert.Equal(12345, spec.MagicNumber);
        Assert.Equal(10, spec.OrderGuardTimeoutSeconds);
    }

    [Theory]
    [InlineData(0, 5, "MagicNumber must be positive.")]
    [InlineData(-10, 5, "MagicNumber must be positive.")]
    [InlineData(12345, 0, "OrderGuardTimeoutSeconds must be positive.")]
    [InlineData(12345, -1, "OrderGuardTimeoutSeconds must be positive.")]
    public void LiveSpecification_Validate_ThrowsOnInvalidValues(int magic, int timeout, string expectedMessagePart)
    {
        var spec = new LiveSpecification
        {
            MagicNumber = magic,
            OrderGuardTimeoutSeconds = timeout
        };

        var ex = Assert.Throws<ConfigurationException>(() => spec.Validate());
        Assert.Contains(expectedMessagePart, ex.Message, StringComparison.Ordinal);
    }

    // ─── OptimizationSpecification ───────────────────────────────────────────

    [Fact]
    public void OptimizationSpecification_Validate_SucceedsWithValidParameters()
    {
        var spec = new OptimizationSpecification
        {
            MasterSeed = 123,
            Generations = 10,
            PopulationSize = 20,
            MutationRate = 0.05,
            CrossoverRate = 0.8,
            ElitismPct = 0.1,
            TournamentSize = 3,
            StagnationGenerationsBeforeHyper = 5,
            MaxParallelThreads = 0
        };

        spec.Validate();
    }

    [Theory]
    [InlineData(-1, 10, 20, 0.1, 0.5, 0.1, 2, "MasterSeed must be non‑negative.")]
    [InlineData(0, 0, 20, 0.1, 0.5, 0.1, 2, "Generations must be positive.")]
    [InlineData(0, 10, 3, 0.1, 0.5, 0.1, 2, "PopulationSize must be at least 4.")]
    [InlineData(0, 10, 20, -0.1, 0.5, 0.1, 2, "MutationRate must be between 0 and 1.")]
    [InlineData(0, 10, 20, 1.2, 0.5, 0.1, 2, "MutationRate must be between 0 and 1.")]
    [InlineData(0, 10, 20, 0.1, -0.5, 0.1, 2, "CrossoverRate must be between 0 and 1.")]
    [InlineData(0, 10, 20, 0.1, 0.5, 1.5, 2, "ElitismPct must be between 0 and 1.")]
    [InlineData(0, 10, 20, 0.1, 0.5, 0.1, 1, "TournamentSize must be at least 2.")]
    public void OptimizationSpecification_Validate_ThrowsOnInvalidParameters(
        int seed, int gens, int pop, double mut, double cross, double elit, int tour, string expectedMsg)
    {
        var spec = new OptimizationSpecification
        {
            MasterSeed = seed,
            Generations = gens,
            PopulationSize = pop,
            MutationRate = mut,
            CrossoverRate = cross,
            ElitismPct = elit,
            TournamentSize = tour
        };

        var ex = Assert.Throws<ConfigurationException>(() => spec.Validate());
        Assert.Contains(expectedMsg, ex.Message, StringComparison.Ordinal);
    }
}
