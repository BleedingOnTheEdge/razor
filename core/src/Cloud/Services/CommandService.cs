// -----------------------------------------------------------------------------
// <copyright file="CommandService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using System.Text.Json;
using Cloud.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

/// <summary>
/// Queues commands for an Engine, records the progress and results it reports, and fails commands that
/// expire (002-020-020 §3.5; 002-030-160 §17.1 "sends commands, receives progress/results").
/// </summary>
/// <remarks>
/// <para>
/// <strong>Delivery is once, and is not acknowledged.</strong> The protocol has no acceptance message for a
/// <c>Command</c>, and the Engine does not deduplicate, so Cloud never re-sends a command that has already
/// been written to a connection. A command whose answer is lost therefore ends as a timeout failure rather
/// than a silent second execution, which is the safe direction for commands that start live trading.
/// </para>
/// <para>
/// Commands are delivered as top-level <c>Command</c> messages rather than being piggy-backed on a
/// heartbeat response. The Engine preserves Cloud's <c>CorrelationId</c> on a top-level command, but mints
/// a fresh random one for a command read out of a heartbeat response
/// (<c>Engine.Communication.CloudConnector.HandleHeartbeatResponseAsync</c>), which would make the
/// response unmatchable.
/// </para>
/// </remarks>
internal sealed class CommandService(
    IDbContextFactory<CloudDbContext> contextFactory,
    CloudOptions options,
    TimeProvider timeProvider,
    ILogger<CommandService> logger)
{
    /// <summary>
    /// Queues a command for an instance.
    /// </summary>
    /// <param name="instanceId">The target instance identifier.</param>
    /// <param name="numericCommandId">The numeric command identifier from the Engine's registry.</param>
    /// <param name="commandType">The command name.</param>
    /// <param name="parametersJson">The parameters as a JSON object, or <see langword="null"/> for none.</param>
    /// <param name="timeoutSeconds">The Engine-side execution timeout, or <see langword="null"/> for none.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The queued command, or the reason it was refused.</returns>
    /// <remarks>
    /// The command is created in the <see cref="CommandStatus.Pending"/> state; it is written to the
    /// instance by the session that owns the connection (see <see cref="TakeUndeliveredAsync"/>).
    /// </remarks>
    internal async Task<CommandOutcome> SubmitAsync(
        Guid instanceId,
        int numericCommandId,
        string? commandType,
        string? parametersJson,
        int? timeoutSeconds,
        CancellationToken cancellationToken)
    {
        if (numericCommandId <= 0)
        {
            return new CommandOutcome(ServiceStatus.Rejected, "CommandId must be a positive number.", null);
        }

        if (string.IsNullOrWhiteSpace(commandType))
        {
            return new CommandOutcome(ServiceStatus.Rejected, "CommandType is required.", null);
        }

        if (timeoutSeconds is <= 0)
        {
            return new CommandOutcome(ServiceStatus.Rejected, "TimeoutSeconds must be a positive number when supplied.", null);
        }

        if (parametersJson is not null && !IsJsonObject(parametersJson))
        {
            return new CommandOutcome(ServiceStatus.Rejected, "Parameters must be a JSON object.", null);
        }

        using CloudDbContext db = contextFactory.CreateDbContext();

        bool exists = await db.EngineInstances
            .AnyAsync(i => i.Id == instanceId, cancellationToken)
            .ConfigureAwait(false);
        if (!exists)
        {
            return new CommandOutcome(ServiceStatus.NotFound, "No Engine instance with that identifier.", null);
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        var command = new EngineCommand
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = instanceId,
            NumericCommandId = numericCommandId,
            CommandType = commandType.Trim(),
            ParametersJson = parametersJson,
            TimeoutSeconds = timeoutSeconds,
            CorrelationId = Guid.NewGuid().ToString(),
            Status = CommandStatus.Pending,
            SubmittedAt = now
        };

        db.EngineCommands.Add(command);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new CommandOutcome(ServiceStatus.Succeeded, null, command);
    }

    /// <summary>
    /// Reads the oldest commands queued for an instance that have never been written to it.
    /// </summary>
    /// <param name="instanceId">The instance identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>At most <see cref="CloudOptions.CommandBatchSize"/> commands, oldest first.</returns>
    /// <remarks>
    /// The commands are returned without changing their state. The caller marks them dispatched only after
    /// the write succeeds, so a command is never recorded as delivered when the connection failed first.
    /// </remarks>
    internal async Task<IReadOnlyList<EngineCommand>> TakeUndeliveredAsync(Guid instanceId, CancellationToken cancellationToken)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        List<EngineCommand> queued = await db.EngineCommands
            .Where(c => c.EngineInstanceId == instanceId && c.Status == CommandStatus.Pending)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        // The ordering and the batch limit are applied in memory rather than in SQL on purpose: EF Core's
        // SQLite provider cannot translate an ORDER BY over a DateTimeOffset column, so ordering here keeps
        // CommandService portable across providers. The filter above is served by the (instance, status)
        // index, and the number of pending rows for one instance is bounded by CommandQueueExpirySeconds,
        // which fails anything the Engine never collects.
        return [.. queued
            .OrderBy(c => c.SubmittedAt)
            .ThenBy(c => c.Id)
            .Take(options.CommandBatchSize)];
    }

    /// <summary>
    /// Marks commands as written to their instance.
    /// </summary>
    /// <param name="commandIds">The identifiers of the commands that were written.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task that completes when the state is persisted.</returns>
    internal async Task MarkDispatchedAsync(IReadOnlyList<Guid> commandIds, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(commandIds);
        if (commandIds.Count == 0)
        {
            return;
        }

        using CloudDbContext db = contextFactory.CreateDbContext();
        DateTimeOffset now = timeProvider.GetUtcNow();

        List<EngineCommand> commands = await db.EngineCommands
            .Where(c => commandIds.Contains(c.Id) && c.Status == CommandStatus.Pending)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        foreach (EngineCommand command in commands)
        {
            command.Status = CommandStatus.Dispatched;
            command.DispatchedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Records an interim progress report for a command.
    /// </summary>
    /// <param name="instanceId">The reporting instance, which must own the command.</param>
    /// <param name="correlationId">The command's correlation identifier.</param>
    /// <param name="payloadJson">The raw JSON payload of the progress event.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns><see langword="true"/> when the report was stored.</returns>
    /// <remarks>
    /// A report is dropped when the command is unknown, belongs to another instance, or has already
    /// reached a final state: the Engine's progress events are advisory, and accepting one after the final
    /// answer would record progress for work that has finished.
    /// </remarks>
    internal async Task<bool> RecordProgressAsync(
        Guid instanceId,
        string correlationId,
        string payloadJson,
        CancellationToken cancellationToken)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        EngineCommand? command = await FindLiveCommandAsync(db, instanceId, correlationId, cancellationToken).ConfigureAwait(false);
        if (command is null)
        {
            return false;
        }

        db.CommandProgressReports.Add(new CommandProgressReport
        {
            Id = Guid.NewGuid(),
            EngineCommandId = command.Id,
            PayloadJson = payloadJson,
            ReportedAt = timeProvider.GetUtcNow()
        });

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    /// <summary>
    /// Records the final outcome of a command.
    /// </summary>
    /// <param name="instanceId">The reporting instance, which must own the command.</param>
    /// <param name="correlationId">The command's correlation identifier.</param>
    /// <param name="isSuccess">Whether the Engine reported success.</param>
    /// <param name="resultPayloadJson">The JSON result payload on success.</param>
    /// <param name="error">The error message on failure.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns><see langword="true"/> when the outcome was stored.</returns>
    /// <remarks>
    /// The first final outcome wins. A second answer for the same command — a duplicate, or a late reply
    /// that raced a timeout — is refused rather than allowed to overwrite the recorded result.
    /// </remarks>
    internal async Task<bool> CompleteAsync(
        Guid instanceId,
        string correlationId,
        bool isSuccess,
        string? resultPayloadJson,
        string? error,
        CancellationToken cancellationToken)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        EngineCommand? command = await FindLiveCommandAsync(db, instanceId, correlationId, cancellationToken).ConfigureAwait(false);
        if (command is null)
        {
            return false;
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        command.Status = isSuccess ? CommandStatus.Completed : CommandStatus.Failed;
        command.CompletedAt = now;
        command.ResultPayloadJson = isSuccess ? resultPayloadJson : null;
        command.ErrorMessage = isSuccess ? null : error;

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    /// <summary>
    /// Fails commands for an instance that can no longer complete.
    /// </summary>
    /// <param name="instanceId">The instance identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The number of commands failed.</returns>
    /// <remarks>
    /// <para>
    /// Two conditions end a command without an answer from the Engine:
    /// </para>
    /// <list type="bullet">
    ///   <item><description>
    ///   a command still queued after <see cref="CloudOptions.CommandQueueExpirySeconds"/> never reached the
    ///   instance, which bounds an undrainable queue;
    ///   </description></item>
    ///   <item><description>
    ///   a command written to the instance whose optional <see cref="EngineCommand.TimeoutSeconds"/> has
    ///   elapsed without a response — delivery is not acknowledged, so silence is the only signal that the
    ///   answer was lost.
    ///   </description></item>
    /// </list>
    /// <para>
    /// A command with no <see cref="EngineCommand.TimeoutSeconds"/> is left dispatched rather than failed:
    /// the protocol gives no deadline for it, and Cloud would be inventing one.
    /// </para>
    /// </remarks>
    internal async Task<int> FailExpiredAsync(Guid instanceId, CancellationToken cancellationToken)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();
        DateTimeOffset now = timeProvider.GetUtcNow();
        DateTimeOffset queueDeadline = now.AddSeconds(-options.CommandQueueExpirySeconds);

        List<EngineCommand> candidates = await db.EngineCommands
            .Where(c => c.EngineInstanceId == instanceId
                && (c.Status == CommandStatus.Pending || c.Status == CommandStatus.Dispatched))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        int failed = 0;
        foreach (EngineCommand command in candidates)
        {
            if (command.Status == CommandStatus.Pending && command.SubmittedAt <= queueDeadline)
            {
                command.Status = CommandStatus.Failed;
                command.CompletedAt = now;
                command.ErrorMessage = "The command expired before the Engine collected it.";
                CloudLog.CommandExpired(logger, command.CorrelationId);
                failed++;
            }
            else if (command.Status == CommandStatus.Dispatched
                && command.TimeoutSeconds is int timeout
                && command.DispatchedAt is DateTimeOffset dispatchedAt
                && dispatchedAt.AddSeconds(timeout) <= now)
            {
                command.Status = CommandStatus.Failed;
                command.CompletedAt = now;
                command.ErrorMessage = "The Engine did not answer before the command timeout elapsed.";
                CloudLog.CommandExpired(logger, command.CorrelationId);
                failed++;
            }
        }

        if (failed > 0)
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        return failed;
    }

    /// <summary>
    /// Loads a command and its progress reports.
    /// </summary>
    /// <param name="commandId">The Cloud-side command identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The command with its progress reports, or <see langword="null"/> when it does not exist.</returns>
    internal async Task<EngineCommand?> GetAsync(Guid commandId, CancellationToken cancellationToken)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        return await db.EngineCommands
            .Include(c => c.ProgressReports)
            .FirstOrDefaultAsync(c => c.Id == commandId, cancellationToken)
            .ConfigureAwait(false);
    }

    private static bool IsJsonObject(string json)
    {
        try
        {
            using JsonDocument document = JsonDocument.Parse(json);
            return document.RootElement.ValueKind == JsonValueKind.Object;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static async Task<EngineCommand?> FindLiveCommandAsync(
        CloudDbContext db,
        Guid instanceId,
        string correlationId,
        CancellationToken cancellationToken)
    {
        return await db.EngineCommands
            .FirstOrDefaultAsync(
                c => c.EngineInstanceId == instanceId
                    && c.CorrelationId == correlationId
                    && (c.Status == CommandStatus.Pending || c.Status == CommandStatus.Dispatched),
                cancellationToken)
            .ConfigureAwait(false);
    }
}
