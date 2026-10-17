// -----------------------------------------------------------------------------
// <copyright file="LiveConfiguration.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Tasks;
/// <summary>
/// Configuration for a live trading session, parsed from Cloud command parameters.
/// </summary>
internal sealed record LiveConfiguration
{
    public required string AdapterName { get; init; }
    public required string StrategyName { get; init; }
    public required int MagicNumber { get; init; }
    public required double Leverage { get; init; }
    public required double InitialBalance { get; init; }
    public required string[] Symbols { get; init; }
    public required int OrderGuardTimeoutSeconds { get; init; }
    public required double StopOutLevel { get; init; }
    public required int MaxOpenPositions { get; init; }
    public required double[] Genes { get; init; }
    public string? NeuralNetworkName { get; init; }
    public required string AccountCurrency { get; init; }

    /// <summary>
    /// Parses a Cloud command parameter object into a <see cref="LiveConfiguration"/>.
    /// If fields or DNA are omitted, defaults are applied.
    /// </summary>
    /// <param name="config">The configuration object (dictionary, JSON string, or JsonElement).</param>
    /// <returns>A parsed configuration.</returns>
    public static LiveConfiguration Parse(object? config)
    {
        Dictionary<string, object>? dict = null;

        if (config is Dictionary<string, object> d)
        {
            dict = d;
        }
        else if (config is string jsonStr && !string.IsNullOrWhiteSpace(jsonStr))
        {
            try
            {
                dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(jsonStr);
            }
            catch
            {
            }
        }
        else if (config is System.Text.Json.JsonElement je && je.ValueKind == System.Text.Json.JsonValueKind.Object)
        {
            try
            {
                dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(je.GetRawText());
            }
            catch
            {
            }
        }

        dict ??= new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

        string adapterName = ConfigurationParser.GetString(dict, "AdapterName");
        if (string.IsNullOrWhiteSpace(adapterName))
        {
            if (dict.TryGetValue("adapter", out object? aVal))
            {
                if (aVal is string s && !string.IsNullOrWhiteSpace(s))
                {
                    adapterName = s;
                }
                else if (aVal is System.Text.Json.JsonElement aJe)
                {
                    if (aJe.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        adapterName = aJe.GetString() ?? "";
                    }
                    else if (aJe.ValueKind == System.Text.Json.JsonValueKind.Object &&
                             (aJe.TryGetProperty("name", out var np) || aJe.TryGetProperty("Name", out np)))
                    {
                        adapterName = np.GetString() ?? "";
                    }
                }
                else if (aVal is Dictionary<string, object> ad &&
                         (ad.TryGetValue("name", out var n) || ad.TryGetValue("Name", out n)))
                {
                    adapterName = n?.ToString() ?? "";
                }
            }
            if (string.IsNullOrWhiteSpace(adapterName))
            {
                adapterName = ConfigurationParser.GetString(dict, "adapter", "PaperBroker");
            }
        }

        string strategyName = ConfigurationParser.GetString(dict, "StrategyName");
        if (string.IsNullOrWhiteSpace(strategyName))
        {
            if (dict.TryGetValue("strategy", out object? sVal))
            {
                if (sVal is string s && !string.IsNullOrWhiteSpace(s))
                {
                    strategyName = s;
                }
                else if (sVal is System.Text.Json.JsonElement sJe)
                {
                    if (sJe.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        strategyName = sJe.GetString() ?? "";
                    }
                    else if (sJe.ValueKind == System.Text.Json.JsonValueKind.Object &&
                             (sJe.TryGetProperty("name", out var np) || sJe.TryGetProperty("Name", out np)))
                    {
                        strategyName = np.GetString() ?? "";
                    }
                }
                else if (sVal is Dictionary<string, object> sd &&
                         (sd.TryGetValue("name", out var n) || sd.TryGetValue("Name", out n)))
                {
                    strategyName = n?.ToString() ?? "";
                }
            }
            if (string.IsNullOrWhiteSpace(strategyName))
            {
                strategyName = ConfigurationParser.GetString(dict, "strategy", "TrendFollowing");
            }
        }

        string[] symbols = ConfigurationParser.GetStringArray(dict, "Symbols");
        if (symbols.Length == 0)
        {
            string singleSymbol = ConfigurationParser.GetString(dict, "Symbol");
            symbols = !string.IsNullOrWhiteSpace(singleSymbol) ? [singleSymbol] : ["BTC/USDT"];
        }

        double[] genes = ConfigurationParser.GetDoubleArray(dict, nameof(Genes), Array.Empty<double>());
        if (genes.Length == 0 && (dict.TryGetValue("WinningDna", out object? dnaVal) || dict.TryGetValue("winningDna", out dnaVal)))
        {
            if (dnaVal is System.Text.Json.JsonElement dnaJe && dnaJe.ValueKind == System.Text.Json.JsonValueKind.Object &&
                (dnaJe.TryGetProperty("genes", out var gJe) || dnaJe.TryGetProperty(nameof(Genes), out gJe)) && gJe.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                genes = gJe.EnumerateArray().Select(x => x.GetDouble()).ToArray();
            }
            else if (dnaVal is Dictionary<string, object> dnaDict && (dnaDict.TryGetValue("genes", out object? gList) || dnaDict.TryGetValue(nameof(Genes), out gList)))
            {
                if (gList is IEnumerable<double> ed)
                {
                    genes = ed.ToArray();
                }
                else if (gList is IEnumerable<object> eo)
                {
                    genes = eo.Select(x => Convert.ToDouble(x, System.Globalization.CultureInfo.InvariantCulture)).ToArray();
                }
            }
        }
        if (genes.Length == 0 && (dict.TryGetValue("strategy", out object? stratVal) || dict.TryGetValue("Strategy", out stratVal)))
        {
            if (stratVal is System.Text.Json.JsonElement stratJe && stratJe.ValueKind == System.Text.Json.JsonValueKind.Object &&
                (stratJe.TryGetProperty("genes", out var gJe) || stratJe.TryGetProperty(nameof(Genes), out gJe)) && gJe.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                genes = gJe.EnumerateArray().Select(x => x.GetDouble()).ToArray();
            }
            else if (stratVal is Dictionary<string, object> stratDict && (stratDict.TryGetValue("genes", out object? gList) || stratDict.TryGetValue(nameof(Genes), out gList)))
            {
                if (gList is IEnumerable<double> ed)
                {
                    genes = ed.ToArray();
                }
                else if (gList is IEnumerable<object> eo)
                {
                    genes = eo.Select(x => Convert.ToDouble(x, System.Globalization.CultureInfo.InvariantCulture)).ToArray();
                }
            }
        }

        return new LiveConfiguration
        {
            AdapterName = adapterName,
            StrategyName = strategyName,
            MagicNumber = ConfigurationParser.GetInt(dict, "MagicNumber", 1001),
            Leverage = ConfigurationParser.GetDouble(dict, "Leverage", 1.0),
            InitialBalance = ConfigurationParser.GetDouble(dict, "InitialBalance", ConfigurationParser.GetDouble(dict, "initialCapital", 100000.0)),
            Symbols = symbols,
            OrderGuardTimeoutSeconds = ConfigurationParser.GetInt(dict, "OrderGuardTimeoutSeconds", 5),
            StopOutLevel = ConfigurationParser.GetDouble(dict, "StopOutLevel", 0.2),
            MaxOpenPositions = ConfigurationParser.GetInt(dict, "MaxOpenPositions", 5),
            Genes = genes,
            NeuralNetworkName = dict.TryGetValue("NeuralNetworkName", out object? nnObj) ? nnObj?.ToString() : null,
            AccountCurrency = ConfigurationParser.GetString(dict, "AccountCurrency", "USD")
        };
    }
}
