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

            var optInput = new OptimizationInput
            {
                AdapterName = GetString(dict, "AdapterName"),
                StrategyName = GetString(dict, "StrategyName"),
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
                string adapterName = !string.IsNullOrWhiteSpace(optInput.AdapterName) ? optInput.AdapterName : "PaperBroker";
                adapter = _extensionManager.CreateTransientAdapter(adapterName)
                    ?? _extensionManager.CreateTransientAdapter("PaperBroker")
                    ?? throw new InvalidOperationException("No active adapter found.");
            }

            var strategy = _extensionManager.ActiveStrategy;
            if (strategy is null)
            {
                string strategyName = !string.IsNullOrWhiteSpace(optInput.StrategyName) ? optInput.StrategyName : "TrendFollowing";
                strategy = _extensionManager.CreateTransientStrategy(strategyName)
                    ?? _extensionManager.CreateTransientStrategy("TrendFollowing")
                    ?? throw new InvalidOperationException("No active strategy found.");
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

    // Helper methods for parsing config dictionary
    internal static string GetString(Dictionary<string, object> dict, string key, string fallback = "")
    {
        if (dict.TryGetValue(key, out object? value) && value is string s)
        {
            return s;
        }
        return fallback;
    }

    internal static double GetDouble(Dictionary<string, object> dict, string key, double fallback = 0)
    {
        if (dict.TryGetValue(key, out object? value))
        {
            if (value is double d)
            {
                return d;
            }

            if (value is int i)
            {
                return i;
            }

            if (value is long l)
            {
                return l;
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
        if (dict.TryGetValue(key, out object? value))
        {
            if (value is int i)
            {
                return i;
            }

            if (value is long l)
            {
                return (int)l;
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
        if (dict.TryGetValue(key, out object? value))
        {
            if (value is object[] arr)
            {
                return arr.Select(x => x.ToString()!).ToArray();
            }

            if (value is System.Text.Json.JsonElement jsonElement && jsonElement.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                return jsonElement.EnumerateArray().Select(x => x.GetString()!).ToArray();
            }
        }
        return fallback;
    }

    internal static DateTime GetDateTime(Dictionary<string, object> dict, string key, DateTime fallback)
    {
        if (dict.TryGetValue(key, out object? value))
        {
            if (value is DateTime dt)
            {
                return dt;
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
        if (dict.TryGetValue(key, out object? value))
        {
            if (value is bool b)
            {
                return b;
            }

            if (value is string s && bool.TryParse(s, out var parsed))
            {
                return parsed;
            }

            if (value is System.Text.Json.JsonElement element && (element.ValueKind == System.Text.Json.JsonValueKind.True || element.ValueKind == System.Text.Json.JsonValueKind.False))
            {
                return element.GetBoolean();
            }
        }
        return fallback;
    }
}
