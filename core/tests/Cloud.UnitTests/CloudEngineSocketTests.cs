// -----------------------------------------------------------------------------
// <copyright file="CloudEngineSocketTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Cloud;
using Cloud.Engine;
using Cloud.Protocol;
using Cloud.UnitTests.TestSupport;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Tests of the <c>/engine</c> WebSocket over a real socket: the upgrade, frame reassembly, the command
/// delivery path that only a connected Engine can exercise, and the ways a connection ends
/// (002-020-020 §3.1, §3.3 step 6, §3.5).
/// </summary>
/// <remarks>
/// The Engine half of the conversation is <see cref="EnginePeer"/>, a transcription of the Engine's own
/// client, so the wire format is checked against the Engine rather than against Cloud's own types. What
/// these tests add over <c>EngineSessionProtocolTests</c> is everything between the socket and the session:
/// the upgrade, the frame handling, the registry that makes a connected instance reachable, and the
/// teardown that releases the session once the Engine is gone.
/// </remarks>
public sealed class CloudEngineSocketTests
{
    private const string DefaultUserName = "operator";

    [Fact]
    public async Task TheSocketCompletesTheHandshakeDeliversACommandAndRecordsItsResult()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        EngineSessionRegistry registry = factory.Services.GetRequiredService<EngineSessionRegistry>();

        using var peer = new EnginePeer();
        using WebSocket socket = await ConnectAsync(factory).ConfigureAwait(true);
        await HandshakeAsync(socket, peer, factory, instance).ConfigureAwait(true);

        // Registration happens once Cloud has authenticated the frame that completed the handshake, so the
        // session becomes reachable a moment after the AuthAck reaches the Engine. Waiting for it is the
        // difference between "the handshake was answered" and "the instance can be sent work".
        Assert.True(await WaitUntilRegisteredAsync(registry, instance.InstanceId).ConfigureAwait(true));

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage submitted = await PostJsonAsync(
            client,
            $"/api/instances/{instance.InstanceId}/commands",
            new
            {
                InstanceId = instance.InstanceId,
                CommandId = 1200,
                CommandType = "RunBacktest",
                Parameters = "{\"Symbol\":\"EURUSD\"}",
                TimeoutSeconds = 60
            }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Created, submitted.StatusCode);

        // A connected instance is served immediately, which is the whole point of the registry: the caller is
        // told the command was written rather than merely queued.
        JsonElement submittedView = await ReadJsonAsync(submitted).ConfigureAwait(true);
        Assert.True(submittedView.GetProperty("delivered").GetBoolean());
        Guid commandId = submittedView.GetProperty("commandId").GetGuid();

        // The command arrives as a top-level Command message carrying Cloud's own correlation identifier,
        // which is the value the Engine must echo back for the answer to be matchable.
        CloudMessage command = await ReadMessageAsync(socket, CloudProtocol.MessageType.Command).ConfigureAwait(true);
        JsonElement commandPayload = Decrypt(peer, command);
        Assert.Equal(1200, commandPayload.GetProperty("CommandId").GetInt32());
        Assert.Equal("RunBacktest", commandPayload.GetProperty("CommandType").GetString());
        Assert.Equal("EURUSD", commandPayload.GetProperty("Parameters").GetProperty("Symbol").GetString());
        Assert.Equal(60, commandPayload.GetProperty("TimeoutSeconds").GetInt32());
        Assert.Equal(submittedView.GetProperty("correlationId").GetString(), command.CorrelationId);

        string correlationId = command.CorrelationId!;

        // An interim report is stored, and the final answer is what closes the command out.
        await SendAsync(
            socket,
            peer.BuildEncrypted(
                CloudProtocol.MessageType.CommandProgress,
                JsonSerializer.Serialize(new
                {
                    Percent = 40
                }),
                correlationId)).ConfigureAwait(true);
        await SendAsync(
            socket,
            peer.BuildEncrypted(
                CloudProtocol.MessageType.CommandResponse,
                JsonSerializer.Serialize(new
                {
                    CommandId = 1200,
                    Status = "Success",
                    Result = new
                    {
                        NetProfit = 7.5
                    }
                }),
                correlationId)).ConfigureAwait(true);

        await WaitForCommandStatusAsync(client, commandId, "Completed").ConfigureAwait(true);

        using HttpResponseMessage completed = await client
            .GetAsync(Relative($"/api/commands/{commandId}"))
            .ConfigureAwait(true);
        JsonElement completedView = await ReadJsonAsync(completed).ConfigureAwait(true);
        Assert.Equal("Completed", completedView.GetProperty("status").GetString());

        // The stored result is the Engine's payload verbatim — its own Status, its own Result object — rather
        // than a value Cloud recomputed from it. Cloud keeps the evidence, which is what makes a later
        // question about a run answerable without the Engine.
        JsonElement stored = completedView.GetProperty("result");
        Assert.Equal(1200, stored.GetProperty("CommandId").GetInt32());
        Assert.Equal("Success", stored.GetProperty("Status").GetString());
        Assert.Equal(7.5, stored.GetProperty("Result").GetProperty("NetProfit").GetDouble());
        Assert.Equal(40, completedView.GetProperty("progress")[0].GetProperty("payload").GetProperty("Percent").GetInt32());

        await CloseAsync(socket).ConfigureAwait(true);
    }

    [Fact]
    public async Task TheSocketReassemblesAFragmentedEnvelopeAndAnswersAHeartbeat()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        using var peer = new EnginePeer();
        using WebSocket socket = await ConnectAsync(factory).ConfigureAwait(true);

        // The Auth envelope is sent in two frames. A handler that treated each frame as a whole message would
        // try to parse half a document and discard both, so the socket must reassemble them before parsing.
        string auth = peer.BuildAuth(DefaultUserName, CloudTestDatabase.Password, instance.ApiKey, RequiredCapabilities(factory));
        byte[] bytes = Encoding.UTF8.GetBytes(auth);
        int split = bytes.Length / 2;
        await socket
            .SendAsync(new ArraySegment<byte>(bytes, 0, split), WebSocketMessageType.Text, endOfMessage: false, CancellationToken.None)
            .ConfigureAwait(true);
        await socket
            .SendAsync(new ArraySegment<byte>(bytes, split, bytes.Length - split), WebSocketMessageType.Text, endOfMessage: true, CancellationToken.None)
            .ConfigureAwait(true);

        CloudMessage authResponse = await ReadMessageAsync(socket, CloudProtocol.MessageType.AuthResponse).ConfigureAwait(true);
        JsonElement authPayload = ReadPlaintext(authResponse);
        string nonce = authPayload.GetProperty("Nonce").GetString()!;
        peer.EstablishSession(authPayload.GetProperty("PublicKey").GetString()!, nonce);
        peer.RecordSessionId(authPayload.GetProperty("SessionId").GetString()!);

        // Cloud requires the capabilities it is configured with, and it answers with the list so the Engine can
        // tell why it was refused.
        Assert.Equal<IEnumerable<int>>(
            RequiredCapabilities(factory),
            authPayload.GetProperty("RequiredCapabilities").EnumerateArray().Select(item => item.GetInt32()));

        await SendAsync(
            socket,
            peer.BuildEncrypted(
                CloudProtocol.MessageType.AuthConfirm,
                JsonSerializer.Serialize(new
                {
                    Challenge = peer.ComputeChallenge(nonce)
                }))).ConfigureAwait(true);
        await ReadMessageAsync(socket, CloudProtocol.MessageType.AuthAck).ConfigureAwait(true);

        await SendAsync(
            socket,
            peer.BuildEncrypted(
                CloudProtocol.MessageType.Heartbeat,
                JsonSerializer.Serialize(new
                {
                    EngineId = "engine-1",
                    LocalTimestamp = DateTimeOffset.UnixEpoch,
                    Health = new
                    {
                        CpuUsage = 1.0,
                        MemoryUsage = 1024L,
                        TasksRunning = 0,
                        LiveTickAge = 0
                    }
                }))).ConfigureAwait(true);

        CloudMessage heartbeat = await ReadMessageAsync(socket, CloudProtocol.MessageType.HeartbeatResponse).ConfigureAwait(true);
        JsonElement heartbeatPayload = Decrypt(peer, heartbeat);
        Assert.Equal(CloudProtocol.HeartbeatStatus.Ok, heartbeatPayload.GetProperty("Status").GetString());
        Assert.True(heartbeatPayload.GetProperty("AuthValid").GetBoolean());
        Assert.Equal(CloudOptions.DefaultHeartbeatIntervalSeconds, heartbeatPayload.GetProperty("NextIntervalSeconds").GetInt32());

        await CloseAsync(socket).ConfigureAwait(true);
    }

    [Fact]
    public async Task TheSocketClosesAConnectionWhoseSessionRejectsAFrame()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        EngineSessionRegistry registry = factory.Services.GetRequiredService<EngineSessionRegistry>();

        using var peer = new EnginePeer();
        using WebSocket socket = await ConnectAsync(factory).ConfigureAwait(true);
        await HandshakeAsync(socket, peer, factory, instance).ConfigureAwait(true);
        Assert.True(await WaitUntilRegisteredAsync(registry, instance.InstanceId).ConfigureAwait(true));

        // An authenticated session accepts nothing but encrypted frames. A plaintext frame after the handshake
        // is refused, and because Cloud cannot tell a broken client from a hostile one it ends the session
        // rather than carrying on with a connection it no longer trusts.
        await SendAsync(socket, JsonSerializer.Serialize(CloudMessage.Create(CloudProtocol.MessageType.Heartbeat, new
        {
        })))
            .ConfigureAwait(true);

        Frame closing = await ReceiveFrameAsync(socket).ConfigureAwait(true);
        Assert.Equal(WebSocketMessageType.Close, closing.MessageType);
        await AcknowledgeCloseAsync(socket).ConfigureAwait(true);

        // The session is released as well: nothing may keep writing commands to a socket Cloud has closed, and
        // the Engine's retry loop then has to re-authenticate to be served again.
        Assert.True(await WaitUntilReleasedAsync(registry, instance.InstanceId).ConfigureAwait(true));
    }

    [Fact]
    public async Task TheSocketReleasesTheSessionWhenTheEngineDisappearsWithoutClosing()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        EngineSessionRegistry registry = factory.Services.GetRequiredService<EngineSessionRegistry>();

        using var peer = new EnginePeer();
        using WebSocket socket = await ConnectAsync(factory).ConfigureAwait(true);
        await HandshakeAsync(socket, peer, factory, instance).ConfigureAwait(true);
        Assert.True(await WaitUntilRegisteredAsync(registry, instance.InstanceId).ConfigureAwait(true));

        // A dropped connection is the ordinary case for a machine that loses its network: no close frame, just
        // a fault. The pump must end and the registry must forget the instance, or every later command for it
        // would be written into a dead socket instead of being queued for the reconnect.
        socket.Abort();

        Assert.True(await WaitUntilReleasedAsync(registry, instance.InstanceId).ConfigureAwait(true));
    }

    [Fact]
    public async Task TheSocketPathAnswersBadRequestToAPlainRequest()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateClient();

        // The endpoint is not an HTTP resource; anything that is not a WebSocket upgrade is refused before the
        // socket is accepted.
        using HttpResponseMessage response = await client
            .GetAsync(Relative(EngineSocketHandler.Path))
            .ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static Uri Relative(string url)
    {
        return new Uri(url, UriKind.Relative);
    }

    private static async Task<HttpResponseMessage> PostJsonAsync(HttpClient client, string url, object body)
    {
        using StringContent content = new(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        return await client.PostAsync(Relative(url), content, CancellationToken.None).ConfigureAwait(false);
    }

    private static async Task<WebSocket> ConnectAsync(CloudWebApplicationFactory factory)
    {
        var client = factory.Server.CreateWebSocketClient();
        return await client.ConnectAsync(new Uri(factory.Server.BaseAddress, "engine"), CancellationToken.None).ConfigureAwait(false);
    }

    private static int[] RequiredCapabilities(CloudWebApplicationFactory factory)
    {
        // The Engine must advertise whatever Cloud requires, and that requirement comes from Cloud's own
        // configuration; reading it here keeps the test honest when the configuration changes.
        return [.. factory.Services.GetRequiredService<CloudOptions>().RequiredCapabilities];
    }

    private static async Task HandshakeAsync(
        WebSocket socket,
        EnginePeer peer,
        CloudWebApplicationFactory factory,
        SeededInstance instance)
    {
        await SendAsync(
            socket,
            peer.BuildAuth(DefaultUserName, CloudTestDatabase.Password, instance.ApiKey, RequiredCapabilities(factory))).ConfigureAwait(false);

        CloudMessage authResponse = await ReadMessageAsync(socket, CloudProtocol.MessageType.AuthResponse).ConfigureAwait(false);
        JsonElement payload = ReadPlaintext(authResponse);
        string nonce = payload.GetProperty("Nonce").GetString()!;
        peer.EstablishSession(payload.GetProperty("PublicKey").GetString()!, nonce);
        peer.RecordSessionId(payload.GetProperty("SessionId").GetString()!);

        await SendAsync(
            socket,
            peer.BuildEncrypted(
                CloudProtocol.MessageType.AuthConfirm,
                JsonSerializer.Serialize(new
                {
                    Challenge = peer.ComputeChallenge(nonce)
                }))).ConfigureAwait(false);

        await ReadMessageAsync(socket, CloudProtocol.MessageType.AuthAck).ConfigureAwait(false);
    }

    private static async Task SendAsync(WebSocket socket, string text)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(text);
        await socket
            .SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, endOfMessage: true, CancellationToken.None)
            .ConfigureAwait(false);
    }

    private static async Task<Frame> ReceiveFrameAsync(WebSocket socket, CancellationToken cancellationToken = default)
    {
        byte[] buffer = new byte[64 * 1024];
        WebSocketReceiveResult result = await socket
            .ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken)
            .ConfigureAwait(false);

        return new Frame(result.MessageType, result.EndOfMessage, buffer[..result.Count]);
    }

    private static async Task<CloudMessage> ReadMessageAsync(WebSocket socket, string messageType)
    {
        while (true)
        {
            var frame = new StringBuilder();
            Frame received;
            do
            {
                received = await ReceiveFrameAsync(socket).ConfigureAwait(false);
                if (received.MessageType == WebSocketMessageType.Close)
                {
                    throw new InvalidOperationException(
                        $"Cloud closed the socket while a {messageType} message was still expected.");
                }

                frame.Append(Encoding.UTF8.GetString(received.Bytes));
            }
            while (!received.EndOfMessage);

            CloudMessage message = JsonSerializer.Deserialize<CloudMessage>(frame.ToString())!;
            if (string.Equals(message.MessageType, messageType, StringComparison.Ordinal))
            {
                return message;
            }
        }
    }

    private static JsonElement Decrypt(EnginePeer peer, CloudMessage message)
    {
        using JsonDocument document = JsonDocument.Parse(peer.Decrypt(message.Payload!.Value.GetString()!));
        return document.RootElement.Clone();
    }

    private static JsonElement ReadPlaintext(CloudMessage message)
    {
        return message.Payload!.Value;
    }

    private static async Task CloseAsync(WebSocket socket)
    {
        // The client sends its close frame without waiting, then reads Cloud's answer. Using CloseAsync here
        // would work too, but it performs the whole handshake itself and so cannot prove that Cloud sent the
        // closing frame rather than the client timing out.
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await socket
            .CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "test finished", timeout.Token)
            .ConfigureAwait(false);

        Frame closing = await ReceiveFrameAsync(socket, timeout.Token).ConfigureAwait(false);
        Assert.Equal(WebSocketMessageType.Close, closing.MessageType);
    }

    /// <summary>
    /// Answers a close frame Cloud sent, so the pump's own close handshake can complete.
    /// </summary>
    /// <param name="socket">The socket.</param>
    private static async Task AcknowledgeCloseAsync(WebSocket socket)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await socket
            .CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "test finished", timeout.Token)
            .ConfigureAwait(false);
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        string body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
        using JsonDocument document = JsonDocument.Parse(body);
        return document.RootElement.Clone();
    }

    private static async Task WaitForCommandStatusAsync(HttpClient client, Guid commandId, string expected)
    {
        for (int attempt = 0; attempt < 200; attempt++)
        {
            using HttpResponseMessage response = await client
                .GetAsync(Relative($"/api/commands/{commandId}"))
                .ConfigureAwait(false);
            JsonElement view = await ReadJsonAsync(response).ConfigureAwait(false);
            if (string.Equals(view.GetProperty("status").GetString(), expected, StringComparison.Ordinal))
            {
                return;
            }

            await Task.Delay(25).ConfigureAwait(false);
        }

        Assert.Fail($"The command never reached the {expected} state.");
    }

    private static async Task<bool> WaitUntilRegisteredAsync(EngineSessionRegistry registry, Guid instanceId)
    {
        return await WaitForRegistryAsync(registry, instanceId, expected: true).ConfigureAwait(false);
    }

    private static async Task<bool> WaitUntilReleasedAsync(EngineSessionRegistry registry, Guid instanceId)
    {
        return await WaitForRegistryAsync(registry, instanceId, expected: false).ConfigureAwait(false);
    }

    private static async Task<bool> WaitForRegistryAsync(EngineSessionRegistry registry, Guid instanceId, bool expected)
    {
        for (int attempt = 0; attempt < 400; attempt++)
        {
            bool hasSession = await registry
                .TryDeliverPendingCommandsAsync(instanceId, CancellationToken.None)
                .ConfigureAwait(false);

            if (hasSession == expected)
            {
                return true;
            }

            await Task.Delay(25).ConfigureAwait(false);
        }

        return false;
    }

    /// <summary>One received WebSocket frame.</summary>
    /// <param name="MessageType">The frame's type.</param>
    /// <param name="EndOfMessage">Whether the frame ended the message.</param>
    /// <param name="Bytes">The frame's bytes.</param>
    private sealed record Frame(WebSocketMessageType MessageType, bool EndOfMessage, byte[] Bytes);
}
