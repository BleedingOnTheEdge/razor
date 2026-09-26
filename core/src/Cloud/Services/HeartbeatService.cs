// -----------------------------------------------------------------------------
// <copyright file="HeartbeatService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Cloud.Protocol;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Handles an Engine heartbeat: liveness, identity binding, administrative status and command expiry
/// (002-020-020 §3.4).
/// </summary>
/// <remarks>
/// <para>
/// The heartbeat is also the only periodic Cloud-side event for a connected instance, so it carries the
/// housekeeping that must not need a separate scheduler: it stamps <see cref="EngineInstance.LastSeenAt"/>
/// and sweeps commands that can no longer complete.
/// </para>
/// <para>
/// The payload's <c>EngineId</c> is checked against the identifier recorded for the authenticated instance.
/// Authentication resolves the instance from the API key alone, so this check is what stops a leaked API key
/// from being used by a different Engine binary.
/// </para>
/// </remarks>
internal sealed class HeartbeatService(
    IDbContextFactory<CloudDbContext> contextFactory,
    CommandService commandService,
    CloudOptions options,
    TimeProvider timeProvider)
{
    /// <summary>
    /// Processes a heartbeat and produces the response Cloud sends.
    /// </summary>
    /// <param name="instanceId">The authenticated instance identifier.</param>
    /// <param name="reportedEngineId">The <c>EngineId</c> the Engine reported in the heartbeat payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The heartbeat response body.</returns>
    internal async Task<HeartbeatOutcome> HandleAsync(
        Guid instanceId,
        string? reportedEngineId,
        CancellationToken cancellationToken)
    {
        DateTimeOffset now = timeProvider.GetUtcNow();

        using CloudDbContext db = contextFactory.CreateDbContext();

        EngineInstance? instance = await db.EngineInstances
            .Include(i => i.License)
            .FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken)
            .ConfigureAwait(false);

        if (instance is null)
        {
            return new HeartbeatOutcome(
                CloudProtocol.HeartbeatStatus.Lock,
                AuthValid: false,
                options.HeartbeatIntervalSeconds,
                now);
        }

        if (!string.Equals(instance.EngineId, reportedEngineId, StringComparison.Ordinal))
        {
            return new HeartbeatOutcome(
                CloudProtocol.HeartbeatStatus.Lock,
                AuthValid: false,
                options.HeartbeatIntervalSeconds,
                now);
        }

        await commandService.FailExpiredAsync(instanceId, cancellationToken).ConfigureAwait(false);

        instance.LastSeenAt = now;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new HeartbeatOutcome(
            InstanceHealthPolicy.Evaluate(instance, instance.License, now),
            AuthValid: true,
            options.HeartbeatIntervalSeconds,
            now);
    }
}
