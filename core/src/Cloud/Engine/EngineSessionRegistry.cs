// -----------------------------------------------------------------------------
// <copyright file="EngineSessionRegistry.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Engine;

using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

/// <summary>
/// Tracks the live Engine sessions, so that a command submitted through the management API reaches an
/// instance that is connected now instead of waiting for its next heartbeat.
/// </summary>
/// <remarks>
/// <para>
/// At most one session per instance is registered, and the newest registration wins. An Engine that
/// reconnects before its previous socket has been reaped would otherwise let a command be written to the
/// stale connection; replacing the entry means delivery always targets the most recent handshake.
/// </para>
/// <para>
/// The registry owns the sessions it holds and disposes them when the host shuts down, which is what closes
/// each session's cipher and releases its ephemeral key material.
/// </para>
/// </remarks>
internal sealed class EngineSessionRegistry : IDisposable
{
    private readonly ConcurrentDictionary<Guid, EngineSession> _sessions = new();
    private readonly ILogger<EngineSessionRegistry> _logger;
    private bool _disposed;

    /// <summary>Initialises a new instance of the <see cref="EngineSessionRegistry"/> class.</summary>
    /// <param name="logger">The logger.</param>
    internal EngineSessionRegistry(ILogger<EngineSessionRegistry> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Registers an authenticated session for an instance.
    /// </summary>
    /// <param name="instanceId">The authenticated instance identifier.</param>
    /// <param name="session">The session to register.</param>
    /// <returns>
    /// The session that was displaced, when a previous session for the instance was still registered.
    /// </returns>
    /// <exception cref="ArgumentNullException"><paramref name="session"/> is <see langword="null"/>.</exception>
    internal EngineSession? Register(Guid instanceId, EngineSession session)
    {
        ArgumentNullException.ThrowIfNull(session);

        EngineSession? displaced = _sessions.TryGetValue(instanceId, out EngineSession? existing) ? existing : null;
        _sessions[instanceId] = session;
        return displaced;
    }

    /// <summary>
    /// Removes a session, but only when it is still the registered one.
    /// </summary>
    /// <param name="instanceId">The instance identifier.</param>
    /// <param name="session">The session that is ending.</param>
    /// <remarks>
    /// The guard matters because a reconnect can register a replacement before the previous connection's
    /// cleanup runs; without it, that cleanup would evict the live session.
    /// </remarks>
    internal void Unregister(Guid instanceId, EngineSession session)
    {
        ArgumentNullException.ThrowIfNull(session);

        if (_sessions.TryGetValue(instanceId, out EngineSession? current) && ReferenceEquals(current, session))
        {
            _sessions.TryRemove(instanceId, out _);
        }
    }

    /// <summary>
    /// Writes any undelivered commands to the instance, when it has a live session.
    /// </summary>
    /// <param name="instanceId">The instance identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns><see langword="true"/> when a live session was found and asked to deliver.</returns>
    internal async Task<bool> TryDeliverPendingCommandsAsync(Guid instanceId, CancellationToken cancellationToken)
    {
        if (!_sessions.TryGetValue(instanceId, out EngineSession? session))
        {
            return false;
        }

        await session.SendPendingCommandsAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    /// <inheritdoc/>
    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        foreach (EngineSession session in _sessions.Values)
        {
            session.Dispose();
            CloudLog.SessionClosed(_logger, session.InstanceId);
        }

        _sessions.Clear();
        GC.SuppressFinalize(this);
    }
}
