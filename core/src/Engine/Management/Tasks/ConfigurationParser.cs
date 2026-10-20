// -----------------------------------------------------------------------------
// <copyright file="ConfigurationParser.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Tasks;

using System.Globalization;
using System.Text.Json;

/// <summary>
/// Helper for parsing configuration dictionaries from cloud command parameters.
/// </summary>
internal static class ConfigurationParser
{
    private static bool TryGetValueIgnoreCase(Dictionary<string, object> dict, string key, out object? value)
    {
        if (dict.TryGetValue(key, out value))
        {
            return true;
        }

        foreach (var kvp in dict)
        {
            if (string.Equals(kvp.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                value = kvp.Value;
                return true;
            }
        }

        value = null;
        return false;
    }

    /// <summary>
    /// Gets a string value from the dictionary.
    /// </summary>
    /// <param name="dict">The configuration dictionary.</param>
    /// <param name="key">The key.</param>
    /// <param name="fallback">Fallback value if key is missing.</param>
    /// <returns>The string value or fallback.</returns>
    public static string GetString(Dictionary<string, object> dict, string key, string fallback = "")
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value) && value is not null)
        {
            if (value is string s)
            {
                return s;
            }
            if (value is JsonElement je)
            {
                return je.ValueKind == JsonValueKind.String ? (je.GetString() ?? fallback) : je.ToString();
            }
            return value.ToString() ?? fallback;
        }
        return fallback;
    }

    /// <summary>
    /// Gets a string array from the dictionary.
    /// </summary>
    /// <param name="dict">The configuration dictionary.</param>
    /// <param name="key">The key.</param>
    /// <param name="fallback">Fallback value if key is missing.</param>
    /// <returns>The string array or fallback.</returns>
    public static string[] GetStringArray(Dictionary<string, object> dict, string key, string[]? fallback = null)
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value) && value is not null)
        {
            if (value is string[] strArr)
            {
                return strArr;
            }
            if (value is object[] array)
            {
                return array.Select(x => x?.ToString() ?? string.Empty).ToArray();
            }
            if (value is IEnumerable<string> strEnum)
            {
                return strEnum.ToArray();
            }
            if (value is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Array)
            {
                return jsonElement.EnumerateArray().Select(x => x.GetString() ?? x.ToString()).ToArray();
            }
            if (value is string singleStr && !string.IsNullOrWhiteSpace(singleStr))
            {
                return [singleStr];
            }
        }
        return fallback ?? Array.Empty<string>();
    }

    /// <summary>
    /// Gets a DateTime value from the dictionary.
    /// </summary>
    /// <param name="dict">The configuration dictionary.</param>
    /// <param name="key">The key.</param>
    /// <returns>The parsed DateTime.</returns>
    /// <exception cref="ArgumentException">Thrown if the key is missing or invalid.</exception>
    public static DateTime GetDateTime(Dictionary<string, object> dict, string key)
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value) && value is not null)
        {
            if (value is DateTime dt)
            {
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
            }
            if (value is DateTimeOffset dto)
            {
                return dto.UtcDateTime;
            }
            if (value is JsonElement je)
            {
                if (je.ValueKind == JsonValueKind.String && je.TryGetDateTime(out DateTime parsedJe))
                {
                    return DateTime.SpecifyKind(parsedJe, DateTimeKind.Utc);
                }
                if (je.ValueKind == JsonValueKind.String && DateTime.TryParse(je.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out DateTime parsedJeStr))
                {
                    return DateTime.SpecifyKind(parsedJeStr, DateTimeKind.Utc);
                }
            }
            if (value is string s && DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out DateTime parsed))
            {
                return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
            }
        }
        throw new ArgumentException($"Missing or invalid DateTime field: {key}");
    }

    /// <summary>
    /// Gets a DateTime value with a fallback.
    /// </summary>
    /// <param name="dict">The configuration dictionary.</param>
    /// <param name="key">The key.</param>
    /// <param name="fallback">Fallback value.</param>
    /// <returns>The parsed DateTime or fallback.</returns>
    public static DateTime GetDateTime(Dictionary<string, object> dict, string key, DateTime fallback)
    {
        try
        {
            return GetDateTime(dict, key);
        }
        catch
        {
            return fallback;
        }
    }

    /// <summary>
    /// Gets a double value from the dictionary.
    /// </summary>
    /// <param name="dict">The configuration dictionary.</param>
    /// <param name="key">The key.</param>
    /// <returns>The parsed double.</returns>
    /// <exception cref="ArgumentException">Thrown if the key is missing or invalid.</exception>
    public static double GetDouble(Dictionary<string, object> dict, string key)
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value) && value is not null)
        {
            if (value is double d)
            {
                return d;
            }
            if (value is float f)
            {
                return f;
            }
            if (value is decimal dec)
            {
                return (double)dec;
            }
            if (value is int i)
            {
                return i;
            }
            if (value is long l)
            {
                return l;
            }
            if (value is JsonElement je)
            {
                if (je.ValueKind == JsonValueKind.Number && je.TryGetDouble(out double jd))
                {
                    return jd;
                }
                if (je.ValueKind == JsonValueKind.String && double.TryParse(je.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out double jsd))
                {
                    return jsd;
                }
            }
            if (value is string s && double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out double parsed))
            {
                return parsed;
            }
        }
        throw new ArgumentException($"Missing or invalid double field: {key}");
    }

    /// <summary>
    /// Gets a double value with a fallback.
    /// </summary>
    /// <param name="dict">The configuration dictionary.</param>
    /// <param name="key">The key.</param>
    /// <param name="fallback">Fallback value.</param>
    /// <returns>The parsed double or fallback.</returns>
    public static double GetDouble(Dictionary<string, object> dict, string key, double fallback)
    {
        try
        {
            return GetDouble(dict, key);
        }
        catch
        {
            return fallback;
        }
    }

    /// <summary>
    /// Gets an integer value from the dictionary.
    /// </summary>
    /// <param name="dict">The configuration dictionary.</param>
    /// <param name="key">The key.</param>
    /// <param name="fallback">Fallback value.</param>
    /// <returns>The parsed integer or fallback.</returns>
    public static int GetInt(Dictionary<string, object> dict, string key, int fallback = 0)
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value) && value is not null)
        {
            if (value is int i)
            {
                return i;
            }
            if (value is long l)
            {
                return (int)l;
            }
            if (value is double d)
            {
                return (int)Math.Round(d);
            }
            if (value is JsonElement je)
            {
                if (je.ValueKind == JsonValueKind.Number && je.TryGetInt32(out int ji))
                {
                    return ji;
                }
                if (je.ValueKind == JsonValueKind.String && int.TryParse(je.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out int jsi))
                {
                    return jsi;
                }
            }
            if (value is string s && int.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out int parsed))
            {
                return parsed;
            }
        }
        return fallback;
    }

    /// <summary>
    /// Gets a long value from the dictionary.
    /// </summary>
    /// <param name="dict">The configuration dictionary.</param>
    /// <param name="key">The key.</param>
    /// <param name="fallback">Fallback value.</param>
    /// <returns>The parsed long or fallback.</returns>
    public static long GetLong(Dictionary<string, object> dict, string key, long fallback = 0)
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value) && value is not null)
        {
            if (value is long l)
            {
                return l;
            }
            if (value is int i)
            {
                return i;
            }
            if (value is JsonElement je)
            {
                if (je.ValueKind == JsonValueKind.Number && je.TryGetInt64(out long jl))
                {
                    return jl;
                }
                if (je.ValueKind == JsonValueKind.String && long.TryParse(je.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out long jsl))
                {
                    return jsl;
                }
            }
            if (value is string s && long.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out long parsed))
            {
                return parsed;
            }
        }
        return fallback;
    }

    /// <summary>
    /// Gets a double array from the dictionary.
    /// </summary>
    /// <param name="dict">The configuration dictionary.</param>
    /// <param name="key">The key.</param>
    /// <param name="fallback">Fallback value.</param>
    /// <returns>The double array or fallback.</returns>
    public static double[] GetDoubleArray(Dictionary<string, object> dict, string key, double[]? fallback = null)
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value) && value is not null)
        {
            if (value is double[] arr)
            {
                return arr;
            }
            if (value is IEnumerable<double> ed)
            {
                return ed.ToArray();
            }
            if (value is object[] objArr)
            {
                return objArr.Select(x => Convert.ToDouble(x, CultureInfo.InvariantCulture)).ToArray();
            }
            if (value is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Array)
            {
                return jsonElement.EnumerateArray().Select(x => x.GetDouble()).ToArray();
            }
        }
        return fallback ?? Array.Empty<double>();
    }
}
