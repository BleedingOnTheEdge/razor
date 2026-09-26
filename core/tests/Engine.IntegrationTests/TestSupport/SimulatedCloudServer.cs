// -----------------------------------------------------------------------------
// <copyright file="SimulatedCloudServer.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.IntegrationTests.TestSupport;

using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Engine.Communication;
using Engine.Core;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

/// <summary>
/// The Cloud half of the protocol, served over a real socket, so the Engine's own client can be driven
/// end to end without the Cloud project.
/// </summary>
/// <remarks>
/// <para>
/// This is not the Cloud. It is the smallest peer that speaks the handshake of 002-020-020 §3.3 in the order
/// that section prescribes: it answers the <c>Auth</c> with an <c>AuthResponse</c> carrying its own ephemeral
/// public key, a nonce and a session identifier, verifies the challenge the Engine returns in
/// <c>AuthConfirm</c> against the session key, and acknowledges it. After that it records every frame the
/// Engine sends and lets a test send whatever the branch under test reads.
/// </para>
/// <para>
/// The session key is derived with the Engine's own key agreement rather than a hand-written copy of it, and
/// the challenge is verified, so a test that reaches the acknowledgement proves both halves agreed on the
/// same key — not merely that two sockets exchanged bytes.
/// </para>
/// </remarks>
internal sealed class SimulatedCloudServer : IAsyncDisposable
{
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(30);

    private readonly WebApplication _application;
    private readonly SecurityManager _security = new();
    private readonly ConcurrentQueue<CloudMessage> _received = new();
    private readonly TaskCompletionSource _handshakeCompleted = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly SemaphoreSlim _sendLock = new(1, 1);
    private WebSocket? _socket;
    private bool _challengeVerified;
    private bool _disposed;

    private SimulatedCloudServer(WebApplication application)
    {
        _application = application;
    }

    /// <summary>Gets the endpoint the Engine has to be pointed at, e.g. <c>ws://127.0.0.1:5000/engine</c>.</summary>
    internal string Endpoint { get; private set; } = string.Empty;

    /// <summary>Gets the session identifier issued in the <c>AuthResponse</c>.</summary>
    internal string? SessionId
    {
        get; private set;
    }

    /// <summary>
    /// Gets a value indicating whether the challenge in the Engine's <c>AuthConfirm</c> verified against the
    /// session key this peer derived.
    /// </summary>
    internal bool ChallengeVerified => _challengeVerified;

    /// <summary>Starts a peer on a free loopback port.</summary>
    /// <returns>The started peer.</returns>
    internal static SimulatedCloudServer Start()
    {
        WebApplicationBuilder builder = WebApplication.CreateSlimBuilder();
        builder.Logging.ClearProviders();

        // Port zero lets the operating system pick a free port, which keeps the tests from colliding with
        // whatever else is running on the machine and needs no port to be reserved in advance.
        builder.WebHost.UseUrls("http://127.0.0.1:0");

        WebApplication application = builder.Build();
        application.UseWebSockets();

        var peer = new SimulatedCloudServer(application);
        application.Run(peer.HandleConnectionAsync);
        application.Start();

        // The address is only known once the server is listening, which is why the endpoint is read here
        // rather than configured up front.
        string address = application.Services
            .GetRequiredService<IServer>()
            .Features
            .Get<IServerAddressesFeature>()?
            .Addresses
            .FirstOrDefault()
            ?? throw new InvalidOperationException("The simulated Cloud did not report a bound address.");

        peer.Endpoint = string.Concat(address.Replace("http://", "ws://", StringComparison.Ordinal), "/engine");
        return peer;
    }

    /// <summary>Waits until the handshake has been acknowledged.</summary>
    /// <param name="timeout">How long to wait; the default is generous so a slow machine does not fail a test
    /// that is merely slow.</param>
    /// <returns>A task that completes when the Engine has been authenticated.</returns>
    internal Task WaitForHandshakeAsync(TimeSpan? timeout = null) =>
        _handshakeCompleted.Task.WaitAsync(timeout ?? DefaultTimeout);

    /// <summary>Sends an encrypted message whose payload the caller supplies.</summary>
    /// <param name="messageType">The message discriminator.</param>
    /// <param name="payload">The payload object, serialised to JSON and encrypted.</param>
    /// <param name="correlationId">The correlation identifier, when the message answers a command.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task that completes when the frame is on the wire.</returns>
    internal async Task SendEncryptedAsync(
        string messageType,
        object? payload,
        string? correlationId = null,
        CancellationToken cancellationToken = default)
    {
        WebSocket socket = _socket ?? throw new InvalidOperationException("The Engine is not connected.");

        await this.SendAsync(
            socket,
            new CloudMessage
            {
                MessageType = messageType,
                Encrypted = true,
                CorrelationId = correlationId,
                Payload = _security.EncryptMessage(JsonSerializer.Serialize(payload))
            },
            cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Waits for a frame of a given type from the Engine.</summary>
    /// <param name="messageType">The discriminator to wait for.</param>
    /// <param name="timeout">How long to wait.</param>
    /// <returns>The message.</returns>
    /// <exception cref="TimeoutException">The Engine never sent one.</exception>
    internal async Task<CloudMessage> WaitForMessageAsync(string messageType, TimeSpan? timeout = null)
    {
        DateTime deadline = DateTime.UtcNow + (timeout ?? DefaultTimeout);

        while (DateTime.UtcNow < deadline)
        {
            CloudMessage? message = _received.FirstOrDefault(candidate => candidate.MessageType == messageType);
            if (message is not null)
            {
                return message;
            }

            await Task.Delay(25).ConfigureAwait(false);
        }

        throw new TimeoutException(
            $"The Engine never sent a {messageType} message; it sent [{string.Join(", ", _received.Select(m => m.MessageType))}].");
    }

    /// <summary>Decrypts the payload of a frame the Engine sent.</summary>
    /// <param name="message">The frame.</param>
    /// <returns>The plaintext payload JSON.</returns>
    internal string DecryptPayload(CloudMessage message) => _security.DecryptMessage((string)message.Payload!);

    /// <inheritdoc/>
    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;

        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await _application.StopAsync(timeout.Token).ConfigureAwait(false);
        await _application.DisposeAsync().ConfigureAwait(false);
        _sendLock.Dispose();
    }

    private async Task HandleConnectionAsync(HttpContext context)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        using WebSocket socket = await context.WebSockets.AcceptWebSocketAsync().ConfigureAwait(false);
        _socket = socket;

        try
        {
            await this.RunConversationAsync(socket, context.RequestAborted).ConfigureAwait(false);
        }
        finally
        {
            _socket = null;
        }
    }

    private async Task RunConversationAsync(WebSocket socket, CancellationToken cancellationToken)
    {
        CloudMessage? auth = await ReceiveAsync(socket, cancellationToken).ConfigureAwait(false);
        if (auth is null || auth.MessageType != "Auth")
        {
            return;
        }

        var authPayload = (Dictionary<string, object>)auth.Payload!;

        // 002-020-020 §3.3 steps 1-2: the Engine's ephemeral key opens the session, and Cloud answers with its
        // own key, a nonce for deriving the session key, and the session identifier.
        string nonce = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        _security.SetCloudPublicKey((string)authPayload["PublicKey"]);
        _security.SetNonce(nonce);
        _security.DeriveSharedSecret();
        SessionId = Guid.NewGuid().ToString();

        await this.SendAsync(
            socket,
            new CloudMessage
            {
                MessageType = "AuthResponse",
                Encrypted = false,
                Payload = new
                {
                    Status = "Success",
                    PublicKey = _security.GetPublicKey(),
                    Nonce = nonce,
                    SessionId,
                    RequiredCapabilities = Array.Empty<int>()
                }
            },
            cancellationToken).ConfigureAwait(false);

        CloudMessage? confirm = await ReceiveAsync(socket, cancellationToken).ConfigureAwait(false);
        if (confirm is null)
        {
            return;
        }

        // Step 3-5: an AuthConfirm whose challenge is the nonce signed with the session key proves the Engine
        // derived the same key. A peer that only echoed the frame would not notice a mismatch.
        using (JsonDocument challengeDocument = JsonDocument.Parse(_security.DecryptMessage((string)confirm.Payload!)))
        {
            string challenge = challengeDocument.RootElement.GetProperty("Challenge").GetString()!;
            _challengeVerified = challenge == _security.GenerateChallenge(nonce);
        }

        await this.SendAsync(
            socket,
            new CloudMessage
            {
                MessageType = "AuthAck",
                Encrypted = true,
                Payload = _security.EncryptMessage("{}")
            },
            cancellationToken).ConfigureAwait(false);

        _handshakeCompleted.TrySetResult();

        while (!cancellationToken.IsCancellationRequested)
        {
            CloudMessage? message = await ReceiveAsync(socket, cancellationToken).ConfigureAwait(false);
            if (message is null)
            {
                return;
            }

            _received.Enqueue(message);
        }
    }

    private async Task SendAsync(WebSocket socket, CloudMessage message, CancellationToken cancellationToken)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));

        await _sendLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await socket
                .SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, cancellationToken)
                .ConfigureAwait(false);
        }
        finally
        {
            _sendLock.Release();
        }
    }

    private static async Task<CloudMessage?> ReceiveAsync(WebSocket socket, CancellationToken cancellationToken)
    {
        var frame = new StringBuilder();
        byte[] buffer = new byte[8192];

        while (true)
        {
            WebSocketReceiveResult result = await socket
                .ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken)
                .ConfigureAwait(false);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                return null;
            }

            frame.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
            if (result.EndOfMessage)
            {
                return JsonSerializer.Deserialize<CloudMessage>(frame.ToString());
            }
        }
    }
}
