// -----------------------------------------------------------------------------
// <copyright file="LineageService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

/// <summary>
/// Manages flow runs, parent-child relationships across the relation and continuity axes,
/// and append-only intervention and gap logging (003-040).
/// </summary>
internal sealed partial class LineageService(
    IDbContextFactory<CloudDbContext> contextFactory,
    TimeProvider timeProvider,
    ILogger<LineageService> logger)
{
    /// <summary>
    /// Creates a new original flow run. Original runs record no parent or fork metadata.
    /// </summary>
    /// <param name="instanceId">The target Engine instance identifier.</param>
    /// <param name="kind">The category of flow execution.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created original flow run.</returns>
    public async Task<FlowRun> CreateOriginalRunAsync(
        Guid instanceId,
        RunKind kind,
        CancellationToken cancellationToken = default)
    {
        if (instanceId == Guid.Empty)
        {
            throw new ArgumentException("EngineInstanceId must not be empty.", nameof(instanceId));
        }

        using CloudDbContext db = contextFactory.CreateDbContext();

        bool instanceExists = await db.EngineInstances
            .AnyAsync(i => i.Id == instanceId, cancellationToken)
            .ConfigureAwait(false);

        if (!instanceExists)
        {
            throw new KeyNotFoundException($"No Engine instance found with ID {instanceId}.");
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        var run = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = instanceId,
            Kind = kind,
            Status = RunStatus.Pending,
            ParentRunId = null,
            Relation = null,
            Continuity = null,
            ForkPointStep = null,
            ForkPointGeneration = null,
            ForkPointWindowIndex = null,
            BaseSeed = null,
            RandomPosition = null,
            IsPartial = false,
            CreatedAt = now
        };

        db.FlowRuns.Add(run);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        LogCreatedOriginalRun(run.Id, kind);
        return run;
    }

    /// <summary>
    /// Creates a child flow run derived from a parent run along the relation and continuity axes.
    /// </summary>
    /// <param name="parentRunId">The parent run identifier.</param>
    /// <param name="relation">How the child relates to the parent (Appended, Branched, Spliced).</param>
    /// <param name="continuity">Whether the timeline has gaps (Contiguous, Gapped).</param>
    /// <param name="forkPoint">Where the run diverged from the parent.</param>
    /// <param name="baseSeed">The base seed at the fork point.</param>
    /// <param name="randomPosition">The random sequence position at the fork point.</param>
    /// <param name="interventions">Optional initial interventions applied at the fork point.</param>
    /// <param name="gaps">Optional initial gaps if continuity is Gapped.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created child flow run.</returns>
    public async Task<FlowRun> CreateChildRunAsync(
        Guid parentRunId,
        RunRelation relation,
        RunContinuity continuity,
        ForkPoint forkPoint,
        long? baseSeed,
        string? randomPosition,
        IReadOnlyList<InterventionSpecification>? interventions = null,
        IReadOnlyList<GapSpecification>? gaps = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(forkPoint);

        if (continuity == RunContinuity.Gapped && (gaps == null || gaps.Count == 0))
        {
            throw new ArgumentException("A gapped run requires at least one gap specification detailing the gap range and reason.", nameof(gaps));
        }

        using CloudDbContext db = contextFactory.CreateDbContext();

        FlowRun? parent = await db.FlowRuns
            .Include(r => r.Gaps)
            .FirstOrDefaultAsync(r => r.Id == parentRunId, cancellationToken)
            .ConfigureAwait(false);

        if (parent == null)
        {
            throw new KeyNotFoundException($"No parent flow run found with ID {parentRunId}.");
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        var childRun = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = parent.EngineInstanceId,
            Kind = parent.Kind,
            Status = RunStatus.Pending,
            ParentRunId = parentRunId,
            Relation = relation,
            Continuity = continuity,
            ForkPointStep = forkPoint.Step,
            ForkPointGeneration = forkPoint.Generation,
            ForkPointWindowIndex = forkPoint.WindowIndex,
            BaseSeed = baseSeed,
            RandomPosition = randomPosition,
            IsPartial = continuity == RunContinuity.Gapped,
            CreatedAt = now
        };

        db.FlowRuns.Add(childRun);

        if (interventions != null)
        {
            foreach (var spec in interventions)
            {
                if (string.IsNullOrWhiteSpace(spec.Reason))
                {
                    throw new ArgumentException("Intervention reason is mandatory and cannot be empty or whitespace.", nameof(interventions));
                }

                childRun.Interventions.Add(new RunIntervention
                {
                    Id = Guid.NewGuid(),
                    FlowRunId = childRun.Id,
                    StepIndex = spec.StepIndex,
                    PreviousFingerprint = spec.PreviousFingerprint,
                    NewFingerprint = spec.NewFingerprint,
                    Actor = spec.Actor,
                    Timestamp = now,
                    Reason = spec.Reason.Trim(),
                    ModificationsSummary = spec.ModificationsSummary,
                    BeforePayloadJson = spec.BeforePayloadJson,
                    AfterPayloadJson = spec.AfterPayloadJson
                });
            }
        }

        if (gaps != null)
        {
            foreach (var gap in gaps)
            {
                if (string.IsNullOrWhiteSpace(gap.Reason))
                {
                    throw new ArgumentException("Gap reason is mandatory and cannot be empty or whitespace.", nameof(gaps));
                }

                childRun.Gaps.Add(new RunGap
                {
                    Id = Guid.NewGuid(),
                    FlowRunId = childRun.Id,
                    StartStep = gap.StartStep,
                    EndStep = gap.EndStep,
                    Reason = gap.Reason.Trim(),
                    RecordedAt = now
                });
            }
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        LogCreatedChildRun(childRun.Id, parentRunId, relation, continuity);

        return childRun;
    }

    /// <summary>
    /// Records an intervention in the append-only log for a flow run.
    /// </summary>
    /// <param name="runId">The flow run identifier.</param>
    /// <param name="intervention">The intervention specification.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The recorded intervention entity.</returns>
    public async Task<RunIntervention> RecordInterventionAsync(
        Guid runId,
        InterventionSpecification intervention,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(intervention);

        if (string.IsNullOrWhiteSpace(intervention.Reason))
        {
            throw new ArgumentException("Intervention reason is mandatory and cannot be empty or whitespace.", nameof(intervention));
        }

        using CloudDbContext db = contextFactory.CreateDbContext();

        bool runExists = await db.FlowRuns
            .AnyAsync(r => r.Id == runId, cancellationToken)
            .ConfigureAwait(false);

        if (!runExists)
        {
            throw new KeyNotFoundException($"No flow run found with ID {runId}.");
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        var record = new RunIntervention
        {
            Id = Guid.NewGuid(),
            FlowRunId = runId,
            StepIndex = intervention.StepIndex,
            PreviousFingerprint = intervention.PreviousFingerprint,
            NewFingerprint = intervention.NewFingerprint,
            Actor = intervention.Actor,
            Timestamp = now,
            Reason = intervention.Reason.Trim(),
            ModificationsSummary = intervention.ModificationsSummary,
            BeforePayloadJson = intervention.BeforePayloadJson,
            AfterPayloadJson = intervention.AfterPayloadJson
        };

        db.RunInterventions.Add(record);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        LogRecordedIntervention(runId, intervention.StepIndex, intervention.Actor);

        return record;
    }

    /// <summary>
    /// Records a coverage or execution gap for a flow run, marking the run as partial.
    /// </summary>
    /// <param name="runId">The flow run identifier.</param>
    /// <param name="gap">The gap specification.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The recorded gap entity.</returns>
    public async Task<RunGap> RecordGapAsync(
        Guid runId,
        GapSpecification gap,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(gap);

        if (string.IsNullOrWhiteSpace(gap.Reason))
        {
            throw new ArgumentException("Gap reason is mandatory and cannot be empty or whitespace.", nameof(gap));
        }

        using CloudDbContext db = contextFactory.CreateDbContext();

        FlowRun? run = await db.FlowRuns
            .FirstOrDefaultAsync(r => r.Id == runId, cancellationToken)
            .ConfigureAwait(false);

        if (run == null)
        {
            throw new KeyNotFoundException($"No flow run found with ID {runId}.");
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        var record = new RunGap
        {
            Id = Guid.NewGuid(),
            FlowRunId = runId,
            StartStep = gap.StartStep,
            EndStep = gap.EndStep,
            Reason = gap.Reason.Trim(),
            RecordedAt = now
        };

        run.Continuity = RunContinuity.Gapped;
        run.IsPartial = true;

        db.RunGaps.Add(record);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        LogRecordedGap(runId, gap.StartStep, gap.EndStep);

        return record;
    }

    /// <summary>
    /// Retrieves a flow run with its interventions and gaps.
    /// </summary>
    /// <param name="runId">The flow run identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The flow run if found; otherwise <see langword="null"/>.</returns>
    public async Task<FlowRun?> GetRunAsync(Guid runId, CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        return await db.FlowRuns
            .Include(r => r.Interventions)
            .Include(r => r.Gaps)
            .FirstOrDefaultAsync(r => r.Id == runId, cancellationToken)
            .ConfigureAwait(false);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Created original flow run {RunId} of kind {Kind}")]
    private partial void LogCreatedOriginalRun(Guid runId, RunKind kind);

    [LoggerMessage(Level = LogLevel.Information, Message = "Created child flow run {ChildId} from parent {ParentId} (Relation={Relation}, Continuity={Continuity})")]
    private partial void LogCreatedChildRun(Guid childId, Guid parentId, RunRelation relation, RunContinuity continuity);

    [LoggerMessage(Level = LogLevel.Information, Message = "Recorded intervention on flow run {RunId} at step {StepIndex} by {Actor}")]
    private partial void LogRecordedIntervention(Guid runId, long stepIndex, string actor);

    [LoggerMessage(Level = LogLevel.Information, Message = "Recorded gap on flow run {RunId} from step {Start} to {End}")]
    private partial void LogRecordedGap(Guid runId, long start, long end);
}
