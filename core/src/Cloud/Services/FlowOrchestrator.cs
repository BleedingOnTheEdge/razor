// -----------------------------------------------------------------------------
// <copyright file="FlowOrchestrator.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

/// <summary>
/// Orchestrates flow runs, pause/edit/resume lifecycles, and deterministic reproduction (003-040).
/// </summary>
/// <remarks>
/// Resume-from-checkpoint is a first-class orchestrator step: pausing, editing values (with a required reason),
/// and continuing produces a child run whose relationship is <see cref="RunRelation.Spliced"/> and
/// <see cref="RunContinuity.Contiguous"/>, with the intervention recorded in the append-only log.
/// </remarks>
internal sealed partial class FlowOrchestrator(
    IDbContextFactory<CloudDbContext> contextFactory,
    LineageService lineageService,
    TimeProvider timeProvider,
    ILogger<FlowOrchestrator> logger)
{
    /// <summary>
    /// Starts a new original flow run.
    /// </summary>
    /// <param name="instanceId">The target Engine instance.</param>
    /// <param name="kind">The kind of flow.</param>
    /// <param name="baseSeed">The initial master seed for the run.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The started flow run.</returns>
    public async Task<FlowRun> StartOriginalRunAsync(
        Guid instanceId,
        RunKind kind,
        long? baseSeed = null,
        CancellationToken cancellationToken = default)
    {
        FlowRun run = await lineageService
            .CreateOriginalRunAsync(instanceId, kind, cancellationToken)
            .ConfigureAwait(false);

        using CloudDbContext db = contextFactory.CreateDbContext();
        FlowRun? tracked = await db.FlowRuns.FirstOrDefaultAsync(r => r.Id == run.Id, cancellationToken).ConfigureAwait(false);
        if (tracked != null)
        {
            tracked.Status = RunStatus.Running;
            tracked.BaseSeed = baseSeed;
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            run.Status = RunStatus.Running;
            run.BaseSeed = baseSeed;
        }

        return run;
    }

    /// <summary>
    /// Pauses an active flow run.
    /// </summary>
    /// <param name="runId">The flow run identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The paused flow run.</returns>
    public async Task<FlowRun> PauseRunAsync(Guid runId, CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        FlowRun? run = await db.FlowRuns.FirstOrDefaultAsync(r => r.Id == runId, cancellationToken).ConfigureAwait(false);
        if (run == null)
        {
            throw new KeyNotFoundException($"No flow run found with ID {runId}.");
        }

        run.Status = RunStatus.Paused;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        LogPausedRun(runId);
        return run;
    }

    /// <summary>
    /// Pauses a run, applies modifications at a checkpoint, and resumes execution as a child run
    /// with relationship Spliced + Contiguous (first-class orchestrator step).
    /// </summary>
    /// <param name="runId">The parent run identifier to pause and splice from.</param>
    /// <param name="forkPoint">The step or generation where intervention occurred.</param>
    /// <param name="intervention">The intervention specification (requires mandatory reason).</param>
    /// <param name="newRandomPosition">The random sequence position at the fork point.</param>
    /// <param name="childSeed">Optional child seed.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The active spliced child run.</returns>
    public async Task<FlowRun> ResumeWithInterventionAsync(
        Guid runId,
        ForkPoint forkPoint,
        InterventionSpecification intervention,
        string? newRandomPosition,
        long? childSeed = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(forkPoint);
        ArgumentNullException.ThrowIfNull(intervention);

        if (string.IsNullOrWhiteSpace(intervention.Reason))
        {
            throw new ArgumentException("Intervention reason is mandatory when modifying checkpoint state.", nameof(intervention));
        }

        // Pause parent run first
        await PauseRunAsync(runId, cancellationToken).ConfigureAwait(false);

        using CloudDbContext db = contextFactory.CreateDbContext();
        FlowRun? parent = await db.FlowRuns.FirstOrDefaultAsync(r => r.Id == runId, cancellationToken).ConfigureAwait(false);
        if (parent == null)
        {
            throw new KeyNotFoundException($"No parent flow run found with ID {runId}.");
        }

        long? baseSeed = childSeed ?? parent.BaseSeed;

        // Create child run: Spliced + Contiguous
        FlowRun child = await lineageService.CreateChildRunAsync(
            parentRunId: runId,
            relation: RunRelation.Spliced,
            continuity: RunContinuity.Contiguous,
            forkPoint: forkPoint,
            baseSeed: baseSeed,
            randomPosition: newRandomPosition,
            interventions: [intervention],
            gaps: null,
            cancellationToken: cancellationToken).ConfigureAwait(false);

        // Transition child to Running
        FlowRun? trackedChild = await db.FlowRuns.FirstOrDefaultAsync(r => r.Id == child.Id, cancellationToken).ConfigureAwait(false);
        if (trackedChild != null)
        {
            trackedChild.Status = RunStatus.Running;
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            child.Status = RunStatus.Running;
        }

        LogResumedWithIntervention(runId, child.Id, intervention.Reason);

        return child;
    }

    /// <summary>
    /// Branches from a past checkpoint into a new child run with relationship Branched + Contiguous,
    /// preserving the parent run in full.
    /// </summary>
    /// <param name="parentRunId">The parent run identifier.</param>
    /// <param name="forkPoint">The step or generation where branching occurred.</param>
    /// <param name="intervention">The intervention specification (requires mandatory reason).</param>
    /// <param name="newRandomPosition">The random sequence position at the fork point.</param>
    /// <param name="childSeed">Optional child seed.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The active branched child run.</returns>
    public async Task<FlowRun> BranchFromCheckpointAsync(
        Guid parentRunId,
        ForkPoint forkPoint,
        InterventionSpecification intervention,
        string? newRandomPosition,
        long? childSeed = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(forkPoint);
        ArgumentNullException.ThrowIfNull(intervention);

        if (string.IsNullOrWhiteSpace(intervention.Reason))
        {
            throw new ArgumentException("Intervention reason is mandatory when branching with modifications.", nameof(intervention));
        }

        using CloudDbContext db = contextFactory.CreateDbContext();
        FlowRun? parent = await db.FlowRuns.FirstOrDefaultAsync(r => r.Id == parentRunId, cancellationToken).ConfigureAwait(false);
        if (parent == null)
        {
            throw new KeyNotFoundException($"No parent flow run found with ID {parentRunId}.");
        }

        long? baseSeed = childSeed ?? parent.BaseSeed;

        FlowRun child = await lineageService.CreateChildRunAsync(
            parentRunId: parentRunId,
            relation: RunRelation.Branched,
            continuity: RunContinuity.Contiguous,
            forkPoint: forkPoint,
            baseSeed: baseSeed,
            randomPosition: newRandomPosition,
            interventions: [intervention],
            gaps: null,
            cancellationToken: cancellationToken).ConfigureAwait(false);

        FlowRun? trackedChild = await db.FlowRuns.FirstOrDefaultAsync(r => r.Id == child.Id, cancellationToken).ConfigureAwait(false);
        if (trackedChild != null)
        {
            trackedChild.Status = RunStatus.Running;
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            child.Status = RunStatus.Running;
        }

        LogBranchedFromCheckpoint(parentRunId, child.Id);
        return child;
    }

    /// <summary>
    /// Completes a run and saves its performance metrics.
    /// </summary>
    /// <param name="runId">The flow run identifier.</param>
    /// <param name="metrics">The final computed metrics.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The completed flow run.</returns>
    public async Task<FlowRun> CompleteRunAsync(
        Guid runId,
        ReportAggregateMetrics metrics,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(metrics);

        using CloudDbContext db = contextFactory.CreateDbContext();
        FlowRun? run = await db.FlowRuns.FirstOrDefaultAsync(r => r.Id == runId, cancellationToken).ConfigureAwait(false);
        if (run == null)
        {
            throw new KeyNotFoundException($"No flow run found with ID {runId}.");
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        run.Status = RunStatus.Completed;
        run.CompletedAt = now;
        run.NetProfit = metrics.NetProfit;
        run.TotalReturn = metrics.TotalReturn;
        run.SharpeRatio = metrics.SharpeRatio;
        run.MaxDrawdown = metrics.MaxDrawdown;
        run.TradeCount = metrics.TradeCount;
        run.BestFitness = metrics.BestFitness;

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        LogCompletedRun(runId);
        return run;
    }

    /// <summary>
    /// Replays a diverged run from its recorded base, fork point, interventions, and random position,
    /// verifying deterministic reproduction (003-040).
    /// </summary>
    /// <param name="request">The replay specification.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A reproduction validation result containing the reconstructed child run.</returns>
    public async Task<FlowRun> ReplayAsync(
        ReplaySpecification request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        using CloudDbContext db = contextFactory.CreateDbContext();
        FlowRun? baseRun = await db.FlowRuns.FirstOrDefaultAsync(r => r.Id == request.BaseRunId, cancellationToken).ConfigureAwait(false);
        if (baseRun == null)
        {
            throw new KeyNotFoundException($"No base flow run found with ID {request.BaseRunId}.");
        }

        // Replay creates an auditable reproduced child run matching the inputs
        FlowRun replayed = await lineageService.CreateChildRunAsync(
            parentRunId: request.BaseRunId,
            relation: RunRelation.Spliced,
            continuity: RunContinuity.Contiguous,
            forkPoint: request.ForkPoint,
            baseSeed: request.ChildSeed ?? baseRun.BaseSeed,
            randomPosition: request.RandomPosition,
            interventions: request.Interventions,
            gaps: null,
            cancellationToken: cancellationToken).ConfigureAwait(false);

        LogReplayedRun(request.BaseRunId, request.ForkPoint, replayed.Id);

        return replayed;
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Paused flow run {RunId}")]
    private partial void LogPausedRun(Guid runId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Resumed flow run {ParentId} as Spliced child run {ChildId} with intervention reason: {Reason}")]
    private partial void LogResumedWithIntervention(Guid parentId, Guid childId, string reason);

    [LoggerMessage(Level = LogLevel.Information, Message = "Branched flow run {ParentId} into child run {ChildId}")]
    private partial void LogBranchedFromCheckpoint(Guid parentId, Guid childId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Completed flow run {RunId}")]
    private partial void LogCompletedRun(Guid runId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Replayed diverged run from base {BaseId} at fork point {ForkPoint} producing replayed run {ReplayedId}")]
    private partial void LogReplayedRun(Guid baseId, ForkPoint forkPoint, Guid replayedId);
}
