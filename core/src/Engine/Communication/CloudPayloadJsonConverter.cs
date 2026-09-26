// -----------------------------------------------------------------------------
// <copyright file="CloudPayloadJsonConverter.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Communication;

using System.Text.Json;
using System.Text.Json.Serialization;

/// <summary>
/// Reads and writes the payload of a <see cref="CloudMessage"/> as the CLR shapes the Engine's message
/// handling reads (002-020-020 §3.2).
/// </summary>
/// <remarks>
/// <para>
/// 002-020-020 §3.2 declares the payload as "either a JSON object or base64‑encoded binary data". Declared
/// as <see cref="object"/> with no converter, <see cref="JsonSerializer"/> materialises an inbound payload
/// as a <see cref="JsonElement"/> instead, so every <c>Payload is Dictionary&lt;string, object&gt;</c> test in
/// <see cref="CloudConnector"/> is false and every branch that reads a payload is inert — including the
/// <c>AuthResponse</c> that carries the session identifier the handshake waits for.
/// </para>
/// <para>
/// The shapes produced here are the ones the existing readers already expect. A JSON object becomes a
/// <see cref="Dictionary{TKey,TValue}"/> of <see cref="string"/> to <see cref="object"/> and a JSON array an
/// <see cref="object"/>[] — the types the payload branches and the command handlers test against. A JSON
/// string is returned as a <see cref="string"/>, which is also how an encrypted payload arrives before the
/// security manager replaces it with the decrypted form.
/// </para>
/// </remarks>
internal sealed class CloudPayloadJsonConverter : JsonConverter<object>
{
    /// <inheritdoc/>
    public override object? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        // The reader is positioned at the start of a complete value, so a nested object or array is
        // materialised by this single parse rather than by a second deserialisation pass.
        using JsonDocument document = JsonDocument.ParseValue(ref reader);
        return FromElement(document.RootElement);
    }

    /// <inheritdoc/>
    public override void Write(Utf8JsonWriter writer, object value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }

        // Serialising by runtime type rather than by the declared object keeps an outbound payload — an
        // anonymous object, a manifest, or an already-encrypted cipher text string — on the wire exactly as
        // it was before this converter existed.
        JsonSerializer.Serialize(writer, value, value.GetType(), options);
    }

    /// <summary>
    /// Converts a payload that was decrypted out of its envelope into the shapes <see cref="Read"/> produces.
    /// </summary>
    /// <param name="json">The decrypted payload JSON.</param>
    /// <returns>The payload as a dictionary, array, string, number, boolean or null.</returns>
    /// <exception cref="JsonException">The text is not a single JSON value.</exception>
    internal static object? Parse(string json)
    {
        using JsonDocument document = JsonDocument.Parse(json);
        return FromElement(document.RootElement);
    }

    /// <summary>
    /// Converts one parsed JSON value into the CLR shape the Engine's message handling reads.
    /// </summary>
    /// <param name="element">The value.</param>
    /// <returns>The converted value.</returns>
    internal static object? FromElement(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => ToDictionary(element),
            JsonValueKind.Array => element.EnumerateArray().Select(FromElement).ToArray(),
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => ToNumber(element),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => null
        };
    }

    private static Dictionary<string, object> ToDictionary(JsonElement element)
    {
        var payload = new Dictionary<string, object>(StringComparer.Ordinal);
        foreach (JsonProperty property in element.EnumerateObject())
        {
            // A JSON null is a value the handlers distinguish from an absent key, so it is kept. The
            // dictionary's value type is object, not object?, because that is the type the command handlers
            // and the payload branches test against.
            payload[property.Name] = FromElement(property.Value)!;
        }

        return payload;
    }

    private static object ToNumber(JsonElement element)
    {
        // An integral number is materialised as int where it fits, because the command handlers and the
        // command framing read identifiers, seeds and intervals as int; long and double keep the values that
        // do not fit.
        if (element.TryGetInt32(out int intValue))
        {
            return intValue;
        }

        return element.TryGetInt64(out long longValue) ? longValue : element.GetDouble();
    }
}
