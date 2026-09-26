// -----------------------------------------------------------------------------
// <copyright file="EngineSession.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Engine;

using System.Security.Cryptography;
using System.Text.Json;
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
internal sealed class EngineSession : IDisposable
{
    private readonly IEngineChannel _channel;
    private readonly EngineAuthenticationService _authentication;
    private readonly HeartbeatService _heartbeat;
    private readonly InstanceManifestService _manifest;
    private readonly ProfileService _profile;
    private readonly CommandService _commands;
    private readonly CloudOptions _options;
    private readonly TimeProvider _timeProvider;
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
    internal EngineSession(
        IEngineChannel channel,
        EngineAuthenticationService authentication,
        HeartbeatService heartbeat,
        InstanceManifestService manifest,
        ProfileService profile,
        CommandService commands,
        CloudOptions options,
        TimeProvider timeProvider,
        ILogger<EngineSession> logger)
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

    private static Dictionary<string, object?> BuildCommandPayload(Data.EngineCommand command)
    {
        Dictionary<string, object?> payload = new(StringComparer.Ordinal)
        {
            ["CommandId"] = command.NumericCommandId,
            ["CommandType"] = command.CommandType
        };

        if (command.ParametersJson is not null)
        {
            payload["Parameters"] = JsonSerializer.Deserialize<JsonElement>(command.ParametersJson);
        }

        if (command.TimeoutSeconds is int timeout)
        {
            payload["TimeoutSeconds"] = timeout;
        }

        return payload;
    }

    private EngineSessionSignal Ignore(string messageType)
    {
        CloudLog.UnhandledMessageType(_logger, messageType);
        return EngineSessionSignal.Continue;
    }

    private async Task<EngineSessionSignal> HandleHandshakePhaseAsync(
        CloudMessage message,
        CancellationToken cancellationToken)
    {
        // The AuthConfirm is the only encrypted frame before the session is fully established; everything
        // else in this phase is the unencrypted Auth that opens it.
        if (_pendingInstanceId is not null)
        {
            return string.Equals(message.MessageType, CloudProtocol.MessageType.AuthConfirm, StringComparison.Ordinal)
                ? await HandleAuthConfirmAsync(message, cancellationToken).ConfigureAwait(false)
                : Ignore(message.MessageType);
        }

        if (!string.Equals(message.MessageType, CloudProtocol.MessageType.Auth, StringComparison.Ordinal))
        {
            CloudLog.OutOfOrderMessage(_logger, message.MessageType, authenticated: false);
            return EngineSessionSignal.Continue;
        }

        if (message.Encrypted || message.Payload is not JsonElement payload || payload.ValueKind != JsonValueKind.Object)
        {
            CloudLog.OutOfOrderMessage(_logger, message.MessageType, authenticated: false);
            return EngineSessionSignal.Continue;
        }

        var credentials = new EngineCredentials(
            payload.ReadString("Username"),
            payload.ReadString("Password"),
            payload.ReadString("InstanceApiKey"),
            payload.ReadString("EngineVersion"),
            payload.ReadInt32Array("ClientCapabilities"),
            payload.ReadString("PublicKey"));

        AuthenticationOutcome outcome = await _authentication
            .AuthenticateAsync(credentials, cancellationToken)
            .ConfigureAwait(false);

        if (!outcome.Succeeded || outcome.Instance is null)
        {
            string reason = outcome.FailureReason ?? "Authentication failed.";
            CloudLog.AuthenticationRejected(_logger, reason);
            await SendPlaintextAsync(
                CloudProtocol.MessageType.AuthResponse,
                new { Status = "Failure", ErrorMessage = reason },
                cancellationToken).ConfigureAwait(false);

            return EngineSessionSignal.Close;
        }

        var cipher = new SessionCipher();
        string nonce = SessionCipher.CreateNonce();
        try
        {
            if (string.IsNullOrWhiteSpace(credentials.EnginePublicKey))
            {
                throw new FormatException("The Auth payload did not carry a PublicKey.");
            }

            cipher.EstablishSession(credentials.EnginePublicKey, nonce);
        }
        catch (Exception exception) when (exception is CryptographicException or FormatException)
        {
            cipher.Dispose();
            CloudLog.AuthenticationRejected(_logger, "The Engine's public key could not be used for key agreement.");
            await SendPlaintextAsync(
                CloudProtocol.MessageType.AuthResponse,
                new { Status = "Failure", ErrorMessage = "The Engine public key is not a usable NIST P-256 key." },
                cancellationToken).ConfigureAwait(false);

            return EngineSessionSignal.Close;
        }

        _cipher = cipher;
        _nonce = nonce;
        _sessionId = Guid.NewGuid().ToString();
        _pendingInstanceId = outcome.Instance.Id;

        await SendPlaintextAsync(
            CloudProtocol.MessageType.AuthResponse,
            new
            {
                Status = "Success",
                PublicKey = cipher.GetPublicKey(),
                Nonce = nonce,
                SessionId = _sessionId,
                RequiredCapabilities = _options.RequiredCapabilities
            },
            cancellationToken).ConfigureAwait(false);

        return EngineSessionSignal.Continue;
    }

    private async Task<EngineSessionSignal> HandleAuthConfirmAsync(
        CloudMessage message,
        CancellationToken cancellationToken)
    {
        DecryptedMessage? decrypted = TryDecrypt(message);
        if (decrypted is null)
        {
            return EngineSessionSignal.Close;
        }

        _lastInboundSequence = decrypted.Sequence;

        using JsonDocument payload = JsonDocument.Parse(decrypted.Json);
        string? challenge = payload.RootElement.ReadString("Challenge");

        if (challenge is null || _nonce is null || _cipher is null || !_cipher.VerifyChallenge(_nonce, challenge))
        {
            CloudLog.AuthenticationRejected(_logger, "The AuthConfirm challenge did not verify.");
            return EngineSessionSignal.Close;
        }

        Guid instanceId = _pendingInstanceId!.Value;
        InstanceId = instanceId;
        _pendingInstanceId = null;

        await SendEncryptedAsync(
            CloudProtocol.MessageType.AuthAck,
            new Dictionary<string, object?>(StringComparer.Ordinal),
            correlationId: null,
            cancellationToken).ConfigureAwait(false);

        CloudLog.EngineAuthenticated(_logger, instanceId, message.MessageId);

        // The Engine collects the active extension set and any operator commands as soon as the session is
        // usable, rather than waiting for its next heartbeat.
        await SendPendingCommandsAsync(cancellationToken).ConfigureAwait(false);
        return EngineSessionSignal.Continue;
    }

    private async Task<EngineSessionSignal> HandleHeartbeatAsync(
        JsonElement payload,
        CancellationToken cancellationToken)
    {
        Guid instanceId = InstanceId!.Value;
        string? reportedEngineId = payload.ReadString("EngineId");

        HeartbeatOutcome outcome = await _heartbeat
            .HandleAsync(instanceId, reportedEngineId, cancellationToken)
            .ConfigureAwait(false);

        await SendEncryptedAsync(
            CloudProtocol.MessageType.HeartbeatResponse,
            new Dictionary<string, object?>(StringComparer.Ordinal)
            {
                ["Status"] = outcome.Status,
                ["NextIntervalSeconds"] = outcome.NextIntervalSeconds,
                ["ServerTime"] = outcome.ServerTime,
                ["AuthValid"] = outcome.AuthValid
            },
            correlationId: null,
            cancellationToken).ConfigureAwait(false);

        CloudLog.HeartbeatReceived(_logger, reportedEngineId ?? string.Empty, outcome.Status);

        // A false AuthValid tells the Engine to stop its user tasks; the session is then closed so that the
        // Engine's retry loop re-authenticates instead of continuing on a session Cloud no longer trusts.
        return outcome.AuthValid ? EngineSessionSignal.Continue : EngineSessionSignal.Close;
    }

    private async Task<EngineSessionSignal> HandleCommandProgressAsync(
        CloudMessage message,
        JsonElement payload,
        CancellationToken cancellationToken)
    {
        string correlationId = ReadCorrelationId(message, payload);
        if (correlationId.Length == 0)
        {
            return Ignore(message.MessageType);
        }

        bool recorded = await _commands
            .RecordProgressAsync(InstanceId!.Value, correlationId, payload.GetRawText(), cancellationToken)
            .ConfigureAwait(false);

        if (!recorded)
        {
            CloudLog.ReportNotApplied(_logger, correlationId, message.MessageType);
        }

        return EngineSessionSignal.Continue;
    }

    private async Task<EngineSessionSignal> HandleCommandResponseAsync(
        CloudMessage message,
        JsonElement payload,
        CancellationToken cancellationToken)
    {
        string correlationId = ReadCorrelationId(message, payload);
        if (correlationId.Length == 0)
        {
            return Ignore(message.MessageType);
        }

        // The Engine's dispatcher reports exactly "Success" or "Error" for a completed command.
        string status = payload.ReadString("Status") ?? string.Empty;
        bool succeeded = string.Equals(status, "Success", StringComparison.Ordinal);

        bool recorded = await _commands
            .CompleteAsync(
                InstanceId!.Value,
                correlationId,
                succeeded,
                succeeded ? payload.GetRawText() : null,
                succeeded ? null : payload.ReadString("Error") ?? status,
                cancellationToken)
            .ConfigureAwait(false);

        if (recorded)
        {
            CloudLog.CommandFinished(_logger, correlationId, status);
        }
        else
        {
            CloudLog.ReportNotApplied(_logger, correlationId, message.MessageType);
        }

        return EngineSessionSignal.Continue;
    }

    private async Task<EngineSessionSignal> HandleManifestAsync(
        JsonElement payload,
        CancellationToken cancellationToken)
    {
        Guid instanceId = InstanceId!.Value;

        var report = new EngineManifestReport(
            payload.ReadStringArray("Adapters"),
            payload.ReadStringArray("Strategies"),
            payload.ReadStringArray("Indicators"),
            payload.ReadStringArray("NeuralNetworks"),
            payload.ReadStringArray("HookPlugins"));

        int? stored = await _manifest.ApplyAsync(instanceId, report, cancellationToken).ConfigureAwait(false);
        if (stored is null)
        {
            return EngineSessionSignal.Continue;
        }

        CloudLog.ManifestApplied(_logger, instanceId, stored.Value);

        // 002-030-090 §10.3 step 10: the manifest arrives, and Cloud answers with the user's active set. That
        // set is applied by an ActivateExtensions command, which is queued here and written immediately.
        CommandOutcome? activation = await _profile
            .ApplyActiveSetAsync(instanceId, cancellationToken)
            .ConfigureAwait(false);
        if (activation is { Status: ServiceStatus.Succeeded })
        {
            await SendPendingCommandsAsync(cancellationToken).ConfigureAwait(false);
        }

        return EngineSessionSignal.Continue;
    }

    private static string ReadCorrelationId(CloudMessage message, JsonElement payload)
    {
        return message.CorrelationId ?? payload.ReadString("CorrelationId") ?? string.Empty;
    }

    private DecryptedMessage? TryDecrypt(CloudMessage message)
    {
        if (!message.Encrypted || _cipher is null)
        {
            CloudLog.OutOfOrderMessage(_logger, message.MessageType, authenticated: true);
            return null;
        }

        if (message.Payload is not JsonElement element
            || element.ValueKind != JsonValueKind.String
            || element.GetString() is not string cipherText)
        {
            CloudLog.OutOfOrderMessage(_logger, message.MessageType, authenticated: true);
            return null;
        }

        try
        {
            return _cipher.Decrypt(cipherText);
        }
        catch (Exception exception) when (exception is CryptographicException or FormatException or InvalidOperationException)
        {
            CloudLog.DecryptionFailed(_logger, exception);
            return null;
        }
    }

    private async Task SendPlaintextAsync(string messageType, object? payload, CancellationToken cancellationToken)
    {
        CloudMessage message = CloudMessage.Create(messageType, payload);
        await _channel.SendAsync(JsonSerializer.Serialize(message), cancellationToken).ConfigureAwait(false);
    }

    private async Task SendEncryptedAsync(
        string messageType,
        object payload,
        string? correlationId,
        CancellationToken cancellationToken)
    {
        if (_cipher is null)
        {
            return;
        }

        string cipherText = _cipher.Encrypt(JsonSerializer.Serialize(payload));
        CloudMessage message = CloudMessage.CreateEncrypted(messageType, cipherText, correlationId);
        await _channel.SendAsync(JsonSerializer.Serialize(message), cancellationToken).ConfigureAwait(false);
    }
}
