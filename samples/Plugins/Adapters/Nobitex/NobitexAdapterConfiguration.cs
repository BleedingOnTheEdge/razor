using Sdk.Shared;
using System.Diagnostics.CodeAnalysis;

namespace Samples.Plugins.Adapters.Nobitex;

/// <summary>
/// Immutable configuration for a Nobitex exchange adapter instance.
/// </summary>
[SuppressMessage("Design", "CA1812:Avoid uninstantiated internal classes",
    Justification = "Instantiated by NobitexAdapter or plugin loader.")]
internal sealed record NobitexAdapterConfiguration
{
    /// <summary>Nobitex API token/key.</summary>
    public string ApiKey { get; init; } = string.Empty;

    /// <summary>Nobitex API secret.</summary>
    public string ApiSecret { get; init; } = string.Empty;

    /// <summary>Base URL for the Nobitex API.</summary>
    [SuppressMessage("Design", "CA1056:URI-like properties should not be strings",
        Justification = "Endpoint URI represented as string for configuration ease.")]
    public string BaseUrl { get; init; } = "https://api.nobitex.ir";

    /// <summary>Directory path where historical tick binaries are stored.</summary>
    public string HistoryCachePath { get; init; } = "NobitexCache";

    /// <summary>Request timeout in milliseconds.</summary>
    public int TimeoutMs { get; init; } = 10000;

    /// <summary>Interval between reconnection attempts in milliseconds.</summary>
    public int ReconnectIntervalMs { get; init; } = 3000;

    /// <summary>Maximum reconnection attempts before giving up.</summary>
    public int MaxReconnectAttempts { get; init; } = 10;

    /// <summary>Whether to operate in paper simulation mode.</summary>
    public bool EnablePaperTrading { get; init; } = true;

    /// <summary>Validates the configuration parameters.</summary>
    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(BaseUrl))
            throw new ConfigurationException("BaseUrl must not be empty.");
        if (TimeoutMs < 1000)
            throw new ConfigurationException("TimeoutMs must be at least 1000ms.");
        if (ReconnectIntervalMs < 100)
            throw new ConfigurationException("ReconnectIntervalMs must be at least 100ms.");
        if (MaxReconnectAttempts < 0)
            throw new ConfigurationException("MaxReconnectAttempts cannot be negative.");
        if (string.IsNullOrWhiteSpace(HistoryCachePath))
            throw new ConfigurationException("HistoryCachePath must not be empty.");
    }
}
