// -----------------------------------------------------------------------------
// <copyright file="CloudMessage.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Protocol;

using System.Text.Json;
using System.Text.Json.Serialization;

/// <summary>
/// The JSON envelope exchanged with an Engine over the Cloud WebSocket (002-020-020 §3.2).
/// </summary>
/// <remarks>
/// <para>
/// The property names are fixed by the Engine's <c>Engine.Communication.CloudMessage</c>. The Engine
/// serialises with default <see cref="JsonSerializer"/> options, which emit CLR property names verbatim
/// in PascalCase, so Cloud declares the same PascalCase names via
/// <see cref="JsonPropertyNameAttribute"/> instead of relying on a naming policy. A camelCase policy on
/// either side would silently break authentication, because the Engine reads payload fields by exact name
/// (<c>Status</c>, <c>SessionId</c>, <c>CommandId</c>, ...).
/// </para>
/// <para>
/// <see cref="Payload"/> is either a JSON object (a plaintext message such as <c>Auth</c>) or a JSON string
/// (the base64 AES-256-GCM ciphertext of an encrypted message). It is modelled as
/// <see cref="JsonElement"/> so that both shapes round-trip without a lossy <c>object</c> conversion —
/// the Engine's own inbound handling is broken precisely because it expects
/// <c>Dictionary&lt;string, object&gt;</c> from a <see cref="JsonElement"/> payload.
/// </para>
/// </remarks>
internal sealed class CloudMessage
{
    /// <summary>Gets or sets the UUID that identifies the message for tracking and deduplication.</summary>
    [JsonPropertyName("MessageId")]
    public string MessageId { get; set; } = string.Empty;

    /// <summary>Gets or sets the discriminator that selects how <see cref="Payload"/> is interpreted.</summary>
    [JsonPropertyName("MessageType")]
    public string MessageType { get; set; } = string.Empty;

    /// <summary>Gets or sets the protocol revision.</summary>
    [JsonPropertyName("Version")]
    public string Version { get; set; } = CloudProtocol.Version;

    /// <summary>
    /// Gets or sets a value indicating whether <see cref="Payload"/> is base64 AES-256-GCM ciphertext.
    /// </summary>
    [JsonPropertyName("Encrypted")]
    public bool Encrypted { get; set; }

    /// <summary>Gets or sets the message body: a JSON object, or a base64 string when <see cref="Encrypted"/>.</summary>
    [JsonPropertyName("Payload")]
    public JsonElement? Payload { get; set; }

    /// <summary>
    /// Gets or sets the identifier the Engine echoes back on the answer to a command; Cloud correlates a
    /// <c>CommandResponse</c> with the command it sent through this field.
    /// </summary>
    [JsonPropertyName("CorrelationId")]
    public string? CorrelationId { get; set; }

    /// <summary>
    /// Creates an envelope whose payload is serialised from a plaintext object.
    /// </summary>
    /// <param name="messageType">One of the <see cref="CloudProtocol.MessageType"/> values.</param>
    /// <param name="payload">The payload object, or <see langword="null"/> for a message without a body.</param>
    /// <returns>The envelope, with a freshly generated <see cref="MessageId"/>.</returns>
    internal static CloudMessage Create(string messageType, object? payload)
    {
        return new CloudMessage
        {
            MessageId = Guid.NewGuid().ToString(),
            MessageType = messageType,
            Encrypted = false,
            Payload = payload is null ? null : JsonSerializer.SerializeToElement(payload)
        };
    }

    /// <summary>
    /// Creates an envelope whose payload is the base64 ciphertext of an encrypted message.
    /// </summary>
    /// <param name="messageType">One of the <see cref="CloudProtocol.MessageType"/> values.</param>
    /// <param name="base64CipherText">The base64 AES-256-GCM ciphertext produced by <see cref="SessionCipher"/>.</param>
    /// <param name="correlationId">The correlation identifier, when the message answers a command.</param>
    /// <returns>The envelope, with a freshly generated <see cref="MessageId"/>.</returns>
    internal static CloudMessage CreateEncrypted(string messageType, string base64CipherText, string? correlationId = null)
    {
        return new CloudMessage
        {
            MessageId = Guid.NewGuid().ToString(),
            MessageType = messageType,
            Encrypted = true,
            Payload = JsonSerializer.SerializeToElement(base64CipherText),
            CorrelationId = correlationId
        };
    }

    /// <inheritdoc/>
    public override string ToString()
    {
        return $"CloudMessage {{ MessageType = {MessageType}, Encrypted = {Encrypted}, MessageId = {MessageId} }}";
    }
}
