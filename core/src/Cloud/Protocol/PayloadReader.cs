// -----------------------------------------------------------------------------
// <copyright file="PayloadReader.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Protocol;

using System.Text.Json;

/// <summary>
/// Reads typed fields out of a decoded <see cref="CloudMessage.Payload"/>.
/// </summary>
/// <remarks>
/// The Engine writes payload property names in PascalCase with default <see cref="JsonSerializer"/>
/// options, and reads them back with exact, case-sensitive dictionary lookups. Cloud therefore looks up
/// payload fields case-sensitively too: a case-insensitive lookup would accept messages the Engine never
/// sends and would hide a protocol drift rather than surface it.
/// </remarks>
internal static class PayloadReader
{
    /// <summary>Reads a string field, treating a JSON <c>null</c> as absent.</summary>
    /// <param name="payload">The decoded payload object.</param>
    /// <param name="propertyName">The case-sensitive property name.</param>
    /// <returns>The value, or <see langword="null"/> when the field is absent or JSON <c>null</c>.</returns>
    internal static string? ReadString(this JsonElement payload, string propertyName)
    {
        if (payload.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (!payload.TryGetProperty(propertyName, out JsonElement value) || value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        return value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
    }

    /// <summary>Reads an integer field.</summary>
    /// <param name="payload">The decoded payload object.</param>
    /// <param name="propertyName">The case-sensitive property name.</param>
    /// <returns>The value, or <see langword="null"/> when the field is absent or not an integer.</returns>
    internal static int? ReadInt32(this JsonElement payload, string propertyName)
    {
        if (payload.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (!payload.TryGetProperty(propertyName, out JsonElement value))
        {
            return null;
        }

        return value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out int number) ? number : null;
    }

    /// <summary>Reads a boolean field.</summary>
    /// <param name="payload">The decoded payload object.</param>
    /// <param name="propertyName">The case-sensitive property name.</param>
    /// <returns>The value, or <see langword="null"/> when the field is absent or not a boolean.</returns>
    internal static bool? ReadBoolean(this JsonElement payload, string propertyName)
    {
        if (payload.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (!payload.TryGetProperty(propertyName, out JsonElement value))
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => null
        };
    }

    /// <summary>Reads a nested object field.</summary>
    /// <param name="payload">The decoded payload object.</param>
    /// <param name="propertyName">The case-sensitive property name.</param>
    /// <returns>The nested object, or <see langword="null"/> when the field is absent or not an object.</returns>
    internal static JsonElement? ReadObject(this JsonElement payload, string propertyName)
    {
        if (payload.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (!payload.TryGetProperty(propertyName, out JsonElement value) || value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        return value;
    }

    /// <summary>Reads an array field as raw elements.</summary>
    /// <param name="payload">The decoded payload object.</param>
    /// <param name="propertyName">The case-sensitive property name.</param>
    /// <returns>The array elements, or an empty list when the field is absent or not an array.</returns>
    internal static IReadOnlyList<JsonElement> ReadArray(this JsonElement payload, string propertyName)
    {
        if (payload.ValueKind != JsonValueKind.Object)
        {
            return [];
        }

        if (!payload.TryGetProperty(propertyName, out JsonElement value) || value.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        return [.. value.EnumerateArray()];
    }

    /// <summary>Reads an array field as a list of strings, skipping entries that are not strings.</summary>
    /// <param name="payload">The decoded payload object.</param>
    /// <param name="propertyName">The case-sensitive property name.</param>
    /// <returns>The string values, or an empty list when the field is absent or not an array.</returns>
    internal static IReadOnlyList<string> ReadStringArray(this JsonElement payload, string propertyName)
    {
        List<string> values = [];
        foreach (JsonElement element in payload.ReadArray(propertyName))
        {
            if (element.ValueKind == JsonValueKind.String && element.GetString() is string value)
            {
                values.Add(value);
            }
        }

        return values;
    }

    /// <summary>Reads an array field as a list of integers, skipping entries that are not integers.</summary>
    /// <param name="payload">The decoded payload object.</param>
    /// <param name="propertyName">The case-sensitive property name.</param>
    /// <returns>The integer values, or an empty list when the field is absent or not an array.</returns>
    internal static IReadOnlyList<int> ReadInt32Array(this JsonElement payload, string propertyName)
    {
        List<int> values = [];
        foreach (JsonElement element in payload.ReadArray(propertyName))
        {
            if (element.ValueKind == JsonValueKind.Number && element.TryGetInt32(out int value))
            {
                values.Add(value);
            }
        }

        return values;
    }
}
