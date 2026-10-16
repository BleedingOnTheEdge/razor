// -----------------------------------------------------------------------------
// <copyright file="EngineSession.Handlers.cs" company="BleedingOnTheEdge">
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

internal sealed partial class EngineSession
{
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
                InstanceId = outcome.Instance.Id,
                EngineId = outcome.Instance.EngineId,
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

        if (_eventBroadcaster is not null)
        {
            await _eventBroadcaster.PublishAsync(
                new ClientEvent(
                    "engine_heartbeat",
                    instanceId,
                    null,
                    null,
                    outcome.ServerTime,
                    new { EngineId = reportedEngineId, Status = outcome.Status, AuthValid = outcome.AuthValid }),
                cancellationToken).ConfigureAwait(false);
        }

        if (outcome.AuthValid)
        {
            await SendPendingCommandsAsync(cancellationToken).ConfigureAwait(false);
        }

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

        if (_eventBroadcaster is not null)
        {
            await _eventBroadcaster.PublishAsync(
                new ClientEvent(
                    "command_progress",
                    InstanceId!.Value,
                    null,
                    correlationId,
                    _timeProvider.GetUtcNow(),
                    payload.Clone()),
                cancellationToken).ConfigureAwait(false);
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

        if (_eventBroadcaster is not null)
        {
            var clonedPayload = payload.Clone();
            await _eventBroadcaster.PublishAsync(
                new ClientEvent(
                    "command_completed",
                    InstanceId!.Value,
                    null,
                    correlationId,
                    _timeProvider.GetUtcNow(),
                    new { Status = status, Succeeded = succeeded, Payload = clonedPayload }),
                cancellationToken).ConfigureAwait(false);

            if (succeeded)
            {
                await _eventBroadcaster.PublishAsync(
                    new ClientEvent(
                        "run_status",
                        InstanceId!.Value,
                        null,
                        correlationId,
                        _timeProvider.GetUtcNow(),
                        new { Status = "Completed", CommandStatus = status, Payload = clonedPayload }),
                    cancellationToken).ConfigureAwait(false);
            }
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

        if (_eventBroadcaster is not null)
        {
            await _eventBroadcaster.PublishAsync(
                new ClientEvent(
                    "manifest_updated",
                    instanceId,
                    null,
                    null,
                    _timeProvider.GetUtcNow(),
                    report),
                cancellationToken).ConfigureAwait(false);
        }

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
