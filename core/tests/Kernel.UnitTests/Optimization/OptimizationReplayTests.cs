// -----------------------------------------------------------------------------
// <copyright file="OptimizationReplayTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.UnitTests.Optimization;

using Kernel.Configuration;
using Kernel.Optimization;
using Kernel.Telemetry;
using Sdk.Shared;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

public sealed class OptimizationReplayTests
{
    [Fact]
    public async Task ReplayDivergedRun_ReproducesIdentically_WhenInterventionsAndRandomStateRestored()
    {
        // Arrange
        var schema = new[]
        {
            new GeneAttribute(0.0, 100.0, 1.0, GeneType.Discrete) { Name = "Param1" },
            new GeneAttribute(0.0, 100.0, 1.0, GeneType.Discrete) { Name = "Param2" }
        };
        using var metrics = new CoreMetrics("test-instance");

        // 1. Create Base Optimizer and run to Generation 5 (Fork Point)
        var spec = new OptimizationSpecification 
        { 
            Generations = 10, 
            PopulationSize = 10, 
            MasterSeed = 42,
            MutationRate = 0.1,
            CrossoverRate = 0.5,
            ElitismPct = 0.1,
            TournamentSize = 2
        };
        var baseRunner = new OptimizationRunner(spec, schema, metrics);

        for (int i = 0; i < 5; i++)
        {
            await baseRunner.StepAsync((c, ct) => Task.FromResult(c.Genes[0] + c.Genes[1]), CancellationToken.None);
        }

        // Capture the state at the fork point (Generation 5)
        GeneticOptimizerState forkState = baseRunner.SaveState();

        // 2. Child A (The Diverged Run)
        // We simulate a user intervention: manually changing a gene of the best solution.
        var childARunner = new OptimizationRunner(spec, schema, metrics);
        
        // Ensure state is loaded with random position
        childARunner.LoadState(forkState);

        // Apply Intervention on Child A
        var childAPop = childARunner.Population;
        var originalGene0 = childAPop[0].Genes[0];
        childAPop[0].Genes[0] = 999.0; // Intervention!
        childARunner.InvalidateFitness(); // Must invalidate so it evaluates the modified chromosome

        // Complete Child A
        while (childARunner.CurrentGeneration < spec.Generations - 1)
        {
            await childARunner.StepAsync((c, ct) => Task.FromResult(c.Genes[0] + c.Genes[1]), CancellationToken.None);
        }
        var childAState = childARunner.SaveState();
        var childABest = childARunner.BestSolution!;

        // 3. Child B (The Replayed Run)
        // We prove the reproduction contract by replaying the fork point and intervention.
        var childBRunner = new OptimizationRunner(spec, schema, metrics);
        
        // Load the exact same fork state
        childBRunner.LoadState(forkState);

        // Apply the EXACT same Intervention on Child B
        var childBPop = childBRunner.Population;
        childBPop[0].Genes[0] = 999.0; // Same intervention
        childBRunner.InvalidateFitness();

        // Complete Child B
        while (childBRunner.CurrentGeneration < spec.Generations - 1)
        {
            await childBRunner.StepAsync((c, ct) => Task.FromResult(c.Genes[0] + c.Genes[1]), CancellationToken.None);
        }
        var childBState = childBRunner.SaveState();
        var childBBest = childBRunner.BestSolution!;

        // Assert - The Reproduction Contract (AC 3)
        // The diverged run (A) is reproduced exactly (B).
        Assert.Equal(childABest.Fitness, childBBest.Fitness);
        Assert.Equal(childABest.Genes[0], childBBest.Genes[0]);
        Assert.Equal(childABest.Genes[1], childBBest.Genes[1]);

        // Deep equality on the final population to ensure randomness sequence was identical
        for (int i = 0; i < spec.PopulationSize; i++)
        {
            Assert.Equal(childAState.Population[i].Fitness, childBState.Population[i].Fitness);
            Assert.True(childAState.Population[i].Genes.SequenceEqual(childBState.Population[i].Genes));
        }
    }
}
