// -----------------------------------------------------------------------------
// <copyright file="CloudSessionHarness.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests.TestSupport;

using System.Text.Json;
using Cloud;
using Cloud.Data;
using Cloud.Engine;
using Cloud.Protocol;
using Cloud.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Wires an <see cref="EnginePeer"/> to an <see cref="EngineSession"/> so a test can drive a whole protocol
/// conversation, and asserts on both what the Engine sent and what Cloud wrote back.
/// </summary>
internal sealed class CloudSessionHarness : IDisposable
{
    private readonly CloudTestDatabase _database;
    private string? _instanceApiKey;
    private Guid _instanceId;

    /// <summary>Initialises a new instance of the <see cref="CloudSessionHarness"/> class.</summary>
    /// <param name="database">The store the Cloud services use.</param>
    /// <param name="options">The Cloud options, when a test needs non-default behaviour.</param>
    internal CloudSessionHarness(CloudTestDatabase database, CloudOptions? options = null)
    {
        _database = database;
        Time = new TestTimeProvider(DateTimeOffset.UnixEpoch);
        Options = options ?? new CloudOptions { ManagementApiKey = "test-key", ConnectionString = "unused" };
        Channel = new RecordingEngineChannel();
        Peer = new EnginePeer();

        Commands = new CommandService(database, Options, Time, NullLogger<CommandService>.Instance);
        Profiles = new ProfileService(database, Commands, Options);
        Manifests = new InstanceManifestService(database, Time);
        Registration = new EngineRegistrationService(database, Time);
        Heartbeats = new HeartbeatService(database, Commands, Options, Time);
        Authentication = new EngineAuthenticationService(
            database,
            Options,
            new PasswordHasher<User>(),
            Time);

        Session = new EngineSession(
            Channel,
            Authentication,
            Heartbeats,
            Manifests,
            Profiles,
            Commands,
            Options,
            Time,
            NullLogger<EngineSession>.Instance);
    }

    /// <summary>Gets the channel Cloud writes to.</summary>
    internal RecordingEngineChannel Channel { get; }

    /// <summary>Gets the Engine-side protocol participant.</summary>
    internal EnginePeer Peer { get; }

    /// <summary>Gets the session under test.</summary>
    internal EngineSession Session { get; }

    /// <summary>Gets the command service.</summary>
    internal CommandService Commands { get; }

    /// <summary>Gets the profile service.</summary>
    internal ProfileService Profiles { get; }

    /// <summary>Gets the manifest service.</summary>
    internal InstanceManifestService Manifests { get; }

    /// <summary>Gets the registration service.</summary>
    internal EngineRegistrationService Registration { get; }

    /// <summary>Gets the heartbeat service.</summary>
    internal HeartbeatService Heartbeats { get; }

    /// <summary>Gets the authentication service.</summary>
    internal EngineAuthenticationService Authentication { get; }

    /// <summary>Gets the controllable clock.</summary>
    internal TestTimeProvider Time { get; }

    /// <summary>Gets the Cloud options in force.</summary>
    internal CloudOptions Options { get; }

    /// <summary>Gets the Cloud-side identifier of the registered instance.</summary>
    internal Guid InstanceId => _instanceId;

    /// <summary>Gets the API key issued at registration.</summary>
    internal string InstanceApiKey => _instanceApiKey!;

    /// <summary>
    /// Registers an instance for a seeded account and returns it.
    /// </summary>
    /// <param name="account">The seeded account.</param>
    /// <param name="engineId">The Engine identifier to register.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The registration outcome.</returns>
    internal async Task<RegistrationOutcome> RegisterAsync(
        SeededAccount account,
        string engineId = "engine-1",
        CancellationToken cancellationToken = default)
    {
        RegistrationOutcome outcome = await Registration
            .RegisterAsync(account.AccountId, account.LicenseId, engineId, "test instance", cancellationToken)
            .ConfigureAwait(false);

        _instanceId = outcome.Instance!.Id;
        _instanceApiKey = outcome.ApiKey!;
        return outcome;
    }

    /// <summary>
    /// Runs the full handshake as the Engine would, and returns the last signal Cloud produced.
    /// </summary>
    /// <param name="userName">The user name to authenticate with.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The result of processing Cloud's <c>AuthAck</c>.</returns>
    internal async Task<EngineSessionSignal> HandshakeAsync(
        string userName = "operator",
        CancellationToken cancellationToken = default)
    {
        EngineSessionSignal signal = await SendAsync(
            Peer.BuildAuth(userName, CloudTestDatabase.Password, InstanceApiKey, [100, 101]),
            cancellationToken).ConfigureAwait(false);

        CloudMessage response = Channel.LastOfType(CloudProtocol.MessageType.AuthResponse)
            ?? throw new InvalidOperationException("Cloud did not answer the Auth message.");

        using JsonDocument payload = JsonDocument.Parse(response.Payload!.Value.GetRawText());
        string cloudPublicKey = payload.RootElement.GetProperty("PublicKey").GetString()!;
        string nonce = payload.RootElement.GetProperty("Nonce").GetString()!;
        string sessionId = payload.RootElement.GetProperty("SessionId").GetString()!;

        Peer.EstablishSession(cloudPublicKey, nonce);

        string confirm = Peer.BuildEncrypted(
            CloudProtocol.MessageType.AuthConfirm,
            JsonSerializer.Serialize(new { Challenge = Peer.ComputeChallenge(nonce) }));

        // The peer records the session identifier Cloud issued so a test can compare it with what Cloud stored.
        Peer.RecordSessionId(sessionId);

        return await SendAsync(confirm, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Drives one inbound envelope through the session.</summary>
    /// <param name="json">The serialised envelope.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The signal the session produced.</returns>
    internal Task<EngineSessionSignal> SendAsync(string json, CancellationToken cancellationToken = default)
    {
        return Session.ProcessInboundAsync(json, cancellationToken);
    }

    /// <summary>Builds and sends an Engine heartbeat.</summary>
    /// <param name="engineId">The Engine identifier to report.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The signal the session produced.</returns>
    internal Task<EngineSessionSignal> SendHeartbeatAsync(
        string engineId = "engine-1",
        CancellationToken cancellationToken = default)
    {
        string payload = JsonSerializer.Serialize(new
        {
            EngineId = engineId,
            LocalTimestamp = DateTimeOffset.UnixEpoch,
            Health = new { CpuUsage = 1.0, MemoryUsage = 1024L, TasksRunning = 0, LiveTickAge = 0 }
        });

        return SendAsync(Peer.BuildEncrypted(CloudProtocol.MessageType.Heartbeat, payload), cancellationToken);
    }

    /// <summary>Builds and sends an Engine extension manifest.</summary>
    /// <param name="adapters">The reported adapters.</param>
    /// <param name="strategies">The reported strategies.</param>
    /// <param name="indicators">The reported indicators.</param>
    /// <param name="hookPlugins">The reported hook plugins.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The signal the session produced.</returns>
    internal Task<EngineSessionSignal> SendManifestAsync(
        string[]? adapters = null,
        string[]? strategies = null,
        string[]? indicators = null,
        string[]? hookPlugins = null,
        CancellationToken cancellationToken = default)
    {
        string payload = JsonSerializer.Serialize(new
        {
            Adapters = adapters ?? [],
            Strategies = strategies ?? [],
            Indicators = indicators ?? [],
            NeuralNetworks = Array.Empty<string>(),
            HookPlugins = hookPlugins ?? [],
            ActiveExtensions = Array.Empty<string>()
        });

        return SendAsync(Peer.BuildEncrypted(CloudProtocol.MessageType.ExtensionManifest, payload), cancellationToken);
    }

    /// <summary>Builds and sends a command outcome as the Engine's dispatcher would.</summary>
    /// <param name="correlationId">The correlation identifier Cloud sent on the command.</param>
    /// <param name="succeeded">Whether the Engine reports success.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The signal the session produced.</returns>
    internal Task<EngineSessionSignal> SendCommandResponseAsync(
        string correlationId,
        bool succeeded = true,
        CancellationToken cancellationToken = default)
    {
        string payload = JsonSerializer.Serialize(new
        {
            CommandId = 1404,
            Status = succeeded ? "Success" : "Error",
            Result = succeeded ? new { Message = "done" } : null,
            Error = succeeded ? null : "activation failed"
        });

        return SendAsync(
            Peer.BuildEncrypted(CloudProtocol.MessageType.CommandResponse, payload, correlationId),
            cancellationToken);
    }

    /// <summary>Builds and sends an interim progress report.</summary>
    /// <param name="correlationId">The correlation identifier Cloud sent on the command.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The signal the session produced.</returns>
    internal Task<EngineSessionSignal> SendCommandProgressAsync(
        string correlationId,
        CancellationToken cancellationToken = default)
    {
        string payload = JsonSerializer.Serialize(new { Percent = 50 });
        return SendAsync(
            Peer.BuildEncrypted(CloudProtocol.MessageType.CommandProgress, payload, correlationId),
            cancellationToken);
    }

    /// <summary>Reads and decrypts the payload of the last envelope of a type.</summary>
    /// <param name="messageType">The discriminator to look for.</param>
    /// <returns>The decrypted payload text.</returns>
    internal string DecryptLastPayload(string messageType)
    {
        CloudMessage message = Channel.LastOfType(messageType)
            ?? throw new InvalidOperationException($"Cloud never wrote a {messageType} message.");
        return Peer.Decrypt(message.Payload!.Value.GetString()!);
    }

    /// <inheritdoc/>
    public void Dispose()
    {
        Session.Dispose();
        Peer.Dispose();
    }
}
