// -----------------------------------------------------------------------------
// <copyright file="CloudPayloadJsonConverter.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Communication;

using System.Text;
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
/// <see cref="object"/>[] — the types the payload branches and the command handlers test against. An
/// integral number becomes an <see cref="int"/> where it fits, because the command framing and the handlers
/// read identifiers, seeds and intervals as <see cref="int"/>, and a <see cref="long"/> or
/// <see cref="double"/> otherwise. A JSON string is returned as a <see cref="string"/>, which is also how an
/// encrypted payload arrives before the security manager replaces it with the decrypted form.
/// </para>
/// <para>
/// The conversion is driven by the reader rather than by an intermediate <see cref="JsonDocument"/> so that
/// both entry points share one implementation, and so that a number keeps the width it was written with: a
/// payload read through a document would widen an integral value to <see cref="double"/> wherever the
/// reader had already consumed the token.
/// </para>
/// </remarks>
internal sealed class CloudPayloadJsonConverter : JsonConverter<object>
{
    /// <inheritdoc/>
    public override object? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return ReadValue(ref reader);
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
        var reader = new Utf8JsonReader(Encoding.UTF8.GetBytes(json));
        return reader.Read()
            ? ReadValue(ref reader)
            : throw new JsonException("The decrypted payload is empty.");
    }

    private static object? ReadValue(ref Utf8JsonReader reader)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.StartObject:
                return ReadObject(ref reader);

            case JsonTokenType.StartArray:
                return ReadArray(ref reader);

            case JsonTokenType.String:
                return reader.GetString();

            case JsonTokenType.Number:
                return ReadNumber(ref reader);

            case JsonTokenType.True:
                return true;

            case JsonTokenType.False:
                return false;

            case JsonTokenType.Null:
                return null;

            default:
                throw new JsonException($"A payload cannot contain a {reader.TokenType} token.");
        }
    }

    private static Dictionary<string, object> ReadObject(ref Utf8JsonReader reader)
    {
        var payload = new Dictionary<string, object>(StringComparer.Ordinal);

        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.EndObject)
            {
                return payload;
            }

            string name = reader.GetString() ?? string.Empty;
            if (!reader.Read())
            {
                break;
            }

            // A JSON null is a value the handlers distinguish from an absent key, so it is kept. The
            // dictionary's value type is object, not object?, because that is the type the command handlers
            // and the payload branches test against.
            payload[name] = ReadValue(ref reader)!;
        }

        throw new JsonException("A payload object was not terminated.");
    }

    private static object?[] ReadArray(ref Utf8JsonReader reader)
    {
        var items = new List<object?>();

        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.EndArray)
            {
                return items.ToArray();
            }

            items.Add(ReadValue(ref reader));
        }

        throw new JsonException("A payload array was not terminated.");
    }

    private static object ReadNumber(ref Utf8JsonReader reader)
    {
        // Each width is returned on its own: a conditional expression over long and double would take double
        // as their common type, silently widening every payload number that does not fit an int.
        if (reader.TryGetInt32(out int intValue))
        {
            return intValue;
        }

        if (reader.TryGetInt64(out long longValue))
        {
            return longValue;
        }

        return reader.GetDouble();
    }
}
