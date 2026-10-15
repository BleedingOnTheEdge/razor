// -----------------------------------------------------------------------------
// <copyright file="BacktestConfiguration.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Tasks;

using System.Text.Json;

/// <summary>
/// Configuration for a backtest run, parsed from Cloud command parameters.
/// </summary>
internal sealed record BacktestConfiguration
{
    public required string AdapterName { get; init; }
    public required string StrategyName { get; init; }
    public required string[] Symbols { get; init; }
    public required DateTime StartDate { get; init; }
    public required DateTime EndDate { get; init; }
    public required double InitialBalance { get; init; }
    public required double Leverage { get; init; }
    public required int MaxOpenPositions { get; init; }
    public required double StopOutLevel { get; init; }
    public required int MaxParallelThreads { get; init; }
    public required long LatencyTicks { get; init; }
    public required int WarmupWindowCount { get; init; }
    public required double[] Genes { get; init; }
    public int? GeneInitializationSeed { get; init; }
    public string? NeuralNetworkName { get; init; }
    public required string[] Timeframes { get; init; }
    public required string AccountCurrency { get; init; }

    /// <summary>
    /// Parses a Cloud command parameter object into a <see cref="BacktestConfiguration"/>.
    /// </summary>
    /// <param name="config">The configuration object (typically a dictionary, JSON element, or string).</param>
    /// <returns>A parsed configuration.</returns>
    public static BacktestConfiguration Parse(object? config)
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
                dict = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonStr);
            }
            catch
            {
            }
        }
        else if (config is JsonElement je && je.ValueKind == JsonValueKind.Object)
        {
            try
            {
                dict = JsonSerializer.Deserialize<Dictionary<string, object>>(je.GetRawText());
            }
            catch
            {
            }
        }

        dict ??= new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

        string adapterName = ConfigurationParser.GetString(dict, "AdapterName");
        if (string.IsNullOrWhiteSpace(adapterName))
        {
            adapterName = ConfigurationParser.GetString(dict, "adapter", "PaperBroker");
        }

        string strategyName = ConfigurationParser.GetString(dict, "StrategyName");
        if (string.IsNullOrWhiteSpace(strategyName))
        {
            strategyName = ConfigurationParser.GetString(dict, "strategy", "TrendFollowing");
        }

        string[] symbols = ConfigurationParser.GetStringArray(dict, "Symbols");
        if (symbols.Length == 0)
        {
            string singleSymbol = ConfigurationParser.GetString(dict, "Symbol");
            symbols = !string.IsNullOrWhiteSpace(singleSymbol) ? [singleSymbol] : ["BTC/USDT"];
        }

        string[] timeframes = ConfigurationParser.GetStringArray(dict, "Timeframes");
        if (timeframes.Length == 0)
        {
            string barSize = ConfigurationParser.GetString(dict, "barSize");
            timeframes = !string.IsNullOrWhiteSpace(barSize) ? [barSize] : ["1m"];
        }

        return new BacktestConfiguration
        {
            AdapterName = adapterName,
            StrategyName = strategyName,
            Symbols = symbols,
            StartDate = ConfigurationParser.GetDateTime(dict, "StartDate", DateTime.UtcNow.AddDays(-30)),
            EndDate = ConfigurationParser.GetDateTime(dict, "EndDate", DateTime.UtcNow),
            InitialBalance = ConfigurationParser.GetDouble(dict, "InitialBalance", ConfigurationParser.GetDouble(dict, "initialCapital", 100000)),
            Leverage = ConfigurationParser.GetDouble(dict, "Leverage", 1.0),
            MaxOpenPositions = ConfigurationParser.GetInt(dict, "MaxOpenPositions", 5),
            StopOutLevel = ConfigurationParser.GetDouble(dict, "StopOutLevel", 0.2),
            MaxParallelThreads = ConfigurationParser.GetInt(dict, "MaxParallelThreads", 0),
            LatencyTicks = ConfigurationParser.GetLong(dict, "LatencyTicks", 0),
            WarmupWindowCount = ConfigurationParser.GetInt(dict, "WarmupWindowCount", 0),
            Genes = ConfigurationParser.GetDoubleArray(dict, "Genes", Array.Empty<double>()),
            GeneInitializationSeed = dict.TryGetValue("GeneInitializationSeed", out object? seedObj) && seedObj is int seed ? seed : (int?)null,
            NeuralNetworkName = dict.TryGetValue("NeuralNetworkName", out object? nnObj) ? nnObj?.ToString() : null,
            Timeframes = timeframes,
            AccountCurrency = ConfigurationParser.GetString(dict, "AccountCurrency", "USD")
        };
    }
}
