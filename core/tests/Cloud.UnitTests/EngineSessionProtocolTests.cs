// -----------------------------------------------------------------------------
// <copyright file="EngineSessionProtocolTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Text.Json;
using Cloud.Data;
using Cloud.Engine;
using Cloud.Protocol;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Tests of the whole protocol conversation through <see cref="EngineSession"/>, driven by an Engine-side
/// peer that implements the protocol independently. These are the tests that show Cloud is usable by the
/// Engine rather than merely plausible.
/// </summary>
public sealed class EngineSessionProtocolTests
{
    [Fact]
    public async Task Handshake_CompletesAndIssuesASessionTheEngineCanConfirm()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);

        EngineSessionSignal signal = await harness.HandshakeAsync().ConfigureAwait(true);

        Assert.Equal(EngineSessionSignal.Continue, signal);
        Assert.Equal(harness.InstanceId, harness.Session.InstanceId);
        Assert.NotNull(harness.Session.SessionId);
        Assert.Equal(harness.Session.SessionId, harness.Peer.SessionId);

        // A message must be readable by the Engine: the handshake is only complete if the peer could derive
        // the same session key and answer the challenge.
        Assert.NotNull(harness.Channel.LastOfType(CloudProtocol.MessageType.AuthAck));
    }

    [Fact]
    public async Task Handshake_AnswersWithTheFieldsTheEngineReads()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);

        await harness.HandshakeAsync().ConfigureAwait(true);

        string payloadJson = harness.Channel.LastPayloadJson(CloudProtocol.MessageType.AuthResponse)!;
        using JsonDocument document = JsonDocument.Parse(payloadJson);
        JsonElement payload = document.RootElement;

        Assert.Equal("Success", payload.GetProperty("Status").GetString());
        Assert.False(string.IsNullOrWhiteSpace(payload.GetProperty("PublicKey").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(payload.GetProperty("Nonce").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(payload.GetProperty("SessionId").GetString()));
        Assert.Equal(JsonValueKind.Array, payload.GetProperty("RequiredCapabilities").ValueKind);
    }

    [Fact]
    public async Task Handshake_IsPlaintextSoTheEngineCanReadItBeforeAnyKeyExists()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        CloudMessage authResponse = harness.Channel.LastOfType(CloudProtocol.MessageType.AuthResponse)!;

        // The Engine only decrypts when Encrypted is set, so an encrypted AuthResponse would be unreadable.
        Assert.False(authResponse.Encrypted);
        Assert.Equal(JsonValueKind.Object, authResponse.Payload!.Value.ValueKind);
    }

    [Fact]
    public async Task Handshake_AndEverythingAfterIt_IsEncrypted()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);
        await harness.SendHeartbeatAsync().ConfigureAwait(true);

        CloudMessage ack = harness.Channel.LastOfType(CloudProtocol.MessageType.AuthAck)!;
        CloudMessage heartbeat = harness.Channel.LastOfType(CloudProtocol.MessageType.HeartbeatResponse)!;

        Assert.True(ack.Encrypted);
        Assert.Equal(JsonValueKind.String, ack.Payload!.Value.ValueKind);
        Assert.True(heartbeat.Encrypted);
    }

    [Fact]
    public async Task Handshake_RejectsBadCredentialsWithTheEnginesOwnFailureField()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);

        string auth = harness.Peer.BuildAuth(account.UserName, "the-wrong-password", harness.InstanceApiKey, [100, 101]);
        EngineSessionSignal signal = await harness.SendAsync(auth).ConfigureAwait(true);

        Assert.Equal(EngineSessionSignal.Close, signal);
        Assert.Null(harness.Session.InstanceId);

        string payloadJson = harness.Channel.LastPayloadJson(CloudProtocol.MessageType.AuthResponse)!;
        using JsonDocument document = JsonDocument.Parse(payloadJson);

        // The Engine reads Status and ErrorMessage; both must be present for it to report a useful error.
        Assert.Equal("Failure", document.RootElement.GetProperty("Status").GetString());
        Assert.False(string.IsNullOrWhiteSpace(document.RootElement.GetProperty("ErrorMessage").GetString()));
    }

    [Fact]
    public async Task Handshake_RejectsAChallengeThatDoesNotProveKeyAgreement()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);

        await harness.SendAsync(harness.Peer.BuildAuth(account.UserName, CloudTestDatabase.Password, harness.InstanceApiKey, [100]))
            .ConfigureAwait(true);

        CloudMessage response = harness.Channel.LastOfType(CloudProtocol.MessageType.AuthResponse)!;
        using JsonDocument payload = JsonDocument.Parse(response.Payload!.Value.GetRawText());
        harness.Peer.EstablishSession(
            payload.RootElement.GetProperty("PublicKey").GetString()!,
            payload.RootElement.GetProperty("Nonce").GetString()!);

        string confirm = harness.Peer.BuildEncrypted(
            CloudProtocol.MessageType.AuthConfirm,
            JsonSerializer.Serialize(new
            {
                Challenge = "not-the-right-challenge"
            }));

        Assert.Equal(EngineSessionSignal.Close, await harness.SendAsync(confirm).ConfigureAwait(true));
        Assert.Null(harness.Session.InstanceId);
    }

    [Fact]
    public async Task Handshake_IgnoresAMessageThatIsNotAnAuthBeforeAuthentication()
    {
        using var database = new CloudTestDatabase();
        using var harness = new CloudSessionHarness(database);

        // An unauthenticated session has nothing to answer this with, and must not crash on it. The frame is
        // built directly because the peer cannot encrypt anything before a session key exists.
        string heartbeat = System.Text.Json.JsonSerializer.Serialize(
            CloudMessage.Create(CloudProtocol.MessageType.Heartbeat, new
            {
                EngineId = "engine-1"
            }));

        EngineSessionSignal signal = await harness.SendAsync(heartbeat).ConfigureAwait(true);

        Assert.Equal(EngineSessionSignal.Continue, signal);
        Assert.Empty(harness.Channel.Sent);
    }

    [Fact]
    public async Task Handshake_IgnoresAMalformedEnvelope()
    {
        using var database = new CloudTestDatabase();
        using var harness = new CloudSessionHarness(database);

        Assert.Equal(EngineSessionSignal.Continue, await harness.SendAsync("this is not json").ConfigureAwait(true));
        Assert.Empty(harness.Channel.Sent);
    }

    [Fact]
    public async Task Heartbeat_AnswersOkInAPayloadTheEngineCanRead()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        EngineSessionSignal signal = await harness.SendHeartbeatAsync().ConfigureAwait(true);

        Assert.Equal(EngineSessionSignal.Continue, signal);

        using JsonDocument document = JsonDocument.Parse(harness.DecryptLastPayload(CloudProtocol.MessageType.HeartbeatResponse));
        JsonElement payload = document.RootElement;

        Assert.Equal("OK", payload.GetProperty("Status").GetString());
        Assert.True(payload.GetProperty("AuthValid").GetBoolean());
        Assert.Equal(harness.Options.HeartbeatIntervalSeconds, payload.GetProperty("NextIntervalSeconds").GetInt32());
        Assert.True(payload.TryGetProperty("ServerTime", out _));
    }

    [Fact]
    public async Task Heartbeat_RecordsTheInstanceAsSeen()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        harness.Time.Advance(TimeSpan.FromMinutes(2));
        await harness.SendHeartbeatAsync().ConfigureAwait(true);

        using CloudDbContext context = database.CreateDbContext();
        EngineInstance instance = await context.EngineInstances
            .SingleAsync(row => row.Id == harness.InstanceId)
            .ConfigureAwait(true);

        Assert.Equal(harness.Time.GetUtcNow(), instance.LastSeenAt);
    }

    [Fact]
    public async Task Heartbeat_ClosesTheSessionWhenTheEngineIdDoesNotMatchTheAuthenticatedInstance()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        EngineSessionSignal signal = await harness.SendHeartbeatAsync("an-impostor").ConfigureAwait(true);

        Assert.Equal(EngineSessionSignal.Close, signal);

        using JsonDocument document = JsonDocument.Parse(harness.DecryptLastPayload(CloudProtocol.MessageType.HeartbeatResponse));

        // The Engine is told to stop its user tasks before the socket is closed.
        Assert.False(document.RootElement.GetProperty("AuthValid").GetBoolean());
        Assert.Equal("Lock", document.RootElement.GetProperty("Status").GetString());
    }

    [Fact]
    public async Task InboundEncryptedFrames_MustCarryAStrictlyIncreasingSequenceNumber()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        string firstHeartbeat = harness.Peer.BuildEncrypted(
            CloudProtocol.MessageType.Heartbeat,
            JsonSerializer.Serialize(new
            {
                EngineId = "engine-1"
            }));

        Assert.Equal(EngineSessionSignal.Continue, await harness.SendAsync(firstHeartbeat).ConfigureAwait(true));

        // Replaying the identical frame is exactly the attack the sequence number exists to stop.
        Assert.Equal(EngineSessionSignal.Close, await harness.SendAsync(firstHeartbeat).ConfigureAwait(true));
    }

    [Fact]
    public async Task InboundFrames_ThatCannotBeDecryptedCloseTheSession()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        CloudMessage forged = CloudMessage.CreateEncrypted(
            CloudProtocol.MessageType.Heartbeat,
            Convert.ToBase64String([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]));

        Assert.Equal(
            EngineSessionSignal.Close,
            await harness.SendAsync(JsonSerializer.Serialize(forged)).ConfigureAwait(true));
    }

    [Fact]
    public async Task InboundFrames_ThatArriveInClearAfterTheHandshakeCloseTheSession()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        // After the handshake the protocol is encrypted end to end, so a plaintext message is a violation.
        string plaintext = JsonSerializer.Serialize(
            CloudMessage.Create(CloudProtocol.MessageType.Heartbeat, new
            {
                EngineId = "engine-1"
            }));

        Assert.Equal(EngineSessionSignal.Close, await harness.SendAsync(plaintext).ConfigureAwait(true));
    }

    [Fact]
    public async Task Manifest_IsStoredAndReportedBackThroughTheInstancesState()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        await harness.SendManifestAsync(["AdapterA"], ["StrategyA"], ["IndicatorA"], ["HookA"]).ConfigureAwait(true);

        InstanceStateSnapshot snapshot = (await harness.Profiles
            .GetInstanceStateAsync(harness.InstanceId, CancellationToken.None)
            .ConfigureAwait(true))!;

        Assert.Contains(snapshot.Manifest, entry => entry.Kind == ExtensionKind.Adapter && entry.Name == "AdapterA");
        Assert.Contains(snapshot.Manifest, entry => entry.Kind == ExtensionKind.HookPlugin && entry.Name == "HookA");
        Assert.Equal(4, snapshot.Manifest.Count);
    }

    [Fact]
    public async Task Manifest_AppliesTheStoredActiveSetWithAnActivateExtensionsCommand()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        // The operator first records what the Engine reported, then selects from it.
        await harness.SendManifestAsync(["AdapterA"], ["StrategyA"], ["IndicatorA"], ["HookA"]).ConfigureAwait(true);
        await harness.Profiles.SetSelectionAsync(harness.InstanceId, ExtensionKind.Adapter, "AdapterA", true, CancellationToken.None).ConfigureAwait(true);
        await harness.Profiles.SetSelectionAsync(harness.InstanceId, ExtensionKind.Strategy, "StrategyA", true, CancellationToken.None).ConfigureAwait(true);
        await harness.Profiles.SetSelectionAsync(harness.InstanceId, ExtensionKind.HookPlugin, "HookA", true, CancellationToken.None).ConfigureAwait(true);

        // A fresh report is what makes Cloud answer with the active set (002-030-090 10.3 step 10).
        await harness.SendManifestAsync(["AdapterA"], ["StrategyA"], ["IndicatorA"], ["HookA"]).ConfigureAwait(true);

        CloudMessage command = harness.Channel.LastOfType(CloudProtocol.MessageType.Command)
            ?? throw new InvalidOperationException("Cloud did not apply the active set to the Engine.");

        Assert.True(command.Encrypted);
        Assert.False(string.IsNullOrWhiteSpace(command.CorrelationId));

        using JsonDocument document = JsonDocument.Parse(harness.Peer.Decrypt(command.Payload!.Value.GetString()!));
        JsonElement payload = document.RootElement;

        Assert.Equal(1404, payload.GetProperty("CommandId").GetInt32());
        Assert.Equal("ActivateExtensions", payload.GetProperty("CommandType").GetString());
        Assert.Equal("AdapterA", payload.GetProperty("Parameters").GetProperty("Adapter").GetString());
        Assert.Equal("StrategyA", payload.GetProperty("Parameters").GetProperty("Strategy").GetString());
        Assert.Equal("HookA", payload.GetProperty("Parameters").GetProperty("Hooks")[0].GetString());
    }

    [Fact]
    public async Task Manifest_DoesNotCommandTheEngineUntilBothAnAdapterAndAStrategyAreSelected()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        await harness.SendManifestAsync(["AdapterA"], ["StrategyA"]).ConfigureAwait(true);

        // With nothing selected there is no active set to apply, and the Engine's handler would reject an
        // incomplete one, so Cloud must send nothing.
        Assert.Null(harness.Channel.LastOfType(CloudProtocol.MessageType.Command));
    }

    [Fact]
    public async Task Command_ResultFromTheEngineClosesOutTheQueuedCommand()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        CommandOutcome submitted = await harness.Commands
            .SubmitAsync(harness.InstanceId, 1404, "ActivateExtensions", "{}", 60, CancellationToken.None)
            .ConfigureAwait(true);
        await harness.Session.SendPendingCommandsAsync(CancellationToken.None).ConfigureAwait(true);

        CloudMessage command = harness.Channel.LastOfType(CloudProtocol.MessageType.Command)!;
        await harness.SendCommandProgressAsync(command.CorrelationId!).ConfigureAwait(true);
        await harness.SendCommandResponseAsync(command.CorrelationId!).ConfigureAwait(true);

        EngineCommand stored = (await harness.Commands
            .GetAsync(submitted.Command!.Id, CancellationToken.None)
            .ConfigureAwait(true))!;

        Assert.Equal(CommandStatus.Completed, stored.Status);
        Assert.Single(stored.ProgressReports);
        Assert.Contains("done", stored.ResultPayloadJson!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Command_FailureFromTheEngineIsRecordedWithItsError()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        CommandOutcome submitted = await harness.Commands
            .SubmitAsync(harness.InstanceId, 1404, "ActivateExtensions", null, 60, CancellationToken.None)
            .ConfigureAwait(true);
        await harness.Session.SendPendingCommandsAsync(CancellationToken.None).ConfigureAwait(true);

        CloudMessage command = harness.Channel.LastOfType(CloudProtocol.MessageType.Command)!;
        await harness.SendCommandResponseAsync(command.CorrelationId!, succeeded: false).ConfigureAwait(true);

        EngineCommand stored = (await harness.Commands
            .GetAsync(submitted.Command!.Id, CancellationToken.None)
            .ConfigureAwait(true))!;

        Assert.Equal(CommandStatus.Failed, stored.Status);
        Assert.Equal("activation failed", stored.ErrorMessage);
    }

    [Fact]
    public async Task Command_IsWrittenOnlyOnceEvenWhenDeliveryIsAttemptedRepeatedly()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        await harness.Commands
            .SubmitAsync(harness.InstanceId, 1404, "ActivateExtensions", "{}", null, CancellationToken.None)
            .ConfigureAwait(true);

        await harness.Session.SendPendingCommandsAsync(CancellationToken.None).ConfigureAwait(true);
        await harness.Session.SendPendingCommandsAsync(CancellationToken.None).ConfigureAwait(true);

        // The Engine does not acknowledge a command and does not deduplicate, so Cloud must not re-send it.
        Assert.Single(
            harness.Channel.ParseSent(),
            message => message.MessageType == CloudProtocol.MessageType.Command);
    }

    [Fact]
    public async Task Command_AnswersForAnUnknownCorrelationAreIgnored()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        EngineSessionSignal signal = await harness.SendCommandResponseAsync("a-correlation-cloud-never-issued").ConfigureAwait(true);

        Assert.Equal(EngineSessionSignal.Continue, signal);
    }

    [Fact]
    public async Task UnknownMessageTypes_AreIgnoredRatherThanAnsweredWithAnInventedError()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        int before = harness.Channel.Sent.Count;
        EngineSessionSignal signal = await harness
            .SendAsync(harness.Peer.BuildEncrypted("SomethingNotInTheProtocol", "{}"))
            .ConfigureAwait(true);

        Assert.Equal(EngineSessionSignal.Continue, signal);
        Assert.Equal(before, harness.Channel.Sent.Count);
    }

    [Fact]
    public async Task PendingCommands_AreWrittenAsSoonAsTheHandshakeCompletes()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);

        // Queued while the Engine is away, then collected when it connects.
        await harness.Commands
            .SubmitAsync(harness.InstanceId, 1404, "ActivateExtensions", "{}", null, CancellationToken.None)
            .ConfigureAwait(true);

        await harness.HandshakeAsync().ConfigureAwait(true);

        CloudMessage command = harness.Channel.LastOfType(CloudProtocol.MessageType.Command)
            ?? throw new InvalidOperationException("Cloud did not deliver the queued command after the handshake.");

        Assert.False(string.IsNullOrWhiteSpace(command.CorrelationId));
    }

    [Fact]
    public async Task Session_RefusesToWriteAnythingBeforeItHasAuthenticated()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);

        await harness.Session.SendPendingCommandsAsync(CancellationToken.None).ConfigureAwait(true);

        Assert.Null(harness.Session.InstanceId);
        Assert.Empty(harness.Channel.Sent);
    }
}
