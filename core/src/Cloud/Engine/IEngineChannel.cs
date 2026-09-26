// -----------------------------------------------------------------------------
// <copyright file="IEngineChannel.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Engine;

/// <summary>
/// The transport an <see cref="EngineSession"/> writes to.
/// </summary>
/// <remarks>
/// The session depends on this rather than on <c>WebSocket</c> directly so that the protocol conversation —
/// the handshake, the heartbeat exchange, command delivery and the reports coming back — is exercised by
/// tests over an in-memory channel, without a listening socket. The transport carries already serialised
/// JSON so that a test can assert the exact bytes Cloud puts on the wire.
/// </remarks>
internal interface IEngineChannel
{
    /// <summary>
    /// Writes the given envelope text to the Engine.
    /// </summary>
    /// <param name="json">The serialised envelope.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task that completes when the frame has been handed to the transport.</returns>
    Task SendAsync(string json, CancellationToken cancellationToken);
}
