// -----------------------------------------------------------------------------
// <copyright file="EngineSocketHandler.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Engine;

using System.Net.WebSockets;
using System.Text;
using Cloud.Protocol;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

/// <summary>
/// The WebSocket endpoint an Engine connects to, at the path Cloud publishes for it
/// (002-020-020 §3.1, <c>wss://cloud.Razor.io/engine</c>).
/// </summary>
/// <remarks>
/// The handler is deliberately thin: it owns the socket's lifetime, reassembles the frames of one envelope
/// and hands the text to an <see cref="EngineSession"/>. All protocol behaviour lives in the session, which
/// is where it is tested.
/// </remarks>
internal static class EngineSocketHandler
{
    /// <summary>The path the Engine dials. It must match the Engine's hard-coded endpoint path.</summary>
    internal const string Path = "/engine";

    private const int ReceiveBufferSize = 64 * 1024;

    /// <summary>
    /// Handles one Engine connection for the lifetime of its socket.
    /// </summary>
    /// <param name="context">The HTTP context of the upgrade request.</param>
    /// <returns>A task that completes when the socket has closed.</returns>
    internal static async Task HandleAsync(HttpContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        ILoggerFactory loggerFactory = context.RequestServices.GetRequiredService<ILoggerFactory>();
        ILogger logger = loggerFactory.CreateLogger(typeof(EngineSocketHandler));
        EngineSessionRegistry registry = context.RequestServices.GetRequiredService<EngineSessionRegistry>();

        using WebSocket socket = await context.WebSockets.AcceptWebSocketAsync().ConfigureAwait(false);

        IEngineChannel channel = new WebSocketEngineChannel(socket);
        EngineSession session = ActivatorUtilities.CreateInstance<EngineSession>(context.RequestServices, channel);

        try
        {
            await PumpAsync(context, socket, session, registry, logger).ConfigureAwait(false);
        }
        finally
        {
            if (session.InstanceId is Guid instanceId)
            {
                registry.Unregister(instanceId, session);
            }

            CloudLog.SessionClosed(logger, session.InstanceId);
            session.Dispose();
        }
    }

    private static async Task PumpAsync(
        HttpContext context,
        WebSocket socket,
        EngineSession session,
        EngineSessionRegistry registry,
        ILogger logger)
    {
        byte[] buffer = new byte[ReceiveBufferSize];
        var frame = new StringBuilder();

        while (socket.State == WebSocketState.Open && !context.RequestAborted.IsCancellationRequested)
        {
            ValueWebSocketReceiveResult result;
            try
            {
                result = await socket.ReceiveAsync(new Memory<byte>(buffer), context.RequestAborted).ConfigureAwait(false);
            }
            catch (Exception exception) when (exception is WebSocketException or OperationCanceledException or IOException)
            {
                // An Engine that is switched off, loses its network or is killed mid-frame surfaces here. The
                // receive fault is the whole signal that the conversation is over, so it ends the pump rather
                // than being reported as a server error: the connection is a socket, and a socket ending is an
                // ordinary event. IOException is in the filter because a dropped TCP connection arrives as one
                // ("the remote end closed the connection"), not as a WebSocketException.
                CloudLog.EngineSocketEnded(logger, exception);
                break;
            }

            if (result.MessageType == WebSocketMessageType.Close)
            {
                await socket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None)
                    .ConfigureAwait(false);
                break;
            }

            frame.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
            if (!result.EndOfMessage)
            {
                continue;
            }

            string json = frame.ToString();
            frame.Clear();

            // A command submitted through the management API is delivered by the registry, but a session only
            // becomes reachable once it has authenticated.
            EngineSessionSignal signal = await session.ProcessInboundAsync(json, context.RequestAborted)
                .ConfigureAwait(false);
            if (session.InstanceId is Guid instanceId)
            {
                registry.Register(instanceId, session);
            }

            if (signal == EngineSessionSignal.Close)
            {
                await socket.CloseAsync(
                    WebSocketCloseStatus.NormalClosure,
                    "Session closed",
                    CancellationToken.None).ConfigureAwait(false);
                break;
            }
        }
    }
}

/// <summary>
/// The <see cref="WebSocket"/> backed channel an <see cref="EngineSession"/> writes to.
/// </summary>
/// <remarks>
/// Text frames are sent one envelope at a time with <c>endOfMessage: true</c>, which is how the Engine
/// writes and reads its own messages.
/// </remarks>
internal sealed class WebSocketEngineChannel(WebSocket socket) : IEngineChannel
{
    /// <inheritdoc/>
    public async Task SendAsync(string json, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(json);

        if (socket.State != WebSocketState.Open)
        {
            throw new WebSocketException("The Engine socket is not open.");
        }

        byte[] bytes = Encoding.UTF8.GetBytes(json);
        await socket.SendAsync(
            new ReadOnlyMemory<byte>(bytes),
            WebSocketMessageType.Text,
            endOfMessage: true,
            cancellationToken).ConfigureAwait(false);
    }
}
