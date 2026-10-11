// -----------------------------------------------------------------------------
// <copyright file="IClientEventBroadcaster.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Events;

/// <summary>
/// Defines the real-time event streaming interface for connected frontend clients (SSE and WebSockets).
/// </summary>
internal interface IClientEventBroadcaster
{
    /// <summary>
    /// Publishes a real-time event to all active client subscribers.
    /// </summary>
    /// <param name="clientEvent">The event to broadcast.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task that completes when the event has been dispatched to active queues.</returns>
    Task PublishAsync(ClientEvent clientEvent, CancellationToken cancellationToken = default);

    /// <summary>
    /// Subscribes to the stream of real-time events, with optional filtering by instance ID.
    /// </summary>
    /// <param name="instanceId">Optional engine instance filter.</param>
    /// <param name="cancellationToken">Cancellation token to terminate the subscription.</param>
    /// <returns>An async enumerable stream of events.</returns>
    IAsyncEnumerable<ClientEvent> SubscribeAsync(Guid? instanceId = null, CancellationToken cancellationToken = default);
}
