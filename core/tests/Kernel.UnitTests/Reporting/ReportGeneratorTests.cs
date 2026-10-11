// -----------------------------------------------------------------------------
// <copyright file="ReportGeneratorTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.UnitTests.Reporting;

using System;
using System.Collections.Generic;
using Kernel.Backtesting;
using Kernel.Clock;
using Kernel.Configuration;
using Kernel.Hooks;
using Kernel.Reporting;
using Sdk.Hooks;
using Sdk.Shared;
using Xunit;
using KernelChromosome = Kernel.Optimization.Chromosome;

public sealed class ReportGeneratorTests
{
    private static readonly double[] SampleGenes = [1.5, 2.5, 3.5];

    private static StrategySpecification CreateValidStrategySpec(double initialBalance = 10000) => new()
    {
        InitialBalance = initialBalance,
        Leverage = 100,
        RequestedSymbols = [new SymbolRequest("EURUSD", [TimeFrame.M1])]
    };

    private static ExecutionSpecification CreateValidExecSpec() => new()
    {
        StartDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        EndDate = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc),
        MaxOpenPositions = 5,
        StopOutLevel = 0.5
    };

    [Fact]
    public void GenerateBacktestReport_ThrowsOnNullArguments()
    {
        var hooks = new ReportHooks();
        var clock = new SystemClock();
        var generator = new ReportGenerator(hooks, clock);

        var result = new BacktestResult();
        var spec = CreateValidStrategySpec();
        var execSpec = CreateValidExecSpec();

        Assert.Throws<ArgumentNullException>(() => generator.GenerateBacktestReport(null!, spec, execSpec));
        Assert.Throws<ArgumentNullException>(() => generator.GenerateBacktestReport(result, null!, execSpec));
        Assert.Throws<ArgumentNullException>(() => generator.GenerateBacktestReport(result, spec, null!));
    }

    [Fact]
    public void GenerateBacktestReport_ExecutesHooksAndComputesMetrics()
    {
        var hooks = new ReportHooks();
        var clock = new SystemClock();
        var generator = new ReportGenerator(hooks, clock);

        ReportRequest? capturedBefore = null;
        bool capturedAfter = false;

        hooks.OnBeforeGenerate.Register((req, ctx) =>
        {
            capturedBefore = req;
            return FilterResult.Allow(req);
        }, 1);

        hooks.OnAfterGenerate.Register((data, ctx) =>
        {
            capturedAfter = true;
        }, 1);

        var result = new BacktestResult
        {
            Balance = 12500,
            Drawdown = 0.08,
            TotalTrades = 24,
            DailyDrawdown = 0.02,
            History = new List<Position>
            {
                new() { Ticket = 1, Symbol = "EURUSD", Profit = 2500 }
            }
        };

        var spec = CreateValidStrategySpec(10000);
        var execSpec = CreateValidExecSpec();

        generator.GenerateBacktestReport(result, spec, execSpec);

        Assert.NotNull(capturedBefore);
        Assert.True(capturedAfter);
        Assert.Equal("Backtest Report", capturedBefore.ReportTitle);
        Assert.Equal(10000, capturedBefore.InitialBalance);
        Assert.Equal(12500, capturedBefore.FinalBalance);
        Assert.Equal(0.08, capturedBefore.MaxDrawdown);
        Assert.Equal(2500, capturedBefore.AdditionalMetrics["NetProfit"]);
        Assert.Equal(24, capturedBefore.AdditionalMetrics["TotalTrades"]);
        Assert.Single(capturedBefore.TradeHistory);
    }

    [Fact]
    public void GenerateBacktestReport_WhenFilterRejects_AfterHookIsNotInvoked()
    {
        var hooks = new ReportHooks();
        var clock = new SystemClock();
        var generator = new ReportGenerator(hooks, clock);

        bool afterInvoked = false;

        hooks.OnBeforeGenerate.Register((req, ctx) =>
        {
            return FilterResult.Reject<ReportRequest>("Rejected for test");
        }, 1);

        hooks.OnAfterGenerate.Register((data, ctx) =>
        {
            afterInvoked = true;
        }, 1);

        var result = new BacktestResult { Balance = 10000 };
        var spec = CreateValidStrategySpec(10000);
        var execSpec = CreateValidExecSpec();

        generator.GenerateBacktestReport(result, spec, execSpec);

        Assert.False(afterInvoked, "OnAfterGenerate should not run when OnBeforeGenerate filter rejects report.");
    }

    [Fact]
    public void GenerateOptimizationReport_ExecutesHooksWithChromosomeData()
    {
        var hooks = new ReportHooks();
        var clock = new SystemClock();
        var generator = new ReportGenerator(hooks, clock);

        ReportRequest? captured = null;

        hooks.OnBeforeGenerate.Register((req, ctx) =>
        {
            captured = req;
            return FilterResult.Allow(req);
        }, 1);

        var chromosome = new KernelChromosome(SampleGenes)
        {
            Fitness = 88.5
        };

        var spec = new OptimizationSpecification
        {
            Generations = 50,
            PopulationSize = 100,
            MasterSeed = 42,
            MutationRate = 0.05,
            CrossoverRate = 0.8,
            ElitismPct = 0.1,
            TournamentSize = 3
        };

        generator.GenerateOptimizationReport(chromosome, spec);

        Assert.NotNull(captured);
        Assert.Equal("Optimization Report", captured.ReportTitle);
        Assert.Equal(88.5, captured.AdditionalMetrics["BestFitness"]);
        Assert.Equal(50, captured.AdditionalMetrics["Generations"]);
        Assert.Equal(100, captured.AdditionalMetrics["PopulationSize"]);
    }
}
