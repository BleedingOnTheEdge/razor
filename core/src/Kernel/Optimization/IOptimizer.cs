namespace Kernel.Optimization;

/// <summary>
/// Execution status of an optimization process.
/// </summary>
public enum OptimizationStatus
{
    /// <summary>The optimizer has been initialized but computation has not started.</summary>
    Ready,

    /// <summary>The optimizer is actively executing generations or steps.</summary>
    Running,

    /// <summary>The optimizer has completed all scheduled generations or converged.</summary>
    Completed,

    /// <summary>The optimizer was cancelled by the caller or runtime token.</summary>
    Cancelled,

    /// <summary>The optimizer failed due to an unhandled execution error.</summary>
    Failed
}

/// <summary>
/// Standard lifecycle contract for optimization algorithms (GA, Walk-Forward, RL, Bayesian, etc.).
/// </summary>
public interface IOptimizer
{
    /// <summary>Current lifecycle execution status.</summary>
    OptimizationStatus Status => OptimizationStatus.Ready;

    /// <summary>Initializes optimizer state and fitness evaluation parameters.</summary>
    ValueTask InitializeAsync(CancellationToken cancellationToken = default) => ValueTask.CompletedTask;

    /// <summary>Executes a single generational or epoch step in the optimization lifecycle.</summary>
    ValueTask<bool> StepAsync(CancellationToken cancellationToken = default) => ValueTask.FromResult(true);

    /// <summary>Stops optimization and flushes final metrics.</summary>
    ValueTask StopAsync(CancellationToken cancellationToken = default) => ValueTask.CompletedTask;
}
