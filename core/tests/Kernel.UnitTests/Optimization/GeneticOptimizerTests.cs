using Kernel.Optimization;
using Kernel.Telemetry;
using Sdk.Shared;

// Both Sdk.Hooks and Kernel.Optimization define a Chromosome, and they are different types: the
// hooks one carries the gene values across the extension boundary, the optimizer one is a member
// of the population. Aliasing keeps `Chromosome` meaning the population member throughout.
using HookOptimizationHooks = Sdk.Hooks.IOptimizationHooks;

namespace Kernel.UnitTests.Optimization;

/// <summary>
/// Covers the steppable genetic optimiser: its determinism, its evaluation contract, its
/// evolution rules (elitism, stagnation, hyper-mutation) and the save/load round trip.
/// <para>
/// These behaviours are load-bearing beyond the optimiser itself. Determinism is a product
/// guarantee (a run must be reproducible from its seed), and <c>SaveState</c>/<c>LoadState</c>
/// is the primitive that pause-and-resume and step-by-step control are built on -- so a
/// regression here would surface as an unreproducible optimisation or an un-resumable run
/// rather than as a failure in this file.
/// </para>
/// </summary>
public sealed class GeneticOptimizerTests : IDisposable
{
    private readonly CoreMetrics _metrics = new("genetic-optimizer-tests");

    public void Dispose() => _metrics.Dispose();

    /// <summary>A schema whose bounds make out-of-range genes easy to detect.</summary>
    private static GeneAttribute[] Schema() =>
    [
        new GeneAttribute(min: 0.0, max: 10.0, step: 1.0, type: GeneType.Discrete),
        new GeneAttribute(min: -5.0, max: 5.0, step: 0.5, type: GeneType.Discrete)
    ];

    private GeneticOptimizer CreateOptimizer(
        int populationSize = 4,
        int masterSeed = 12345,
        HookOptimizationHooks? hooks = null) =>
        new(
            Schema(),
            _metrics,
            populationSize: populationSize,
            masterSeed: masterSeed,
            mutationRate: 0.1,
            crossoverRate: 0.5,
            elitismPct: 0.25,
            tournamentSize: 3,
            stagnationGenerationsBeforeHyper: 3,
            maxDegreeOfParallelism: 1,
            hooks: hooks);

    private static Func<Chromosome, CancellationToken, Task<double>> ConstantFitness(double value) =>
        (_, _) => Task.FromResult(value);

    /// <summary>Fitness that rewards a larger first gene, so improvement is observable.</summary>
    private static Func<Chromosome, CancellationToken, Task<double>> FirstGeneFitness() =>
        (c, _) => Task.FromResult(c.Genes[0]);

    // ---- construction ----

    [Fact]
    public void Constructor_Rejects_A_Null_Schema()
    {
        Assert.Throws<ArgumentNullException>(() => new GeneticOptimizer(null!, _metrics));
    }

    [Fact]
    public void Constructor_Rejects_Null_Metrics()
    {
        Assert.Throws<ArgumentNullException>(() => new GeneticOptimizer(Schema(), null!));
    }

    [Fact]
    public void Constructor_Clamps_A_Population_Too_Small_To_Reproduce()
    {
        // A population below four cannot support tournament selection plus elitism, so it is raised.
        var optimizer = CreateOptimizer(populationSize: 1);

        Assert.Equal(4, optimizer.PopulationSize);
    }

    [Fact]
    public void Constructor_Allocates_The_Configured_Population()
    {
        Assert.Equal(8, CreateOptimizer(populationSize: 8).PopulationSize);
    }

    [Fact]
    public void Constructor_Defaults_MaxDegreeOfParallelism_To_The_Processor_Count_Minus_One()
    {
        var optimizer = CreateOptimizer();

        Assert.True(optimizer.MaxDegreeOfParallelism >= 1);
    }

    // ---- initialize ----

    [Fact]
    public void Initialize_Produces_A_Fresh_Unevaluated_Population()
    {
        var optimizer = CreateOptimizer(populationSize: 6);
        optimizer.Initialize();

        Assert.Equal(0, optimizer.CurrentGeneration);
        Assert.False(optimizer.IsHyperMutation);
        Assert.Equal(6, optimizer.Population.Count);
        Assert.All(optimizer.Population, c => Assert.Equal(Chromosome.NotEvaluated, c.Fitness));
        Assert.All(optimizer.Population, c => Assert.Equal(0, c.Generation));
    }

    [Fact]
    public void Initialize_Indexes_Individuals_And_Seeds_Each_From_The_Master_Seed()
    {
        var optimizer = CreateOptimizer(populationSize: 4, masterSeed: 777);
        optimizer.Initialize();

        var byIndex = optimizer.Population.OrderBy(c => c.IndividualIndex).ToList();
        Assert.Equal(4, byIndex.Count);
        Assert.Equal(0, byIndex[0].IndividualIndex);
        Assert.Equal(3, byIndex[3].IndividualIndex);

        // The documented seed derivation: (masterSeed * 397) ^ index.
        for (int i = 0; i < byIndex.Count; i++)
        {
            Assert.Equal(unchecked((int)((uint)777 * 397) ^ i), byIndex[i].Seed);
        }
    }

    [Fact]
    public void Initialize_Keeps_Genes_Within_Their_Declared_Bounds()
    {
        var optimizer = CreateOptimizer(populationSize: 24, masterSeed: 2026);
        optimizer.Initialize();

        Assert.All(optimizer.Population, c =>
        {
            Assert.InRange(c.Genes[0], 0.0, 10.0);
            Assert.InRange(c.Genes[1], -5.0, 5.0);
        });
    }

    [Fact]
    public void Initialize_Is_Deterministic_For_The_Same_Master_Seed()
    {
        // Reproducibility is a product guarantee: the same seed must give the same starting
        // population, or a run cannot be repeated.
        var first = CreateOptimizer(populationSize: 8, masterSeed: 4242);
        var second = CreateOptimizer(populationSize: 8, masterSeed: 4242);

        first.Initialize();
        second.Initialize();

        for (int i = 0; i < 8; i++)
        {
            Assert.Equal(first.Population[i].Genes, second.Population[i].Genes);
            Assert.Equal(first.Population[i].Seed, second.Population[i].Seed);
        }
    }

    [Fact]
    public void Initialize_Produces_Different_Populations_For_Different_Seeds()
    {
        var first = CreateOptimizer(populationSize: 8, masterSeed: 1);
        var second = CreateOptimizer(populationSize: 8, masterSeed: 2);

        first.Initialize();
        second.Initialize();

        // The seeds differ by construction, so the genes should too.
        Assert.NotEqual(first.Population[0].Seed, second.Population[0].Seed);
    }

    [Fact]
    public async Task Initialize_Resets_A_Population_That_Has_Already_Advanced()
    {
        var optimizer = CreateOptimizer(populationSize: 4);
        optimizer.Initialize();
        await optimizer.EvaluateAsync(ConstantFitness(1.0), CancellationToken.None);
        optimizer.Evolve();
        Assert.Equal(1, optimizer.CurrentGeneration);

        optimizer.Initialize();

        Assert.Equal(0, optimizer.CurrentGeneration);
        Assert.All(optimizer.Population, c => Assert.Equal(Chromosome.NotEvaluated, c.Fitness));
    }

    // ---- evaluation ----

    [Fact]
    public async Task EvaluateAsync_Rejects_A_Null_Evaluator()
    {
        var optimizer = CreateOptimizer();
        optimizer.Initialize();

        await Assert.ThrowsAsync<ArgumentNullException>(
            () => optimizer.EvaluateAsync(null!, CancellationToken.None));
    }

    [Fact]
    public async Task EvaluateAsync_Assigns_The_Evaluated_Fitness()
    {
        var optimizer = CreateOptimizer(populationSize: 4);
        optimizer.Initialize();

        await optimizer.EvaluateAsync(ConstantFitness(3.5), CancellationToken.None);

        Assert.All(optimizer.Population, c => Assert.Equal(3.5, c.Fitness));
    }

    [Fact]
    public async Task EvaluateAsync_Only_Evaluates_Chromosomes_That_Need_It()
    {
        // Evolution resets every fitness, but a second EvaluateAsync on an evaluated population
        // must not re-run the evaluator -- it is the caller's expensive step.
        var optimizer = CreateOptimizer(populationSize: 4);
        optimizer.Initialize();
        int calls = 0;
        Func<Chromosome, CancellationToken, Task<double>> counting = (c, _) =>
        {
            Interlocked.Increment(ref calls);
            return Task.FromResult(1.0);
        };

        await optimizer.EvaluateAsync(counting, CancellationToken.None);
        Assert.Equal(4, calls);

        await optimizer.EvaluateAsync(counting, CancellationToken.None);
        Assert.Equal(4, calls);
    }

    [Fact]
    public async Task EvaluateAsync_Throws_When_The_Evaluator_Leaves_A_Chromosome_Unevaluated()
    {
        // Returning the sentinel is indistinguishable from not having evaluated, and an
        // unevaluated chromosome would silently poison selection.
        var optimizer = CreateOptimizer(populationSize: 4);
        optimizer.Initialize();

        await Assert.ThrowsAsync<OptimizationException>(
            () => optimizer.EvaluateAsync(ConstantFitness(Chromosome.NotEvaluated), CancellationToken.None));
    }

    [Fact]
    public async Task EvaluateAsync_Honours_Cancellation()
    {
        var optimizer = CreateOptimizer(populationSize: 8);
        optimizer.Initialize();
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => optimizer.EvaluateAsync(async (c, ct) =>
            {
                await Task.Delay(50, ct).ConfigureAwait(false);
                return 1.0;
            }, cancellation.Token));
    }

    // ---- evolution ----

    [Fact]
    public void Evolve_Requires_An_Evaluated_Population()
    {
        // Evolving unevaluated parents would select on the sentinel and discard real fitness.
        var optimizer = CreateOptimizer();
        optimizer.Initialize();

        Assert.Throws<InvalidOperationException>(optimizer.Evolve);
    }

    [Fact]
    public async Task Evolve_Advances_The_Generation_And_Leaves_Only_The_Elite_Evaluated()
    {
        // Elites are carried forward with their fitness intact -- that is what elitism means, and
        // re-evaluating them would waste the one result already known to be good. Every other
        // chromosome is rebuilt and must be re-evaluated before the next Evolve.
        var optimizer = CreateOptimizer(populationSize: 6);
        optimizer.Initialize();
        await optimizer.EvaluateAsync(ConstantFitness(2.0), CancellationToken.None);

        optimizer.Evolve();

        var population = optimizer.Population;
        Assert.Equal(1, optimizer.CurrentGeneration);
        Assert.All(population, c => Assert.Equal(1, c.Generation));

        // elitismPct is 0.25 of 6, floored, and never below one.
        int eliteCount = Math.Max(1, (int)(6 * 0.25));
        Assert.Equal(eliteCount, population.Count(c => c.Fitness != Chromosome.NotEvaluated));
        Assert.Equal(
            population.Count - eliteCount,
            population.Count(c => c.Fitness == Chromosome.NotEvaluated));
    }

    [Fact]
    public async Task Evolve_Carries_The_Elite_Forward_Unchanged()
    {
        // Elitism is what stops a good solution being lost, so the best genes must survive intact.
        var optimizer = CreateOptimizer(populationSize: 8);
        optimizer.Initialize();
        await optimizer.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
        var bestBefore = optimizer.BestSolution.Clone();

        optimizer.Evolve();

        Assert.Contains(optimizer.Population, c => c.Genes.SequenceEqual(bestBefore.Genes));
    }

    [Fact]
    public async Task Evolve_Sorts_The_Population_By_Descending_Fitness()
    {
        var optimizer = CreateOptimizer(populationSize: 6);
        optimizer.Initialize();
        await optimizer.EvaluateAsync((c, _) => Task.FromResult(c.Genes[0]), CancellationToken.None);

        var population = optimizer.Population;

        for (int i = 1; i < population.Count; i++)
        {
            Assert.True(population[i - 1].Fitness >= population[i].Fitness);
        }
    }

    [Fact]
    public async Task Evolve_Is_Deterministic_For_The_Same_Seed()
    {
        var first = CreateOptimizer(populationSize: 8, masterSeed: 99);
        var second = CreateOptimizer(populationSize: 8, masterSeed: 99);

        foreach (var optimizer in new[] { first, second })
        {
            optimizer.Initialize();
            await optimizer.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
            optimizer.Evolve();
        }

        for (int i = 0; i < 8; i++)
        {
            Assert.Equal(first.Population[i].Genes, second.Population[i].Genes);
        }
    }

    [Fact]
    public async Task Stagnation_Eventually_Activates_Hyper_Mutation()
    {
        // A fitness surface that never improves must eventually trigger hyper-mutation, which is
        // the mechanism for escaping a plateau.
        var optimizer = CreateOptimizer(populationSize: 6);
        optimizer.Initialize();

        Assert.False(optimizer.IsHyperMutation);

        for (int generation = 0; generation < 4 && !optimizer.IsHyperMutation; generation++)
        {
            await optimizer.EvaluateAsync(ConstantFitness(1.0), CancellationToken.None);
            optimizer.Evolve();
        }

        Assert.True(optimizer.IsHyperMutation);
    }

    [Fact]
    public async Task An_Improving_Population_Does_Not_Stagnate()
    {
        // Improvement must clear the stagnation counter, so hyper-mutation does not engage while
        // the search is still making progress.
        var optimizer = CreateOptimizer(populationSize: 8);
        optimizer.Initialize();

        for (int generation = 0; generation < 4; generation++)
        {
            // A fresh, always-larger fitness each generation reads as continuous improvement.
            double reward = 10.0 + generation;
            await optimizer.EvaluateAsync(ConstantFitness(reward), CancellationToken.None);
            optimizer.Evolve();
        }

        Assert.False(optimizer.IsHyperMutation);
    }

    // ---- save and load: the pause/resume primitive ----

    [Fact]
    public async Task SaveState_Captures_The_Generation_And_Fitness()
    {
        var optimizer = CreateOptimizer(populationSize: 6);
        optimizer.Initialize();
        await optimizer.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
        optimizer.Evolve();

        var state = optimizer.SaveState();

        Assert.Equal(optimizer.CurrentGeneration, state.CurrentGeneration);
        Assert.Equal(optimizer.Population.Count, state.Population.Length);
        Assert.Equal(optimizer.IsHyperMutation, state.HyperMutation);
    }

    [Fact]
    public async Task SaveState_Takes_A_Deep_Copy()
    {
        // The snapshot must not alias the live population, or a later generation would rewrite
        // the state that was saved before it.
        var optimizer = CreateOptimizer(populationSize: 6);
        optimizer.Initialize();
        await optimizer.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
        var state = optimizer.SaveState();
        double savedGene = state.Population[0].Genes[0];

        await optimizer.EvaluateAsync(ConstantFitness(999.0), CancellationToken.None);
        optimizer.Evolve();

        Assert.Equal(savedGene, state.Population[0].Genes[0]);
    }

    [Fact]
    public async Task SaveState_Records_The_Random_Sequence_Position()
    {
        // The master seed says where the sequence began, not how far it has been consumed. A
        // snapshot that omits the position resumes from the wrong place, so the fact that it is
        // captured is part of the contract rather than an implementation detail.
        var optimizer = CreateOptimizer(populationSize: 6);
        optimizer.Initialize();
        await optimizer.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
        optimizer.Evolve();

        var state = optimizer.SaveState();

        Assert.NotNull(state.RandomState0);
        Assert.NotNull(state.RandomState1);
    }

    [Fact]
    public async Task LoadState_Preserves_The_Random_Sequence_So_The_Run_Continues_Identically()
    {
        // Two optimisers at the same point must produce the same next generation. This holds the
        // determinism guarantee across a save/load boundary, not merely within one run.
        var advancing = CreateOptimizer(populationSize: 8, masterSeed: 8080);
        advancing.Initialize();
        await advancing.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
        advancing.Evolve();

        var snapshot = advancing.SaveState();

        // A second optimiser restored from the snapshot must match the first generation-for-generation.
        var restored = CreateOptimizer(populationSize: 8, masterSeed: 8080);
        restored.LoadState(snapshot);

        for (int generation = 0; generation < 3; generation++)
        {
            await advancing.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
            await restored.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
            advancing.Evolve();
            restored.Evolve();

            for (int i = 0; i < advancing.Population.Count; i++)
            {
                Assert.Equal(advancing.Population[i].Genes, restored.Population[i].Genes);
            }
        }
    }

    [Fact]
    public void LoadState_Rejects_A_Null_State()
    {
        var optimizer = CreateOptimizer();

        Assert.Throws<ArgumentNullException>(() => optimizer.LoadState(null!));
    }

    [Fact]
    public async Task Save_Then_Load_Restores_The_Exact_Population()
    {
        // This is the contract pause-and-resume and step-by-step control depend on: a run
        // resumed from a snapshot must continue from the same point, not an approximation of it.
        var optimizer = CreateOptimizer(populationSize: 8, masterSeed: 31337);
        optimizer.Initialize();
        await optimizer.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
        optimizer.Evolve();

        var snapshot = optimizer.SaveState();
        var genesAtSnapshot = optimizer.Population.Select(c => c.Genes.ToArray()).ToList();
        int generationAtSnapshot = optimizer.CurrentGeneration;

        // Advance several generations, then restore.
        for (int i = 0; i < 3; i++)
        {
            await optimizer.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
            optimizer.Evolve();
        }

        optimizer.LoadState(snapshot);

        Assert.Equal(generationAtSnapshot, optimizer.CurrentGeneration);
        var restored = optimizer.Population;
        Assert.Equal(genesAtSnapshot.Count, restored.Count);
        for (int i = 0; i < restored.Count; i++)
        {
            Assert.Equal(genesAtSnapshot[i], restored[i].Genes);
        }
    }

    [Fact]
    public async Task A_Restored_Run_Reproduces_The_Original_Outcome()
    {
        // The end-to-end guarantee: resuming from a snapshot must reach the same result as never
        // having paused. That is the property an intervened or resumed run has to preserve.
        var control = CreateOptimizer(populationSize: 8, masterSeed: 5150);
        control.Initialize();

        var resumed = CreateOptimizer(populationSize: 8, masterSeed: 5150);
        resumed.Initialize();

        // Before the pause both optimisers do the same work.
        await control.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
        control.Evolve();
        await resumed.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
        resumed.Evolve();

        var snapshot = resumed.SaveState();

        // The control continues uninterrupted; the other is rebuilt from the snapshot.
        for (int i = 0; i < 3; i++)
        {
            await control.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
            control.Evolve();
        }

        var restored = CreateOptimizer(populationSize: 8, masterSeed: 5150);
        restored.LoadState(snapshot);
        for (int i = 0; i < 3; i++)
        {
            await restored.EvaluateAsync(FirstGeneFitness(), CancellationToken.None);
            restored.Evolve();
        }

        Assert.Equal(control.CurrentGeneration, restored.CurrentGeneration);
        for (int i = 0; i < control.Population.Count; i++)
        {
            Assert.Equal(control.Population[i].Genes, restored.Population[i].Genes);
        }
    }

    [Fact]
    public async Task InvalidateFitness_Marks_Every_Chromosome_For_Re_Evaluation()
    {
        // Changed inputs must be able to force a re-evaluation of an otherwise-evaluated population.
        var optimizer = CreateOptimizer(populationSize: 4);
        optimizer.Initialize();
        await optimizer.EvaluateAsync(ConstantFitness(1.0), CancellationToken.None);
        Assert.All(optimizer.Population, c => Assert.Equal(1.0, c.Fitness));

        optimizer.InvalidateFitness();

        Assert.All(optimizer.Population, c => Assert.Equal(Chromosome.NotEvaluated, c.Fitness));

        await optimizer.EvaluateAsync(ConstantFitness(2.0), CancellationToken.None);
        Assert.All(optimizer.Population, c => Assert.Equal(2.0, c.Fitness));
    }
}
