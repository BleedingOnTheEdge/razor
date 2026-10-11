// -----------------------------------------------------------------------------
// <copyright file="ClientEvent.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Events;

/// <summary>
/// A real-time domain event broadcast to connected frontend dashboard and marketplace clients.
/// </summary>
/// <param name="EventType">The event category discriminator (e.g. command_progress, engine_heartbeat, run_status).</param>
/// <param name="InstanceId">The associated engine instance, when applicable.</param>
/// <param name="RunId">The associated flow run, when applicable.</param>
/// <param name="CorrelationId">The correlation identifier of the initiating command, when applicable.</param>
/// <param name="Timestamp">The timestamp when the event occurred.</param>
/// <param name="Data">The event payload data.</param>
internal sealed record ClientEvent(
    string EventType,
    Guid? InstanceId,
    Guid? RunId,
    string? CorrelationId,
    DateTimeOffset Timestamp,
    object? Data);
