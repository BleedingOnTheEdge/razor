// -----------------------------------------------------------------------------
// <copyright file="CloudPayloadJsonConverterTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.UnitTests;

using System.Text.Json;
using Engine.Communication;

/// <summary>
/// Tests of the form a message payload takes once it is off the wire (002-020-020 §3.2).
/// </summary>
/// <remarks>
/// Every branch of <c>CloudConnector.ProcessReceivedMessageAsync</c> that reads a payload starts with
/// <c>Payload is Dictionary&lt;string, object&gt;</c>, so the shape the payload is materialised in decides
/// whether the branch runs at all. These tests pin that shape for both entry points into the message path:
/// the envelope deserialisation, and the plaintext the security manager produces when a payload arrives
/// encrypted.
/// </remarks>
public sealed class CloudPayloadJsonConverterTests
{
    /// <summary>An envelope carrying the payload shape a command actually uses.</summary>
    private const string CommandEnvelopeJson = """
        {
          "MessageId": "11111111-1111-1111-1111-111111111111",
          "MessageType": "Command",
          "Version": "1.0",
          "Encrypted": true,
          "CorrelationId": "corr-1404",
          "Payload": {
            "CommandId": 1404,
            "CommandType": "ActivateExtensions",
            "Parameters": {
              "Adapter": "ctrader",
              "Strategy": "trend-following",
              "Hooks": [ "risk", "telemetry" ],
              "Confidence": 0.75,
              "Enabled": true,
              "NeuralNetwork": null
            },
            "TimeoutSeconds": 30
          }
        }
        """;

    [Fact]
    public void AnObjectPayloadIsMaterialisedAsADictionaryOfObject()
    {
        CloudMessage? message = JsonSerializer.Deserialize<CloudMessage>(CommandEnvelopeJson);

        Assert.NotNull(message);

        // The assertion the whole defect turns on: without it every payload branch is inert.
        var payload = Assert.IsType<Dictionary<string, object>>(message.Payload);

        // The command framing reads its identifier as an int, and the handlers read their parameters as a
        // dictionary, so both the value type and the container type are asserted rather than assumed.
        Assert.IsType<int>(payload["CommandId"]);
        Assert.Equal(1404, payload["CommandId"]);
        Assert.IsType<int>(payload["TimeoutSeconds"]);
        Assert.Equal("ActivateExtensions", payload["CommandType"]);

        var parameters = Assert.IsType<Dictionary<string, object>>(payload["Parameters"]);
        Assert.Equal("ctrader", parameters["Adapter"]);
        Assert.IsType<bool>(parameters["Enabled"]);
        Assert.Equal(true, parameters["Enabled"]);
        Assert.IsType<double>(parameters["Confidence"]);
        Assert.Null(parameters["NeuralNetwork"]);

        // An array has to arrive as object[]: the handlers test for exactly that type when they read a list.
        var hooks = Assert.IsType<object[]>(parameters["Hooks"]);
        Assert.Equal(new object[] { "risk", "telemetry" }, hooks);

        Assert.Equal("corr-1404", message.CorrelationId);
    }

    [Fact]
    public void AnArrayPayloadIsMaterialisedAsAnArrayOfObject()
    {
        CloudMessage? message = JsonSerializer.Deserialize<CloudMessage>(
            """{ "MessageType": "HeartbeatResponse", "Payload": [ 1, "two", false ] }""");

        var payload = Assert.IsType<object[]>(message!.Payload);
        Assert.Equal(new object[] { 1, "two", false }, payload);
    }

    [Fact]
    public void ANumericPayloadWiderThanAnIntIsMaterialisedAsALong()
    {
        // Memory usage in a heartbeat is reported in bytes, which does not fit an int; a payload reader must
        // still get a number it can use rather than a truncated or widened one.
        CloudMessage? message = JsonSerializer.Deserialize<CloudMessage>(
            """{ "MessageType": "Heartbeat", "Payload": { "MemoryUsage": 51539607552 } }""");

        var payload = Assert.IsType<Dictionary<string, object>>(message!.Payload);
        Assert.IsType<long>(payload["MemoryUsage"]);
        Assert.Equal(51539607552L, payload["MemoryUsage"]);
    }

    [Fact]
    public void AFractionalPayloadNumberIsMaterialisedAsADouble()
    {
        CloudMessage? message = JsonSerializer.Deserialize<CloudMessage>(
            """{ "MessageType": "Heartbeat", "Payload": { "CpuUsage": 12.5 } }""");

        var payload = Assert.IsType<Dictionary<string, object>>(message!.Payload);
        Assert.IsType<double>(payload["CpuUsage"]);
        Assert.Equal(12.5, payload["CpuUsage"]);
    }

    [Fact]
    public void ACipherTextPayloadStaysAStringSoItCanBeDecrypted()
    {
        // Before the handshake derives a session key, and for every encrypted payload afterwards, the member
        // holds base64 cipher text. The decrypt path only engages for a string, so this must not change.
        CloudMessage? message = JsonSerializer.Deserialize<CloudMessage>(
            """{ "MessageType": "HeartbeatResponse", "Encrypted": true, "Payload": "AQIDBAUGBwg=" }""");

        Assert.Equal("AQIDBAUGBwg=", Assert.IsType<string>(message!.Payload));
    }

    [Fact]
    public void DecryptedPayloadJsonIsMaterialisedInTheSameShapes()
    {
        // The decrypted plaintext replaces the cipher text in the same member but does not pass through the
        // envelope's deserialisation, so it has its own entry point into the same conversion — and it is the
        // entry point a binary transfer's offsets and sizes arrive through.
        object? payload = CloudPayloadJsonConverter.Parse(
            """
            {
              "Status": "Success",
              "SessionId": "session-1",
              "Nonce": "abc",
              "TotalSize": 51539607552,
              "Offset": 0
            }
            """);

        var dictionary = Assert.IsType<Dictionary<string, object>>(payload);
        Assert.Equal("Success", dictionary["Status"]);
        Assert.Equal("session-1", dictionary["SessionId"]);
        Assert.IsType<long>(dictionary["TotalSize"]);
        Assert.Equal(51539607552L, dictionary["TotalSize"]);
        Assert.IsType<int>(dictionary["Offset"]);
        Assert.Equal(0, dictionary["Offset"]);
    }

    [Fact]
    public void ADictionaryPayloadIsWrittenBackAsAJsonObject()
    {
        // A manifest or a command result is an object on the wire, never an escaped string, so what is read
        // as a dictionary has to be written back in the form the Cloud's own reader expects.
        var message = new CloudMessage
        {
            MessageType = "CommandResponse",
            Encrypted = true,
            CorrelationId = "corr-1404",
            Payload = new Dictionary<string, object>(StringComparer.Ordinal)
            {
                ["CommandId"] = 1404,
                ["Status"] = "Success"
            }
        };

        using JsonDocument document = JsonDocument.Parse(JsonSerializer.Serialize(message));

        JsonElement payload = document.RootElement.GetProperty("Payload");
        Assert.Equal(JsonValueKind.Object, payload.ValueKind);
        Assert.Equal(1404, payload.GetProperty("CommandId").GetInt32());
        Assert.Equal("Success", payload.GetProperty("Status").GetString());
        Assert.Equal("corr-1404", document.RootElement.GetProperty("CorrelationId").GetString());
    }

    [Fact]
    public void APayloadThatIsNotJsonIsRejectedRatherThanSilentlyDropped()
    {
        // A decryption that yields something that is not a JSON value is a protocol violation, not an empty
        // payload. The receive loop reports exactly the JsonException family, so the conversion must raise one
        // rather than swallow it and leave the message looking unhandled.
        Assert.ThrowsAny<JsonException>(() => CloudPayloadJsonConverter.Parse("not json"));
    }
}
