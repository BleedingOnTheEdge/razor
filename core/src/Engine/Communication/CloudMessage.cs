namespace Engine.Communication;

using System.Text.Json.Serialization;

/// <summary>
/// Represents a message exchanged with the cloud.
/// </summary>
internal sealed class CloudMessage
{
    public string MessageId { get; set; } = Guid.NewGuid().ToString();
    public string MessageType { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0";
    public bool Encrypted { get; set; }

    /// <summary>
    /// Gets or sets the payload: a JSON object, or the base64 cipher text of one while
    /// <see cref="Encrypted"/> is set (002-020-020 §3.2).
    /// </summary>
    /// <remarks>
    /// The converter is attached to the member rather than applied at the call sites so that a payload is
    /// materialised in a usable form however the envelope was deserialised. Without it an inbound payload is
    /// a <see cref="System.Text.Json.JsonElement"/> and every branch that reads one is inert.
    /// </remarks>
    [JsonConverter(typeof(CloudPayloadJsonConverter))]
    public object? Payload { get; set; }

    /// <summary>
    /// Gets or sets the identifier that ties a message to the request it answers (002-020-020 §3.5).
    /// </summary>
    public string? CorrelationId { get; set; }
}

/// <summary>
/// Represents a command received from the cloud.
/// </summary>
internal sealed class CloudCommand
{
    public int CommandId { get; set; }
    public string CommandType { get; set; } = string.Empty;
    public object? Parameters { get; set; }
    public int? TimeoutSeconds { get; set; }
    public string? CorrelationId { get; set; }
}
