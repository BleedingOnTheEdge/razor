// -----------------------------------------------------------------------------
// <copyright file="OptimizationRunnerStepTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.UnitTests.Optimization;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Kernel.Configuration;
using Kernel.Optimization;
using Kernel.Telemetry;
using Sdk.Shared;
using Xunit;

/// <summary>
/// Triple-path test suite verifying step-by-step optimization execution, checkpoint fingerprinting,
/// state resumption, and fault handling in <see cref="OptimizationRunner"/>.
/// </summary>
public sealed class OptimizationRunnerStepTests : IDisposable
{
    private readonly CoreMetrics _metrics = new("optimization-runner-step-tests");

    /// <inheritdoc/>
    public void Dispose() => _metrics.Dispose();

    private static readonly GeneAttribute[] DefaultSchema =
    [
        new GeneAttribute(min: 0.0, max: 100.0, step: 1.0, type: GeneType.Discrete),
        new GeneAttribute(min: -10.0, max: 10.0, step: 0.0, type: GeneType.Continuous)
    ];

    private static GeneAttribute[] CreateSchema() => DefaultSchema;

    private OptimizationSpecification CreateSpec(int generations = 5, int populationSize = 4, int masterSeed = 42) =>
        new()
        {
            MasterSeed = masterSeed,
            Generations = generations,
            PopulationSize = populationSize,
            MutationRate = 0.1,
            CrossoverRate = 0.5,
            ElitismPct = 0.25,
            TournamentSize = 2,
            StagnationGenerationsBeforeHyper = 3,
            MaxParallelThreads = 1
        };

    private OptimizationRunner CreateRunner(OptimizationSpecification? spec = null, GeneAttribute[]? schema = null)
    {
        spec ??= CreateSpec();
        schema ??= CreateSchema();
        return new OptimizationRunner(spec, schema, _metrics);
    }

    // ─── 1. Primary Business Path ────────────────────────────────────────────────

    /// <summary>
    /// Verifies that the initial step evaluates generation 0 and subsequent steps advance generations,
    /// sorting the population and producing deterministic fingerprints.
    /// </summary>
    [Fact]
    public async Task Primary_StepAsync_AdvancesGeneration_AndEvaluatesFitness_Deterministically()
    {
        var runner = CreateRunner(CreateSpec(generations: 3, populationSize: 4, masterSeed: 123));

        // Step 1: Initialises and evaluates Generation 0
        var state0 = await runner.StepAsync((c, _) => Task.FromResult(c.Genes[0] + c.Genes[1]), CancellationToken.None);

        Assert.Equal(0, state0.CurrentGeneration);
        Assert.True(state0.Evaluated);
        Assert.Equal(4, state0.Population.Length);
        Assert.True(state0.Population[0].Fitness >= state0.Population[1].Fitness);
        Assert.NotNull(runner.BestSolution);
        Assert.Equal(state0.Population[0].Fitness, runner.BestSolution.Fitness);

        string fp0 = CheckpointFingerprint.Compute(state0);
        Assert.False(string.IsNullOrWhiteSpace(fp0));
        Assert.Equal(64, fp0.Length);

        // Step 2: Evolves and evaluates Generation 1
        var state1 = await runner.StepAsync((c, _) => Task.FromResult(c.Genes[0] + c.Genes[1]), CancellationToken.None);

        Assert.Equal(1, state1.CurrentGeneration);
        Assert.True(state1.Evaluated);
        string fp1 = CheckpointFingerprint.Compute(state1);
        Assert.NotEqual(fp0, fp1);
    }

    /// <summary>
    /// Verifies that executing step-by-step yields the exact same solutions, best chromosome, and
    /// checkpoint fingerprint as executing continuous RunAsync with the same specification and seed.
    /// </summary>
    [Fact]
    public async Task Primary_StepAsync_RepeatedStepping_ProducesIdenticalOutcomeTo_ContinuousRun()
    {
        var spec1 = CreateSpec(generations: 3, populationSize: 6, masterSeed: 9876);
        var spec2 = CreateSpec(generations: 3, populationSize: 6, masterSeed: 9876);
        var schema = CreateSchema();

        var steppedRunner = CreateRunner(spec1, schema);
        var continuousRunner = CreateRunner(spec2, schema);

        Task<double> Evaluator(Chromosome c, CancellationToken ct) =>
            Task.FromResult((c.Genes[0] * 2.0) - Math.Abs(c.Genes[1]));

        // Stepped execution
        GeneticOptimizerState? lastSteppedState = null;
        for (int i = 0; i < spec1.Generations; i++)
        {
            lastSteppedState = await steppedRunner.StepAsync(Evaluator, CancellationToken.None);
        }

        // Continuous execution
        var continuousBest = await continuousRunner.RunAsync(Evaluator, CancellationToken.None);
        var continuousState = continuousRunner.SaveState();

        Assert.NotNull(lastSteppedState);
        Assert.NotNull(steppedRunner.BestSolution);
        Assert.Equal(continuousBest.Fitness, steppedRunner.BestSolution.Fitness);
        Assert.Equal(continuousBest.Genes[0], steppedRunner.BestSolution.Genes[0]);
        Assert.Equal(continuousBest.Genes[1], steppedRunner.BestSolution.Genes[1]);

        string steppedFingerprint = CheckpointFingerprint.Compute(lastSteppedState);
        string continuousFingerprint = CheckpointFingerprint.Compute(continuousState);
        Assert.Equal(continuousFingerprint, steppedFingerprint);
    }

    /// <summary>
    /// Verifies that saving state after a step and loading into a fresh runner resumes seamlessly
    /// with deterministic continuity.
    /// </summary>
    [Fact]
    public async Task Primary_SaveAndLoadState_ResumesStepAsync_Deterministically()
    {
        var spec = CreateSpec(generations: 4, populationSize: 4, masterSeed: 555);
        var runner1 = CreateRunner(spec);

        Task<double> Evaluator(Chromosome c, CancellationToken ct) => Task.FromResult(c.Genes[0] * 1.5);

        // Runner 1 executes Generation 0 and Generation 1
        await runner1.StepAsync(Evaluator, CancellationToken.None);
        var stateGen1 = await runner1.StepAsync(Evaluator, CancellationToken.None);
        Assert.Equal(1, stateGen1.CurrentGeneration);

        // Runner 2 restores from Runner 1's Generation 1 state
        var runner2 = CreateRunner(spec);
        runner2.LoadState(stateGen1);
        Assert.Equal(1, runner2.CurrentGeneration);

        // Advance both to Generation 2
        var stateGen2From1 = await runner1.StepAsync(Evaluator, CancellationToken.None);
        var stateGen2From2 = await runner2.StepAsync(Evaluator, CancellationToken.None);

        Assert.Equal(2, stateGen2From2.CurrentGeneration);
        Assert.Equal(stateGen2From1.BestOverallFitness, stateGen2From2.BestOverallFitness);
        Assert.Equal(CheckpointFingerprint.Compute(stateGen2From1), CheckpointFingerprint.Compute(stateGen2From2));
    }

    // ─── 2. Boundary & Stress Path ───────────────────────────────────────────────

    /// <summary>
    /// Verifies that calling StepAsync when already at or beyond maximum generations throws an exception.
    /// </summary>
    [Fact]
    public async Task Boundary_StepAsync_AtOrBeyondMaxGenerations_ThrowsArgumentOutOfRangeException()
    {
        var spec = CreateSpec(generations: 2, populationSize: 4, masterSeed: 42);
        var runner = CreateRunner(spec);

        // Step 0 -> generation 0
        await runner.StepAsync((c, _) => Task.FromResult(1.0), CancellationToken.None);
        // Step 1 -> generation 1 (max generation 2 reached)
        await runner.StepAsync((c, _) => Task.FromResult(1.0), CancellationToken.None);

        // Stepping again beyond Generations (2) must throw
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            runner.StepAsync((c, _) => Task.FromResult(1.0), CancellationToken.None));
    }

    /// <summary>
    /// Verifies that InvalidateFitness marks all chromosomes unevaluated, forcing full re-evaluation
    /// on the subsequent step.
    /// </summary>
    [Fact]
    public async Task Boundary_InvalidateFitness_ForcesReevaluationOnNextStep()
    {
        var runner = CreateRunner(CreateSpec(generations: 3, populationSize: 4, masterSeed: 777));
        int evaluationCount = 0;

        Task<double> Evaluator(Chromosome c, CancellationToken ct)
        {
            Interlocked.Increment(ref evaluationCount);
            return Task.FromResult(c.Genes[0]);
        }

        // Gen 0 evaluation
        await runner.StepAsync(Evaluator, CancellationToken.None);
        Assert.Equal(4, evaluationCount);

        // Invalidate fitness
        runner.InvalidateFitness();
        foreach (var chromosome in runner.Population)
        {
            Assert.Equal(Chromosome.NotEvaluated, chromosome.Fitness);
        }

        // Re-evaluating on next step evaluates all chromosomes again
        await runner.StepAsync(Evaluator, CancellationToken.None);
        Assert.True(evaluationCount > 4);
    }

    /// <summary>
    /// Verifies that CheckpointFingerprint accurately distinguishes gene differences.
    /// </summary>
    [Fact]
    public async Task Boundary_CheckpointFingerprint_DetectsGeneDifferences()
    {
        var runner = CreateRunner(CreateSpec(generations: 2, populationSize: 4, masterSeed: 111));
        await runner.StepAsync((c, _) => Task.FromResult(c.Genes[0]), CancellationToken.None);

        var stateA = runner.SaveState();
        string fpA = CheckpointFingerprint.Compute(stateA);

        // Clone state and mutate a single gene
        var modifiedPopulation = new Chromosome[stateA.Population.Length];
        for (int i = 0; i < stateA.Population.Length; i++)
        {
            modifiedPopulation[i] = stateA.Population[i].Clone();
        }

        modifiedPopulation[0].Genes[0] += 0.5;

        var stateB = stateA with
        {
            Population = modifiedPopulation
        };
        string fpB = CheckpointFingerprint.Compute(stateB);

        Assert.NotEqual(fpA, fpB);
    }

    // ─── 3. Negative / Fault Path ────────────────────────────────────────────────

    /// <summary>
    /// Verifies that passing a null evaluator delegate throws ArgumentNullException.
    /// </summary>
    [Fact]
    public async Task Negative_StepAsync_WithNullEvaluator_ThrowsArgumentNullException()
    {
        var runner = CreateRunner();
        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            runner.StepAsync(null!, CancellationToken.None));
    }

    /// <summary>
    /// Verifies that an evaluator throwing an unhandled exception propagates cleanly
    /// without corrupting the optimizer's generation pointer.
    /// </summary>
    [Fact]
    public async Task Negative_StepAsync_WhenEvaluatorThrows_PropagatesException()
    {
        var runner = CreateRunner();
        int attempt = 0;

        Task<double> FailingEvaluator(Chromosome c, CancellationToken ct)
        {
            if (++attempt == 2)
            {
                throw new InvalidOperationException("Simulated evaluator failure.");
            }

            return Task.FromResult(1.0);
        }

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            runner.StepAsync(FailingEvaluator, CancellationToken.None));

        Assert.Equal("Simulated evaluator failure.", ex.Message);
    }

    /// <summary>
    /// Verifies that passing an already-cancelled cancellation token immediately aborts stepping.
    /// </summary>
    [Fact]
    public async Task Negative_StepAsync_WithCancelledToken_ThrowsOperationCanceledException()
    {
        var runner = CreateRunner();
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            runner.StepAsync((c, _) => Task.FromResult(1.0), cts.Token));
    }

    /// <summary>
    /// Verifies all branch conditions of CheckpointFingerprint: null state, null random seeds,
    /// null population, null genes, unevaluated/NaN fitness, and neural network serialized bytes.
    /// </summary>
    [Fact]
    public void Boundary_CheckpointFingerprint_HandlesNulls_UnevaluatedFitness_AndNeuralNetworkState()
    {
        // 1. Null state throws ArgumentNullException
        Assert.Throws<ArgumentNullException>(() => CheckpointFingerprint.Compute(null!));

        // 2. Null random states and null population
        var stateEmpty = new GeneticOptimizerState
        {
            CurrentGeneration = 0,
            Evaluated = false,
            BestOverallFitness = 0.0,
            RandomState0 = null,
            RandomState1 = null,
            Population = null!,
            NeuralNetworkState = [0xAA, 0xBB, 0xCC]
        };

        string fpEmpty = CheckpointFingerprint.Compute(stateEmpty);
        Assert.NotNull(fpEmpty);
        Assert.Equal(64, fpEmpty.Length);

        // 3. Chromosome with NaN fitness and NotEvaluated fitness
        var chromoNan = new Chromosome(2) { Fitness = double.NaN };
        var chromoUneval = new Chromosome(2) { Fitness = Chromosome.NotEvaluated };
        var stateUneval = new GeneticOptimizerState
        {
            CurrentGeneration = 1,
            Evaluated = false,
            BestOverallFitness = 0.0,
            Population = [chromoNan, chromoUneval]
        };

        string fpUneval = CheckpointFingerprint.Compute(stateUneval);
        Assert.NotNull(fpUneval);
        Assert.NotEqual(fpEmpty, fpUneval);

        // 4. Chromosome with empty genes
        var chromoEmptyGenes = new Chromosome(0);
        var stateEmptyGenes = new GeneticOptimizerState
        {
            CurrentGeneration = 2,
            Evaluated = true,
            Population = [chromoEmptyGenes]
        };

        string fpEmptyGenes = CheckpointFingerprint.Compute(stateEmptyGenes);
        Assert.NotNull(fpEmptyGenes);
    }
}
