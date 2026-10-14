// -----------------------------------------------------------------------------
// <copyright file="EngineSession.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Engine;

using System.Security.Cryptography;
using System.Text.Json;
using Cloud.Events;
using Cloud.Protocol;
using Cloud.Services;
using Microsoft.Extensions.Logging;

/// <summary>
/// What the transport should do after the session has processed a frame.
/// </summary>
internal enum EngineSessionSignal
{
    /// <summary>The conversation may continue.</summary>
    Continue,

    /// <summary>The transport must close the connection.</summary>
    Close
}

/// <summary>
/// One authenticated conversation with an Engine over a single WebSocket, implementing the Cloud half of
/// 002-020-020 §3.3 (handshake), §3.4 (heartbeat) and §3.5 (command execution).
/// </summary>
/// <remarks>
/// <para>
/// The session is a state machine over the message envelope. Before authentication only an unencrypted
/// <c>Auth</c> is meaningful; after the key exchange every frame must be encrypted, and the sequence number
/// embedded in the ciphertext must strictly increase, which is the anti-replay check from §3.3 step 6.
/// </para>
/// <para>
/// Anything the protocol does not define for the current phase — an unknown discriminator, a message out of
/// order, a report for a command Cloud does not know — is logged and dropped rather than answered with an
/// error. The Engine treats an unknown inbound type the same way, and inventing an error frame would put a
/// message on the wire that no Engine release is written to parse.
/// </para>
/// <para>
/// Commands are written as top-level <c>Command</c> messages, and the pending queue is flushed after the
/// handshake completes and after a new command is queued. See <see cref="CommandService"/> for why the
/// heartbeat response is not used as a delivery channel.
/// </para>
/// </remarks>
internal sealed partial class EngineSession : IDisposable
{
    private readonly IEngineChannel _channel;
    private readonly EngineAuthenticationService _authentication;
    private readonly HeartbeatService _heartbeat;
    private readonly InstanceManifestService _manifest;
    private readonly ProfileService _profile;
    private readonly CommandService _commands;
    private readonly CloudOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly IClientEventBroadcaster? _eventBroadcaster;
    private readonly ILogger<EngineSession> _logger;

    private SessionCipher? _cipher;
    private string? _nonce;
    private string? _sessionId;
    private Guid? _pendingInstanceId;
    private ulong _lastInboundSequence;
    private bool _disposed;

    /// <summary>Initialises a new instance of the <see cref="EngineSession"/> class.</summary>
    /// <param name="channel">The transport the session writes to.</param>
    /// <param name="authentication">The credential validator.</param>
    /// <param name="heartbeat">The heartbeat handler.</param>
    /// <param name="manifest">The extension manifest handler.</param>
    /// <param name="profile">The profile service, used to apply an active selection set.</param>
    /// <param name="commands">The command queue.</param>
    /// <param name="options">The Cloud options.</param>
    /// <param name="timeProvider">The clock.</param>
    /// <param name="logger">The logger.</param>
    /// <param name="eventBroadcaster">Optional client event broadcaster for real-time frontend streaming.</param>
    /// <remarks>
    /// The constructor is <c>public</c> because <c>EngineSocketHandler</c> builds a session per connection
    /// through <c>ActivatorUtilities</c>, which — like the service container — only considers public
    /// constructors. The type stays <c>internal</c>, so the widened accessibility is what makes the
    /// connection path constructible without publishing the session.
    /// </remarks>
    public EngineSession(
        IEngineChannel channel,
        EngineAuthenticationService authentication,
        HeartbeatService heartbeat,
        InstanceManifestService manifest,
        ProfileService profile,
        CommandService commands,
        CloudOptions options,
        TimeProvider timeProvider,
        ILogger<EngineSession> logger,
        IClientEventBroadcaster? eventBroadcaster = null)
    {
        _channel = channel;
        _authentication = authentication;
        _heartbeat = heartbeat;
        _manifest = manifest;
        _profile = profile;
        _commands = commands;
        _options = options;
        _timeProvider = timeProvider;
        _logger = logger;
        _eventBroadcaster = eventBroadcaster;
    }

    /// <summary>Gets the Cloud-side identifier of the authenticated instance.</summary>
    internal Guid? InstanceId { get; private set; }

    /// <summary>Gets the session identifier Cloud issued during the handshake.</summary>
    internal string? SessionId => _sessionId;

    /// <summary>
    /// Processes one inbound frame from the Engine.
    /// </summary>
    /// <param name="json">The raw envelope text.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Whether the transport should keep the connection open.</returns>
    internal async Task<EngineSessionSignal> ProcessInboundAsync(string json, CancellationToken cancellationToken)
    {
        CloudMessage? message;
        try
        {
            message = JsonSerializer.Deserialize<CloudMessage>(json);
        }
        catch (JsonException exception)
        {
            CloudLog.MalformedMessage(_logger, exception);
            return EngineSessionSignal.Continue;
        }

        if (message is null)
        {
            return EngineSessionSignal.Continue;
        }

        if (InstanceId is null)
        {
            return await HandleHandshakePhaseAsync(message, cancellationToken).ConfigureAwait(false);
        }

        DecryptedMessage? decrypted = TryDecrypt(message);
        if (decrypted is null)
        {
            return EngineSessionSignal.Close;
        }

        if (decrypted.Sequence <= _lastInboundSequence)
        {
            // A repeated or reordered sequence number is exactly the replay the sequence exists to stop.
            CloudLog.OutOfOrderMessage(_logger, message.MessageType, authenticated: true);
            return EngineSessionSignal.Close;
        }

        _lastInboundSequence = decrypted.Sequence;
        using JsonDocument payload = JsonDocument.Parse(decrypted.Json);

        return message.MessageType switch
        {
            CloudProtocol.MessageType.Heartbeat => await HandleHeartbeatAsync(payload.RootElement, cancellationToken)
                .ConfigureAwait(false),
            CloudProtocol.MessageType.CommandProgress => await HandleCommandProgressAsync(message, payload.RootElement, cancellationToken)
                .ConfigureAwait(false),
            CloudProtocol.MessageType.CommandResponse => await HandleCommandResponseAsync(message, payload.RootElement, cancellationToken)
                .ConfigureAwait(false),
            CloudProtocol.MessageType.ExtensionManifest => await HandleManifestAsync(payload.RootElement, cancellationToken)
                .ConfigureAwait(false),
            _ => Ignore(message.MessageType)
        };
    }

    /// <summary>
    /// Writes every command queued for this instance that has never been delivered.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task that completes when the batch has been written and recorded.</returns>
    /// <remarks>
    /// Delivery is idempotent from the caller's point of view: only commands still in the pending state are
    /// taken, and they are marked dispatched only after the write succeeds, so a failed connection leaves
    /// the queue untouched for the next attempt.
    /// </remarks>
    internal async Task SendPendingCommandsAsync(CancellationToken cancellationToken)
    {
        if (InstanceId is not Guid instanceId || _cipher is null)
        {
            return;
        }

        IReadOnlyList<Data.EngineCommand> pending = await _commands
            .TakeUndeliveredAsync(instanceId, cancellationToken)
            .ConfigureAwait(false);
        if (pending.Count == 0)
        {
            return;
        }

        List<Guid> written = [];
        foreach (Data.EngineCommand command in pending)
        {
            await SendEncryptedAsync(
                CloudProtocol.MessageType.Command,
                BuildCommandPayload(command),
                command.CorrelationId,
                cancellationToken).ConfigureAwait(false);

            written.Add(command.Id);
            CloudLog.CommandDispatched(_logger, command.CorrelationId, command.CommandType);
        }

        await _commands.MarkDispatchedAsync(written, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _cipher?.Dispose();
        GC.SuppressFinalize(this);
    }

}
