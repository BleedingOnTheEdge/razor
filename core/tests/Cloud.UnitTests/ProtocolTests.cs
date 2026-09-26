// -----------------------------------------------------------------------------
// <copyright file="ProtocolTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Security.Cryptography;
using System.Text.Json;
using Cloud.Protocol;
using Cloud.UnitTests.TestSupport;

/// <summary>
/// Tests of the wire protocol: the envelope Cloud puts on the socket, and the cipher that has to agree with
/// the Engine's <c>Engine.Core.SecurityManager</c> for a session to work at all.
/// </summary>
public sealed class ProtocolTests
{
    private const string EngineJsonKeys = "\"MessageId\",\"MessageType\",\"Version\",\"Encrypted\",\"Payload\",\"CorrelationId\"";

    [Fact]
    public void Envelope_UsesThePropertyNamesTheEngineReads()
    {
        // The Engine serialises and reads PascalCase names with default options. A naming policy on either
        // side would silently break authentication, so the exact names are pinned here.
        string json = JsonSerializer.Serialize(
            CloudMessage.Create(CloudProtocol.MessageType.AuthResponse, new { Status = "Success" }));

        foreach (string key in EngineJsonKeys.Split(','))
        {
            Assert.Contains(key, json, StringComparison.Ordinal);
        }

        Assert.DoesNotContain("\"messageId\"", json, StringComparison.Ordinal);
        Assert.DoesNotContain("\"payload\"", json, StringComparison.Ordinal);
    }

    [Fact]
    public void Envelope_KeepsThePayloadAsAnObjectForAPlaintextMessage()
    {
        string json = JsonSerializer.Serialize(
            CloudMessage.Create(CloudProtocol.MessageType.AuthResponse, new { Status = "Success" }));

        using JsonDocument document = JsonDocument.Parse(json);
        Assert.Equal(JsonValueKind.Object, document.RootElement.GetProperty("Payload").ValueKind);
        Assert.Equal("Success", document.RootElement.GetProperty("Payload").GetProperty("Status").GetString());
        Assert.False(document.RootElement.GetProperty("Encrypted").GetBoolean());
    }

    [Fact]
    public void EncryptedEnvelope_CarriesTheCipherTextAsAJsonStringAndTheCorrelationId()
    {
        CloudMessage message = CloudMessage.CreateEncrypted(
            CloudProtocol.MessageType.Command,
            "Y2lwaGVy",
            "correlation-1");

        string json = JsonSerializer.Serialize(message);
        using JsonDocument document = JsonDocument.Parse(json);

        Assert.Equal(JsonValueKind.String, document.RootElement.GetProperty("Payload").ValueKind);
        Assert.Equal("Y2lwaGVy", document.RootElement.GetProperty("Payload").GetString());
        Assert.Equal("correlation-1", document.RootElement.GetProperty("CorrelationId").GetString());
        Assert.True(document.RootElement.GetProperty("Encrypted").GetBoolean());
    }

    [Fact]
    public void Envelope_RoundTripsThroughJsonUnchanged()
    {
        CloudMessage original = CloudMessage.CreateEncrypted(CloudProtocol.MessageType.Command, "Y2lwaGVy", "c1");

        CloudMessage? restored = JsonSerializer.Deserialize<CloudMessage>(JsonSerializer.Serialize(original));

        Assert.NotNull(restored);
        Assert.Equal(original.MessageId, restored.MessageId);
        Assert.Equal(original.MessageType, restored.MessageType);
        Assert.True(restored.Encrypted);
        Assert.Equal("Y2lwaGVy", restored.Payload!.Value.GetString());
        Assert.Equal("c1", restored.CorrelationId);
    }

    [Fact]
    public void SessionCipher_AgreesWithTheEngineInBothDirections()
    {
        // The whole point of the cipher: what Cloud seals, the Engine's own code must open, and the reverse.
        using var cloud = new SessionCipher();
        using var engine = new EnginePeer();

        string nonce = SessionCipher.CreateNonce();
        cloud.EstablishSession(engine.PublicKey, nonce);
        engine.EstablishSession(cloud.GetPublicKey(), nonce);

        const string cloudPayload = "{\"Status\":\"OK\",\"NextIntervalSeconds\":10}";
        Assert.Equal(cloudPayload, engine.Decrypt(cloud.Encrypt(cloudPayload)));

        const string enginePayload = "{\"EngineId\":\"engine-1\",\"Health\":{\"CpuUsage\":1}}";
        Assert.Equal(enginePayload, cloud.Decrypt(engine.Encrypt(enginePayload)).Json);
    }

    [Fact]
    public void SessionCipher_PublishesASubjectPublicKeyInfoThatTheEngineCanImport()
    {
        using var cloud = new SessionCipher();
        using var engine = new EnginePeer();

        // Establishing in this direction only succeeds if Cloud's public key is importable SPKI, which is
        // the format the Engine exports and therefore the format it expects to receive.
        engine.EstablishSession(cloud.GetPublicKey(), SessionCipher.CreateNonce());
    }

    [Fact]
    public void SessionCipher_ChallengeFromTheEngineIsAccepted()
    {
        using var cloud = new SessionCipher();
        using var engine = new EnginePeer();

        string nonce = SessionCipher.CreateNonce();
        cloud.EstablishSession(engine.PublicKey, nonce);
        engine.EstablishSession(cloud.GetPublicKey(), nonce);

        Assert.True(cloud.VerifyChallenge(nonce, engine.ComputeChallenge(nonce)));
    }

    [Fact]
    public void SessionCipher_RejectsAChallengeThatWouldNotProveKeyAgreement()
    {
        using var cloud = new SessionCipher();
        using var engine = new EnginePeer();

        string nonce = SessionCipher.CreateNonce();
        cloud.EstablishSession(engine.PublicKey, nonce);
        engine.EstablishSession(cloud.GetPublicKey(), nonce);

        Assert.False(cloud.VerifyChallenge(nonce, engine.ComputeChallenge("a-different-nonce")));
        Assert.False(cloud.VerifyChallenge(nonce, "not-base64!!"));
        Assert.False(cloud.VerifyChallenge(nonce, Convert.ToBase64String([1, 2, 3])));
    }

    [Fact]
    public void SessionCipher_RejectsTamperedCipherText()
    {
        using var cloud = new SessionCipher();
        using var engine = new EnginePeer();

        string nonce = SessionCipher.CreateNonce();
        cloud.EstablishSession(engine.PublicKey, nonce);
        engine.EstablishSession(cloud.GetPublicKey(), nonce);

        byte[] sealedBytes = Convert.FromBase64String(engine.Encrypt("{\"EngineId\":\"engine-1\"}"));

        // Flip one bit of the ciphertext; the GCM tag must catch it rather than yielding a garbled message.
        sealedBytes[^1] ^= 0x01;

        Assert.ThrowsAny<CryptographicException>(() => cloud.Decrypt(Convert.ToBase64String(sealedBytes)));
    }

    [Fact]
    public void SessionCipher_RejectsAFrameShorterThanItsOwnFraming()
    {
        using var cloud = new SessionCipher();
        using var engine = new EnginePeer();

        string nonce = SessionCipher.CreateNonce();
        cloud.EstablishSession(engine.PublicKey, nonce);

        Assert.Throws<InvalidOperationException>(() => cloud.Decrypt(Convert.ToBase64String(new byte[12])));
    }

    [Fact]
    public void SessionCipher_ExposesTheEngineSequenceNumberSoReplaysCanBeDetected()
    {
        using var cloud = new SessionCipher();
        using var engine = new EnginePeer();

        string nonce = SessionCipher.CreateNonce();
        cloud.EstablishSession(engine.PublicKey, nonce);
        engine.EstablishSession(cloud.GetPublicKey(), nonce);

        // The Engine starts at one and increments per message; an equal or lower value is a replay.
        Assert.Equal(1UL, cloud.Decrypt(engine.Encrypt("{}")).Sequence);
        Assert.Equal(2UL, cloud.Decrypt(engine.Encrypt("{}")).Sequence);
        Assert.Equal(3UL, cloud.Decrypt(engine.Encrypt("{}")).Sequence);
    }

    [Fact]
    public void SessionCipher_RefusesToEncryptBeforeTheSessionIsEstablished()
    {
        using var cloud = new SessionCipher();

        Assert.Throws<InvalidOperationException>(() => cloud.Encrypt("{}"));
        Assert.Throws<InvalidOperationException>(() => cloud.ComputeChallenge("nonce"));
    }

    [Fact]
    public void SessionCipher_RejectsAKeyThatIsNotAnImportablePublicKey()
    {
        using var cloud = new SessionCipher();

        Assert.ThrowsAny<CryptographicException>(() =>
            cloud.EstablishSession(Convert.ToBase64String([1, 2, 3, 4]), "nonce"));
        Assert.Throws<FormatException>(() => cloud.EstablishSession("not base64", "nonce"));
    }

    [Fact]
    public void PayloadReader_ReadsTheEngineFieldTypes()
    {
        using JsonDocument document = JsonDocument.Parse(
            """
            {
              "Username": "operator",
              "CommandId": 1404,
              "Encrypted": true,
              "Health": { "CpuUsage": 1.5 },
              "ClientCapabilities": [100, 101, "not-a-number"],
              "Adapters": ["A", "B", 7]
            }
            """);

        JsonElement payload = document.RootElement;

        Assert.Equal("operator", payload.ReadString("Username"));
        Assert.Equal(1404, payload.ReadInt32("CommandId"));
        Assert.True(payload.ReadBoolean("Encrypted"));
        Assert.NotNull(payload.ReadObject("Health"));
        Assert.Equal([100, 101], payload.ReadInt32Array("ClientCapabilities"));
        Assert.Equal(["A", "B"], payload.ReadStringArray("Adapters"));
    }

    [Fact]
    public void PayloadReader_TreatsMissingAndMistypedFieldsAsAbsent()
    {
        using JsonDocument document = JsonDocument.Parse(
            """{ "Status": null, "Count": "seven", "Flag": "yes", "Items": 5 }""");
        JsonElement payload = document.RootElement;

        Assert.Null(payload.ReadString("Status"));
        Assert.Null(payload.ReadString("Absent"));
        Assert.Null(payload.ReadInt32("Count"));
        Assert.Null(payload.ReadBoolean("Flag"));
        Assert.Null(payload.ReadObject("Status"));
        Assert.Empty(payload.ReadStringArray("Items"));
        Assert.Empty(payload.ReadInt32Array("Items"));
    }

    [Fact]
    public void PayloadReader_IsCaseSensitiveSoADriftInFieldNamesIsNotSilentlyAccepted()
    {
        using JsonDocument document = JsonDocument.Parse("""{ "status": "Success" }""");

        Assert.Null(document.RootElement.ReadString("Status"));
    }

    [Fact]
    public void PayloadReader_ReadsNothingFromANonObjectPayload()
    {
        using JsonDocument document = JsonDocument.Parse("\"a base64 string payload\"");

        // An encrypted frame carries its ciphertext as a JSON string, not an object, so every field reader
        // must report "absent" rather than throwing or loosely coercing the string.
        Assert.Null(document.RootElement.ReadString("Status"));
        Assert.Null(document.RootElement.ReadInt32("CommandId"));
        Assert.Null(document.RootElement.ReadBoolean("Encrypted"));
        Assert.Empty(document.RootElement.ReadStringArray("Adapters"));
    }
}
