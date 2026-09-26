// -----------------------------------------------------------------------------
// <copyright file="EngineSessionFrameHandlingTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Cloud;
using Cloud.Data;
using Cloud.Engine;
using Cloud.Protocol;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Tests of the individual decisions <see cref="EngineSession"/> makes about a frame: which messages are
/// refused in which phase, what happens when a payload cannot be used, and which reports are dropped
/// (002-020-020 §3.3, §3.4, §3.5).
/// </summary>
/// <remarks>
/// <c>EngineSessionProtocolTests</c> drives whole conversations; this file drives single frames, including
/// the ones a well-behaved Engine never sends. They matter because the session is the only thing standing
/// between an arbitrary peer and Cloud's database: a frame that is mishandled is either a way in or a way to
/// stop a working Engine, and both directions are asserted here rather than assumed.
/// </remarks>
public sealed class EngineSessionFrameHandlingTests
{
    [Fact]
    public async Task ANullDocumentIsIgnoredRatherThanClosingTheConnection()
    {
        using var database = new CloudTestDatabase();
        using var harness = await ConnectAsync(database).ConfigureAwait(true);

        // "null" is valid JSON for a null document. It is not a protocol message, but it is also not an
        // attack: discarding it keeps a harmless parse oddity from ending a live session.
        Assert.Equal(EngineSessionSignal.Continue, await harness.SendAsync("null").ConfigureAwait(true));
    }

    [Fact]
    public async Task AnythingStructuredThatIsNotTheExpectedFrameIsIgnoredOrClosedPerPhase()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);

        // Before the handshake, anything that is not an Auth is out of protocol order. The session stays open
        // because the Engine is still free to send a valid Auth next.
        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendAsync(Serialize(CloudMessage.Create(CloudProtocol.MessageType.Heartbeat, new
            {
            }))).ConfigureAwait(true));

        // An Auth whose payload is not an object cannot carry credentials, so it is refused the same way
        // rather than being read field by field from whatever shape arrived.
        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendAsync(Serialize(CloudMessage.Create(CloudProtocol.MessageType.Auth, "not-an-object"))).ConfigureAwait(true));

        // The Engine's Auth is the one frame that must not be encrypted: there is no session key yet. A
        // ciphertext here is either a confused client or a probe, and either way there is nothing to decrypt.
        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendAsync(Serialize(CloudMessage.CreateEncrypted(CloudProtocol.MessageType.Auth, "AAAA"))).ConfigureAwait(true));
    }

    [Fact]
    public async Task AMessageThatIsNotTheAuthConfirmIsIgnoredWhileTheHandshakeIsWaitingForIt()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);

        // This Auth succeeds, so a session key now exists and Cloud is waiting only for the challenge.
        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendAsync(harness.Peer.BuildAuth("operator", CloudTestDatabase.Password, harness.InstanceApiKey, [])).ConfigureAwait(true));

        // A plaintext frame in that state is not an AuthConfirm, and the session is not yet authenticated, so
        // it is ignored. Closing here would let any peer abort another Engine's half-finished handshake.
        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendAsync(Serialize(CloudMessage.Create(CloudProtocol.MessageType.Heartbeat, new
            {
            }))).ConfigureAwait(true));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-base64-at-all")]
    [InlineData("bm90IGEga2V5")]
    public async Task AnAuthWithAnUnusablePublicKeyIsRefusedWithAFailureResponse(string publicKey)
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);

        string auth = Serialize(CloudMessage.Create(CloudProtocol.MessageType.Auth, new
        {
            Username = "operator",
            Password = CloudTestDatabase.Password,
            InstanceApiKey = harness.InstanceApiKey,
            EngineVersion = "1.0.0",
            ClientCapabilities = Array.Empty<int>(),
            PublicKey = publicKey
        }));

        // The key agreement is the only step that can fail after the credentials are accepted, and it must
        // fail closed: the Engine is told why and the connection is closed, rather than the session being
        // left half-established with a cipher that was never usable.
        Assert.Equal(EngineSessionSignal.Close, await harness.SendAsync(auth).ConfigureAwait(true));

        string? response = harness.Channel.LastPayloadJson(CloudProtocol.MessageType.AuthResponse);
        Assert.NotNull(response);
        using JsonDocument document = JsonDocument.Parse(response);
        Assert.Equal("Failure", document.RootElement.GetProperty("Status").GetString());
        Assert.Equal(
            "The Engine public key is not a usable NIST P-256 key.",
            document.RootElement.GetProperty("ErrorMessage").GetString());
        Assert.Null(harness.Session.InstanceId);
    }

    [Fact]
    public async Task AnAuthConfirmThatCloudCannotDecryptClosesTheSession()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);

        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendAsync(harness.Peer.BuildAuth("operator", CloudTestDatabase.Password, harness.InstanceApiKey, [])).ConfigureAwait(true));

        // A plaintext frame cannot be an AuthConfirm, and a challenge that cannot be read cannot be verified.
        // The session closes without ever becoming authenticated, which is the safe direction: an
        // unverifiable challenge must never be treated as a satisfied one.
        Assert.Equal(
            EngineSessionSignal.Close,
            await harness.SendAsync(Serialize(CloudMessage.Create(CloudProtocol.MessageType.AuthConfirm, new
            {
                Challenge = "x"
            }))).ConfigureAwait(true));

        Assert.Null(harness.Session.InstanceId);
    }

    [Fact]
    public async Task AnEncryptedFrameWithoutAUsablePayloadClosesTheSession()
    {
        using var database = new CloudTestDatabase();
        using var harness = await ConnectAsync(database).ConfigureAwait(true);

        // An authenticated session only accepts encrypted frames. Each of these is flagged encrypted but
        // carries nothing that could be a ciphertext, so none of them can be decrypted and the session ends.
        Assert.Equal(
            EngineSessionSignal.Close,
            await harness.SendAsync(Serialize(new CloudMessage
            {
                MessageType = CloudProtocol.MessageType.Heartbeat,
                Encrypted = true,
                Payload = null
            })).ConfigureAwait(true));

        Assert.Equal(
            EngineSessionSignal.Close,
            await harness.SendAsync(Serialize(new CloudMessage
            {
                MessageType = CloudProtocol.MessageType.Heartbeat,
                Encrypted = true,
                Payload = JsonSerializer.SerializeToElement(new { NotCipherText = true })
            })).ConfigureAwait(true));
    }

    [Fact]
    public async Task AHeartbeatWithoutAnEngineIdentifierLocksTheSessionAndClosesIt()
    {
        using var database = new CloudTestDatabase();
        using var harness = await ConnectAsync(database).ConfigureAwait(true);

        // The Engine identifier on the heartbeat is compared with the one bound to the API key, and that
        // comparison is what stops a leaked key from being used by a different Engine binary. A heartbeat that
        // does not name the instance cannot pass that check, so it is treated as a mismatch rather than as
        // "nothing to compare": absent evidence of identity is not evidence of identity.
        Assert.Equal(
            EngineSessionSignal.Close,
            await harness.SendAsync(harness.Peer.BuildEncrypted(
                CloudProtocol.MessageType.Heartbeat,
                JsonSerializer.Serialize(new
                {
                    LocalTimestamp = DateTimeOffset.UnixEpoch
                }))).ConfigureAwait(true));

        string payload = harness.DecryptLastPayload(CloudProtocol.MessageType.HeartbeatResponse);
        using JsonDocument document = JsonDocument.Parse(payload);
        Assert.Equal(CloudProtocol.HeartbeatStatus.Lock, document.RootElement.GetProperty("Status").GetString());
        Assert.False(document.RootElement.GetProperty("AuthValid").GetBoolean());
    }

    [Fact]
    public async Task AHeartbeatThatNoLongerMatchesTheInstanceLocksTheSessionAndClosesIt()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        // A heartbeat that names a different Engine means the API key is being used by something other than
        // the instance it was issued to. Cloud answers with AuthValid false — which tells a live Engine to
        // stop its user tasks — and then closes, so the Engine's retry loop has to re-authenticate.
        Assert.Equal(
            EngineSessionSignal.Close,
            await harness.SendHeartbeatAsync("a-different-engine").ConfigureAwait(true));

        string payload = harness.DecryptLastPayload(CloudProtocol.MessageType.HeartbeatResponse);
        using JsonDocument document = JsonDocument.Parse(payload);
        Assert.False(document.RootElement.GetProperty("AuthValid").GetBoolean());
    }

    [Fact]
    public async Task ReportsWithoutACorrelationIdentifierAreIgnored()
    {
        using var database = new CloudTestDatabase();
        using var harness = await ConnectAsync(database).ConfigureAwait(true);

        // Without a correlation identifier a report cannot be attributed to a command, so there is nothing to
        // record. The envelope is the primary carrier and the payload is the fallback, and the two frames
        // below exercise the fallback and the case where neither carries one.
        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendAsync(harness.Peer.BuildEncrypted(
                CloudProtocol.MessageType.CommandProgress,
                JsonSerializer.Serialize(new
                {
                    Percent = 10
                }))).ConfigureAwait(true));

        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendAsync(harness.Peer.BuildEncrypted(
                CloudProtocol.MessageType.CommandResponse,
                JsonSerializer.Serialize(new
                {
                    Status = "Success"
                }))).ConfigureAwait(true));
    }

    [Fact]
    public async Task ReportsForAnUnknownOrFinishedCommandAreDropped()
    {
        using var database = new CloudTestDatabase();
        using var harness = await ConnectAsync(database).ConfigureAwait(true);
        string correlationId = Guid.NewGuid().ToString();

        // The Engine's reports are advisory. A report for a command Cloud does not know — a duplicate after a
        // timeout, or a reply to a command that was never issued — must not create state or move anything.
        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendAsync(harness.Peer.BuildEncrypted(
                CloudProtocol.MessageType.CommandProgress,
                JsonSerializer.Serialize(new
                {
                    Percent = 10
                }),
                correlationId)).ConfigureAwait(true));

        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendAsync(harness.Peer.BuildEncrypted(
                CloudProtocol.MessageType.CommandResponse,
                JsonSerializer.Serialize(new
                {
                    Status = "Error",
                    Error = "no such command"
                }),
                correlationId)).ConfigureAwait(true));

        using CloudDbContext db = database.CreateDbContext();
        Assert.Empty(await db.CommandProgressReports.ToListAsync().ConfigureAwait(true));
    }

    [Fact]
    public async Task AProgressReportMayTakeItsCorrelationIdentifierFromThePayload()
    {
        using var database = new CloudTestDatabase();
        using var harness = await ConnectAsync(database).ConfigureAwait(true);

        CommandOutcome queued = await harness.Commands
            .SubmitAsync(harness.InstanceId, 1200, "RunBacktest", null, null, CancellationToken.None)
            .ConfigureAwait(true);
        string correlationId = queued.Command!.CorrelationId;

        // The Engine's own client carries the correlation identifier on the envelope for a top-level command,
        // and the payload is accepted as a fallback for a report that only names it there.
        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendAsync(harness.Peer.BuildEncrypted(
                CloudProtocol.MessageType.CommandProgress,
                JsonSerializer.Serialize(new
                {
                    CorrelationId = correlationId,
                    Percent = 55
                }))).ConfigureAwait(true));

        using CloudDbContext db = database.CreateDbContext();
        CommandProgressReport stored = await db.CommandProgressReports.SingleAsync().ConfigureAwait(true);
        Assert.Equal(queued.Command.Id, stored.EngineCommandId);
        Assert.Equal(55, JsonDocument.Parse(stored.PayloadJson).RootElement.GetProperty("Percent").GetInt32());
    }

    [Fact]
    public async Task AFailedCommandResponseIsRecordedAsAFailureWithTheEnginesOwnError()
    {
        using var database = new CloudTestDatabase();
        using var harness = await ConnectAsync(database).ConfigureAwait(true);

        CommandOutcome queued = await harness.Commands
            .SubmitAsync(harness.InstanceId, 1200, "RunBacktest", null, null, CancellationToken.None)
            .ConfigureAwait(true);
        string correlationId = queued.Command!.CorrelationId;

        // The Engine reports exactly "Success" or "Error". An "Error" is a failed command, and the message
        // the Engine supplied is what an operator needs to see — not a generic Cloud-side failure.
        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendAsync(harness.Peer.BuildEncrypted(
                CloudProtocol.MessageType.CommandResponse,
                JsonSerializer.Serialize(new
                {
                    Status = "Error",
                    Error = "the strategy could not be loaded"
                }),
                correlationId)).ConfigureAwait(true));

        EngineCommand? stored = await harness.Commands.GetAsync(queued.Command.Id, CancellationToken.None).ConfigureAwait(true);
        Assert.Equal(CommandStatus.Failed, stored!.Status);
        Assert.Equal("the strategy could not be loaded", stored.ErrorMessage);
        Assert.Null(stored.ResultPayloadJson);
    }

    [Fact]
    public async Task AManifestForAnInstanceThatNoLongerExistsIsIgnored()
    {
        using var database = new CloudTestDatabase();
        using var harness = await ConnectAsync(database).ConfigureAwait(true);

        // An instance can be deleted while its Engine is connected. The manifest then has nothing to attach
        // to, and the session carries on rather than failing the frame: the Engine is still authenticated for
        // as long as its session lasts, and the deletion is the authority on whether it should be.
        using (CloudDbContext db = database.CreateDbContext())
        {
            EngineInstance instance = await db.EngineInstances.SingleAsync(i => i.Id == harness.InstanceId).ConfigureAwait(true);
            db.EngineInstances.Remove(instance);
            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        Assert.Equal(
            EngineSessionSignal.Continue,
            await harness.SendManifestAsync(["AdapterA"]).ConfigureAwait(true));

        using CloudDbContext after = database.CreateDbContext();
        Assert.Empty(await after.ExtensionManifestEntries.ToListAsync().ConfigureAwait(true));
    }

    [Fact]
    public async Task AManifestFromAnUnknownInstanceCannotBeStored()
    {
        // The same decision from the other side: the manifest service is what refuses, and it refuses by
        // reporting that nothing was stored rather than by inventing an instance to hang the entries on.
        using var database = new CloudTestDatabase();
        using var harness = new CloudSessionHarness(database);
        var manifests = new InstanceManifestService(database, harness.Time);

        Assert.Null(await manifests
            .ApplyAsync(Guid.NewGuid(), new EngineManifestReport(["AdapterA"], [], [], [], []), CancellationToken.None)
            .ConfigureAwait(true));
    }

    [Fact]
    public async Task ADisposedSessionIsSafeToDisposeAgain()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        using var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(true);
        await harness.HandshakeAsync().ConfigureAwait(true);

        // The socket handler disposes the session, and the container disposes the singletons it created; the
        // same session can therefore be released twice, and the second release must not fail or touch key
        // material that has already been cleared.
        harness.Session.Dispose();
        harness.Session.Dispose();
    }

    private static async Task<CloudSessionHarness> ConnectAsync(CloudTestDatabase database)
    {
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(false);
        var harness = new CloudSessionHarness(database);
        await harness.RegisterAsync(account).ConfigureAwait(false);
        await harness.HandshakeAsync().ConfigureAwait(false);
        return harness;
    }

    private static string Serialize(CloudMessage message)
    {
        return JsonSerializer.Serialize(message);
    }
}
