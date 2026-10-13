// -----------------------------------------------------------------------------
// <copyright file="CloudHandshakeSocketTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.IntegrationTests;

using System.Security.Cryptography;
using System.Text.Json;
using Engine.Communication;
using Engine.IntegrationTests.TestSupport;
using Engine.Management.Commands;

/// <summary>
/// Tests of the Engine's inbound message handling over a real socket (002-020-020 §3.3, §3.4, §3.5).
/// </summary>
/// <remarks>
/// <para>
/// Every branch that reads an inbound payload was unreachable before the payload converter existed: the
/// payload arrived as a <c>JsonElement</c>, so the type test that guards each branch was false. A test that
/// called the handling directly would have shown the same failure, but these go through the socket, the
/// envelope, the decryption and the dispatch loop, so what they prove is that an Engine really can complete a
/// handshake with a Cloud and act on what the Cloud sends afterwards — the behaviour the issue is about.
/// </para>
/// <para>
/// The peer is <see cref="SimulatedCloudServer"/>, not the Cloud project: Cloud is on another branch and
/// owned by another workstream, and the full Engine-to-Cloud harness is issue #28.
/// </para>
/// </remarks>
public sealed class CloudHandshakeSocketTests
{
    /// <summary>The hook list a command's parameters carry, as an array the command handler reads.</summary>
    private static readonly string[] HookNames = ["risk", "telemetry"];

    [Fact]
    public async Task TheHandshakeCompletesAndTheEngineAdoptsTheSessionIdentifier()
    {
        await using EngineHarness engine = EngineHarness.Start();

        // Before the fix the Engine could never get here: the receive loop could not read the AuthResponse, so
        // AuthenticateAsync threw "no session ID received" against every Cloud.
        await engine.Cloud.WaitForHandshakeAsync().ConfigureAwait(true);

        Assert.True(
            await engine.WaitForAsync(() => engine.Connector.IsConnected && engine.State.SessionId is not null)
                .ConfigureAwait(true),
            "the connector never reported a completed session");

        Assert.NotNull(engine.Connector.SessionId);
        Assert.Equal(engine.Cloud.SessionId, engine.Connector.SessionId);
        Assert.True(engine.Connector.IsConnected);
        Assert.True(engine.Telemetry.ConnectionState);

        // The Cloud verifies the challenge in the AuthConfirm against the session key, so this proves both
        // ends derived the same key rather than that an unverified frame went unread.
        Assert.True(engine.Cloud.ChallengeVerified);

        // §3.3 step 2 uses the identifier for future reference, so the Engine keeps it.
        Assert.Equal(engine.Cloud.SessionId, engine.State.SessionId);
    }

    [Fact]
    public async Task ATopLevelCommandIsDispatchedWithTheCorrelationIdOfItsEnvelope()
    {
        await using EngineHarness engine = EngineHarness.Start();
        await engine.Cloud.WaitForHandshakeAsync().ConfigureAwait(true);

        // §3.5: a Command carries the numeric id, the name, the parameters and the identifier its result must
        // echo. This is the shape Cloud sends (EngineSession.SendPendingCommandsAsync).
        await engine.Cloud.SendEncryptedAsync(
            "Command",
            new
            {
                CommandId = 1404,
                CommandType = "ActivateExtensions",
                Parameters = new
                {
                    Adapter = "ctrader",
                    Strategy = "trend-following",
                    Hooks = HookNames
                },
                TimeoutSeconds = 30
            },
            correlationId: "corr-top-level").ConfigureAwait(true);

        CloudCommand command = await engine.WaitForCommandAsync(candidate => candidate.CommandId == 1404).ConfigureAwait(true);

        Assert.Equal("ActivateExtensions", command.CommandType);
        Assert.Equal("corr-top-level", command.CorrelationId);
        Assert.Equal(30, command.TimeoutSeconds);

        // The handlers read their arguments out of Parameters as a dictionary, and refuse the command with
        // "Invalid parameters: expected dictionary" when it is not one — the symptom the issue reports.
        var parameters = Assert.IsType<Dictionary<string, object>>(command.Parameters);
        Assert.Equal("ctrader", parameters["Adapter"]);
        Assert.Equal("trend-following", parameters["Strategy"]);

        object[] hooks = Assert.IsType<object[]>(parameters["Hooks"]);
        Assert.Equal(2, hooks.Length);
        Assert.Equal("risk", hooks[0]);
        Assert.Equal("telemetry", hooks[1]);
    }

    [Fact]
    public async Task ACommandDeliveredInAHeartbeatResponseKeepsItsOwnCorrelationId()
    {
        await using EngineHarness engine = EngineHarness.Start();
        await engine.Cloud.WaitForHandshakeAsync().ConfigureAwait(true);

        // §3.4 allows Cloud to attach commands to a heartbeat response. Such a command has no envelope of its
        // own, so the identifier it carries is the only one its result can be matched to; the Engine used to
        // mint a fresh Guid here, which made the result unmatchable.
        await engine.Cloud.SendEncryptedAsync(
            "HeartbeatResponse",
            new
            {
                Status = "OK",
                AuthValid = true,
                Commands = new object[]
                {
                    new
                    {
                        CommandId = 1200,
                        CommandType = "RunBacktest",
                        Parameters = new
                        {
                            Symbol = "EURUSD"
                        },
                        CorrelationId = "corr-in-heartbeat"
                    }
                }
            }).ConfigureAwait(true);

        CloudCommand command = await engine.WaitForCommandAsync(candidate => candidate.CommandId == 1200).ConfigureAwait(true);

        Assert.Equal("RunBacktest", command.CommandType);
        Assert.Equal("corr-in-heartbeat", command.CorrelationId);

        var parameters = Assert.IsType<Dictionary<string, object>>(command.Parameters);
        Assert.Equal("EURUSD", parameters["Symbol"]);
    }

    [Fact]
    public async Task AHeartbeatResponseAskingForALockDispatchesAnEmergencyStop()
    {
        await using EngineHarness engine = EngineHarness.Start();
        await engine.Cloud.WaitForHandshakeAsync().ConfigureAwait(true);

        // §3.4: a Lock (or Ban) status means the operator has locked the instance, which the Engine answers by
        // stopping its user tasks through the emergency-stop command.
        await engine.Cloud.SendEncryptedAsync(
            "HeartbeatResponse",
            new
            {
                Status = "Lock"
            }).ConfigureAwait(true);

        CloudCommand command = await engine
            .WaitForCommandAsync(candidate => candidate.CommandId == CommandIds.EmergencyStop)
            .ConfigureAwait(true);

        Assert.Equal("EmergencyStop", command.CommandType);
    }

    [Fact]
    public async Task AFailedAuthRevalidationDropsTheSession()
    {
        await using EngineHarness engine = EngineHarness.Start();
        await engine.Cloud.WaitForHandshakeAsync().ConfigureAwait(true);

        // §3.4: when AuthValid is false the Engine must stop its user tasks and not continue on a session the
        // Cloud no longer trusts.
        await engine.Cloud.SendEncryptedAsync(
            "HeartbeatResponse",
            new
            {
                Status = "OK",
                AuthValid = false
            }).ConfigureAwait(true);

        await engine.WaitForCommandAsync(candidate => candidate.CommandId == CommandIds.EmergencyStop).ConfigureAwait(true);

        Assert.True(
            await engine.WaitForAsync(() => !engine.Connector.IsConnected).ConfigureAwait(true),
            "the connector kept the session open after the Cloud reported the credentials invalid");
    }

    [Fact]
    public async Task ASelfUpdateOfferInAHeartbeatResponseReachesTheSelfUpdateManager()
    {
        await using EngineHarness engine = EngineHarness.Start();
        await engine.Cloud.WaitForHandshakeAsync().ConfigureAwait(true);

        // §3.4: an offer of a new Engine build arrives on the heartbeat response, with its download URL and
        // checksum.
        await engine.Cloud.SendEncryptedAsync(
            "HeartbeatResponse",
            new
            {
                NewVersion = "1.1.0",
                DownloadUrl = "https://cloud.example/engine/1.1.0",
                Checksum = "5f3a9c"
            }).ConfigureAwait(true);

        Assert.True(
            await engine.WaitForAsync(() => engine.SelfUpdate.Offered is not null).ConfigureAwait(true),
            "the update offer never reached the self-update manager");

        Assert.Equal("1.1.0", engine.SelfUpdate.Offered!.Value.Version);
        Assert.Equal(new Uri("https://cloud.example/engine/1.1.0"), engine.SelfUpdate.Offered!.Value.DownloadUrl);
        Assert.Equal("5f3a9c", engine.SelfUpdate.Offered!.Value.Checksum);
    }

    [Fact]
    public async Task ABinaryTransferFromTheCloudIsAcceptedAcknowledgedAndStored()
    {
        await using EngineHarness engine = EngineHarness.Start();
        await engine.Cloud.WaitForHandshakeAsync().ConfigureAwait(true);

        // §3.6: a transfer is a start, then the chunks, then an end. The content and its checksum are sent so
        // that the Engine's own verification has something real to accept.
        byte[] content = "an engine update payload"u8.ToArray();
        string checksum = Convert.ToHexString(SHA256.HashData(content));
        const string TransferId = "transfer-1";
        const string FileName = "update.bin";

        await engine.Cloud.SendEncryptedAsync(
            "BinaryTransferStart",
            new
            {
                TransferId,
                FileName,
                TotalSize = content.Length,
                ContentType = "application/octet-stream",
                Checksum = checksum
            }).ConfigureAwait(true);

        await engine.Cloud.SendEncryptedAsync(
            "BinaryChunk",
            new
            {
                TransferId,
                Offset = 0,
                Data = Convert.ToBase64String(content)
            }).ConfigureAwait(true);

        CloudMessage acknowledgement = await engine.Cloud.WaitForMessageAsync("BinaryTransferAck").ConfigureAwait(true);

        using (JsonDocument payload = JsonDocument.Parse(engine.Cloud.DecryptPayload(acknowledgement)))
        {
            Assert.Equal(TransferId, payload.RootElement.GetProperty("TransferId").GetString());
            Assert.Equal("Success", payload.RootElement.GetProperty("Status").GetString());
        }

        // The end message is what moves the verified payload into place, so this also proves the transfer was
        // completed rather than merely accepted.
        await engine.Cloud.SendEncryptedAsync(
            "BinaryTransferEnd",
            new
            {
                TransferId,
                Status = "Success"
            }).ConfigureAwait(true);

        string saved = Path.Combine(engine.DownloadDirectory, FileName);
        Assert.True(
            await engine.WaitForAsync(() => File.Exists(saved)).ConfigureAwait(true),
            $"the received file never appeared at {saved}");

        Assert.Equal(content, await File.ReadAllBytesAsync(saved).ConfigureAwait(true));
    }

    [Fact]
    public async Task ABroadcastMessageFromTheCloudIsDisplayed()
    {
        using var console = new ConsoleCapture();
        await using EngineHarness engine = EngineHarness.Start();
        await engine.Cloud.WaitForHandshakeAsync().ConfigureAwait(true);

        await engine.Cloud.SendEncryptedAsync(
            "BroadcastMessage",
            new
            {
                Text = "maintenance window at 20:00",
                Style = "warning"
            }).ConfigureAwait(true);

        // The only effect this branch has is the operator-facing text, and the style is what turns an ordinary
        // notice into a warning, so both are asserted.
        Assert.True(
            await engine.WaitForAsync(() => console.Contains("maintenance window at 20:00")).ConfigureAwait(true),
            "the broadcast was never displayed");
    }
}
