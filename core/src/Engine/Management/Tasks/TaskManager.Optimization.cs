// -----------------------------------------------------------------------------
// <copyright file="TaskManager.Optimization.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Management.Tasks;

using Engine.Core;
using Engine.Core.Exceptions;
using Engine.Kernel;
using global::Kernel.Optimization;
using Microsoft.Extensions.Logging;
using System.Text.Json;

internal sealed partial class TaskManager
{
    /// <inheritdoc/>
    public async Task<string> StartOptimizationTaskAsync(object config, CancellationToken cancellationToken)
    {
        var taskId = $"opt_{Guid.NewGuid():N}";
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            // Parse configuration into OptimizationInput
            Dictionary<string, object>? dict = config as Dictionary<string, object>;
            if (dict is null && config is string jsonStr && !string.IsNullOrWhiteSpace(jsonStr))
            {
                try
                {
                    dict = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonStr);
                }
                catch
                {
                    throw new ArgumentException("Configuration must be a dictionary or valid JSON object.", nameof(config));
                }
            }
            else if (dict is null && config is JsonElement je && je.ValueKind == JsonValueKind.Object)
            {
                try
                {
                    dict = JsonSerializer.Deserialize<Dictionary<string, object>>(je.GetRawText());
                }
                catch
                {
                    throw new ArgumentException("Configuration must be a dictionary or valid JSON object.", nameof(config));
                }
            }

            if (dict is null)
            {
                throw new ArgumentException("Configuration must be a dictionary.", nameof(config));
            }

            bool isSteppable = GetBool(dict, "IsSteppable", false);
            GeneticOptimizerState? initialState = null;
            if (dict.TryGetValue("InitialState", out object? initStateObj) && initStateObj is GeneticOptimizerState st)
            {
                initialState = st;
            }

            string resolvedAdapter = GetString(dict, "AdapterName");
            if (string.IsNullOrWhiteSpace(resolvedAdapter))
            {
                if (TryGetValueIgnoreCase(dict, "adapter", out object? aVal))
                {
                    if (aVal is System.Text.Json.JsonElement aJe)
                    {
                        if (aJe.ValueKind == System.Text.Json.JsonValueKind.String)
                        {
                            resolvedAdapter = aJe.GetString() ?? "";
                        }
                        else if (aJe.ValueKind == System.Text.Json.JsonValueKind.Object &&
                                 (aJe.TryGetProperty("name", out var np) || aJe.TryGetProperty("Name", out np)))
                        {
                            resolvedAdapter = np.GetString() ?? "";
                        }
                    }
                    else if (aVal is Dictionary<string, object> aDict)
                    {
                        if ((aDict.TryGetValue("name", out object? np) || aDict.TryGetValue("Name", out np)) && np != null)
                        {
                            resolvedAdapter = np.ToString() ?? "";
                        }
                    }
                    else if (aVal is string asStr)
                    {
                        resolvedAdapter = asStr;
                    }
                }
            }
            if (string.IsNullOrWhiteSpace(resolvedAdapter) || resolvedAdapter.Equals("PaperBroker", StringComparison.OrdinalIgnoreCase))
            {
                resolvedAdapter = "MockPaperTradingAdapter";
            }

            string resolvedStrategy = GetString(dict, "StrategyName");
            if (string.IsNullOrWhiteSpace(resolvedStrategy))
            {
                if (TryGetValueIgnoreCase(dict, "strategy", out object? sVal))
                {
                    if (sVal is System.Text.Json.JsonElement sJe)
                    {
                        if (sJe.ValueKind == System.Text.Json.JsonValueKind.String)
                        {
                            resolvedStrategy = sJe.GetString() ?? "";
                        }
                        else if (sJe.ValueKind == System.Text.Json.JsonValueKind.Object &&
                                 (sJe.TryGetProperty("name", out var np) || sJe.TryGetProperty("Name", out np)))
                        {
                            resolvedStrategy = np.GetString() ?? "";
                        }
                    }
                    else if (sVal is Dictionary<string, object> sDict)
                    {
                        if ((sDict.TryGetValue("name", out object? np) || sDict.TryGetValue("Name", out np)) && np != null)
                        {
                            resolvedStrategy = np.ToString() ?? "";
                        }
                    }
                    else if (sVal is string ssStr)
                    {
                        resolvedStrategy = ssStr;
                    }
                }
            }
            if (string.IsNullOrWhiteSpace(resolvedStrategy))
            {
                resolvedStrategy = "TrendFollowing";
            }

            var optInput = new OptimizationInput
            {
                AdapterName = resolvedAdapter,
                StrategyName = resolvedStrategy,
                StrategyConfig = config,
                Leverage = GetDouble(dict, "Leverage", 100),
                InitialBalance = GetDouble(dict, "InitialBalance", 10000),
                Symbols = GetStringArray(dict, "Symbols", ["EURUSD"]),
                MasterSeed = GetInt(dict, "MasterSeed", 42),
                Generations = GetInt(dict, "Generations", 10),
                PopulationSize = GetInt(dict, "PopulationSize", 50),
                MutationRate = GetDouble(dict, "MutationRate", 0.1),
                CrossoverRate = GetDouble(dict, "CrossoverRate", 0.5),
                ElitismPct = GetDouble(dict, "ElitismPct", 0.05),
                TournamentSize = GetInt(dict, "TournamentSize", 3),
                StagnationGenerationsBeforeHyper = GetInt(dict, "StagnationGenerationsBeforeHyper", 3),
                MaxParallelThreads = GetInt(dict, "MaxParallelThreads", 0),
                NeuralNetworkName = GetString(dict, "NeuralNetworkName", string.Empty),
                StartDate = GetDateTime(dict, "StartDate", DateTime.UtcNow.AddDays(-30)),
                EndDate = GetDateTime(dict, "EndDate", DateTime.UtcNow),
                Timeframes = GetStringArray(dict, "Timeframes", ["M1"]),
                AccountCurrency = GetString(dict, "AccountCurrency", "USD"),
                IsSteppable = isSteppable,
                InitialState = initialState
            };

            // Get active adapter and strategy
            var adapter = _extensionManager.ActiveAdapter;
            if (adapter is null)
            {
                adapter = _extensionManager.CreateTransientAdapter(resolvedAdapter)
                    ?? _extensionManager.CreateTransientAdapter("MockPaperTradingAdapter")
                    ?? _extensionManager.CreateTransientAdapter("PaperBroker")
                    ?? new Sdk.Slots.Adapter.MockPaperTradingAdapter();
            }

            var strategy = _extensionManager.ActiveStrategy;
            if (strategy is null)
            {
#pragma warning disable CA2000
                strategy = _extensionManager.CreateTransientStrategy(resolvedStrategy)
                    ?? _extensionManager.CreateTransientStrategy("TrendFollowing")
                    ?? _extensionManager.CreateTransientStrategy("TrendFollowingStrategy")
                    ?? ((resolvedStrategy.Contains("Mean", StringComparison.OrdinalIgnoreCase) || resolvedStrategy.Contains("Pairs", StringComparison.OrdinalIgnoreCase))
                        ? new Sdk.Slots.Strategy.MeanRevertingPairsStrategy()
                        : new Sdk.Slots.Strategy.TrendFollowingStrategy());
#pragma warning restore CA2000
            }

            // Start via kernel service
            string kernelTaskId = await _kernelService.StartOptimizationAsync(optInput, cancellationToken).ConfigureAwait(false);

            string? initialFingerprint = initialState != null ? CheckpointFingerprint.Compute(initialState) : null;
            var task = new OptimizationTask(
                taskId,
                config ?? new object(),
                _loggerFactory.CreateLogger<OptimizationTask>(),
                this,
                _kernelService,
                kernelTaskId,
                isSteppable: isSteppable,
                initialFingerprint: initialFingerprint);
            _tasks[taskId] = task;
            _ = Task.Run(() => ExecuteTaskAsync(task, cancellationToken), cancellationToken);

            // Persist initial state
            var state = new OptimizationState
            {
                TaskId = taskId,
                Config = config ?? new object(),
                OptimizerState = initialState,
                Population = initialState?.Population ?? new object(),
                CurrentGeneration = initialState?.CurrentGeneration ?? 0,
                BestFitness = initialState?.BestOverallFitness ?? 0.0,
                StartTime = task.StartTime,
                CheckpointFingerprint = initialFingerprint,
                Diverged = false,
                Interventions = Array.Empty<InterventionRecord>()
            };
            await _stateManager.SaveOptimizationStateAsync(taskId, state, cancellationToken).ConfigureAwait(false);
            return taskId;
        }
        finally
        {
            _lock.Release();
        }
    }

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

    // Helper methods for parsing config dictionary
    internal static string GetString(Dictionary<string, object> dict, string key, string fallback = "")
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value))
        {
            if (value is string s)
            {
                return s;
            }

            if (value is System.Text.Json.JsonElement je)
            {
                if (je.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    return je.GetString() ?? fallback;
                }
                return je.ToString();
            }

            if (value != null)
            {
                return value.ToString() ?? fallback;
            }
        }
        return fallback;
    }

    internal static double GetDouble(Dictionary<string, object> dict, string key, double fallback = 0)
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value))
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

            if (value is System.Text.Json.JsonElement je)
            {
                if (je.ValueKind == System.Text.Json.JsonValueKind.Number && je.TryGetDouble(out var dVal))
                {
                    return dVal;
                }
                if (je.ValueKind == System.Text.Json.JsonValueKind.String && double.TryParse(je.GetString(), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var psVal))
                {
                    return psVal;
                }
            }

            if (value is string s && double.TryParse(s, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
            {
                return parsed;
            }
        }
        return fallback;
    }

    internal static int GetInt(Dictionary<string, object> dict, string key, int fallback = 0)
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value))
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
                return (int)d;
            }

            if (value is System.Text.Json.JsonElement je)
            {
                if (je.ValueKind == System.Text.Json.JsonValueKind.Number && je.TryGetInt32(out var iVal))
                {
                    return iVal;
                }
                if (je.ValueKind == System.Text.Json.JsonValueKind.String && int.TryParse(je.GetString(), System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out var psVal))
                {
                    return psVal;
                }
            }

            if (value is string s && int.TryParse(s, System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
            {
                return parsed;
            }
        }
        return fallback;
    }

    internal static string[] GetStringArray(Dictionary<string, object> dict, string key, string[] fallback)
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value))
        {
            if (value is string[] sa)
            {
                return sa;
            }

            if (value is object[] arr)
            {
                return arr.Select(x => x.ToString()!).ToArray();
            }

            if (value is IEnumerable<string> es)
            {
                return es.ToArray();
            }

            if (value is System.Text.Json.JsonElement jsonElement && jsonElement.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                return jsonElement.EnumerateArray().Select(x => x.ValueKind == System.Text.Json.JsonValueKind.String ? (x.GetString() ?? string.Empty) : x.ToString()).ToArray();
            }
        }
        return fallback;
    }

    internal static DateTime GetDateTime(Dictionary<string, object> dict, string key, DateTime fallback)
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value))
        {
            if (value is DateTime dt)
            {
                return dt;
            }

            if (value is System.Text.Json.JsonElement je)
            {
                if (je.ValueKind == System.Text.Json.JsonValueKind.String && je.TryGetDateTime(out var dtVal))
                {
                    return DateTime.SpecifyKind(dtVal, DateTimeKind.Utc);
                }
                if (je.ValueKind == System.Text.Json.JsonValueKind.String && DateTime.TryParse(je.GetString(), System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var pVal))
                {
                    return DateTime.SpecifyKind(pVal, DateTimeKind.Utc);
                }
            }

            if (value is string s && DateTime.TryParse(s, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal, out var parsed))
            {
                return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
            }
        }
        return fallback;
    }

    internal static bool GetBool(Dictionary<string, object> dict, string key, bool fallback = false)
    {
        if (TryGetValueIgnoreCase(dict, key, out object? value))
        {
            if (value is bool b)
            {
                return b;
            }

            if (value is System.Text.Json.JsonElement element)
            {
                if (element.ValueKind == System.Text.Json.JsonValueKind.True)
                {
                    return true;
                }
                if (element.ValueKind == System.Text.Json.JsonValueKind.False)
                {
                    return false;
                }
                if (element.ValueKind == System.Text.Json.JsonValueKind.String && bool.TryParse(element.GetString(), out var pb))
                {
                    return pb;
                }
            }

            if (value is string s && bool.TryParse(s, out var parsed))
            {
                return parsed;
            }
        }
        return fallback;
    }
}
