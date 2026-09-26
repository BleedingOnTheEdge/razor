// -----------------------------------------------------------------------------
// <copyright file="CloudOptions.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud;

using System.Globalization;
using Microsoft.Extensions.Configuration;

/// <summary>
/// The configuration the Cloud control plane needs to run.
/// </summary>
/// <remarks>
/// <para>
/// Secrets are read from the environment first (<see cref="ConnectionStringVariable"/>,
/// <see cref="ManagementApiKeyVariable"/>) and only then from configuration, so that a deployment can
/// inject them without writing them into <c>appsettings.json</c>. No secret has a default: the
/// application refuses to start when either is missing, which keeps a misconfigured deployment from
/// serving the management API without authentication.
/// </para>
/// <para>
/// This is a plain object rather than an <c>IOptions</c>-bound type so that the configuration surface is
/// explicit and so tests can construct it directly without a configuration provider.
/// </para>
/// </remarks>
internal sealed class CloudOptions
{
    /// <summary>The configuration section that carries the non-secret Cloud settings.</summary>
    internal const string SectionName = "Cloud";

    /// <summary>The environment variable that supplies the PostgreSQL connection string.</summary>
    internal const string ConnectionStringVariable = "CLOUD_DB_CONNECTION";

    /// <summary>The environment variable that supplies the management API key.</summary>
    internal const string ManagementApiKeyVariable = "CLOUD_MANAGEMENT_API_KEY";

    /// <summary>The environment variable that supplies the required capability list.</summary>
    internal const string RequiredCapabilitiesVariable = "CLOUD_REQUIRED_CAPABILITIES";

    /// <summary>
    /// The heartbeat interval Cloud asks an Engine to use, in seconds.
    /// </summary>
    /// <remarks>
    /// The default matches <c>Engine.Core.AppConstants.DefaultHeartbeatIntervalSeconds</c>, so an Engine
    /// that has never been reconfigured keeps its own cadence (002-020-020 §3.4).
    /// </remarks>
    internal const int DefaultHeartbeatIntervalSeconds = 10;

    /// <summary>
    /// How long a command may stay queued before Cloud gives up on it, in seconds.
    /// </summary>
    /// <remarks>
    /// Delivery is fire-and-forget: the Engine acknowledges nothing when it accepts a <c>Command</c>
    /// message, and the protocol has no re-delivery. Command delivery is bound to a single session, so
    /// this is the Cloud-side bound on a command queue that can never drain because the target Engine
    /// stopped reporting.
    /// </remarks>
    internal const int DefaultCommandQueueExpirySeconds = 3600;

    /// <summary>The number of queued commands Cloud hands to an Engine in one heartbeat response.</summary>
    internal const int DefaultCommandBatchSize = 16;

    /// <summary>
    /// How long Cloud waits for an <c>ActivateExtensions</c> command to be answered, in seconds.
    /// </summary>
    /// <remarks>
    /// Activation loads and inspects assemblies on the Engine, so it is slower than a pure state change but
    /// still bounded. Without a timeout a lost activation answer would leave the command dispatched for
    /// ever, because delivery is not acknowledged.
    /// </remarks>
    internal const int DefaultActivateExtensionsTimeoutSeconds = 60;

    /// <summary>Gets or sets the PostgreSQL connection string.</summary>
    public string? ConnectionString { get; set; }

    /// <summary>Gets or sets the shared secret that authenticates callers of the management API.</summary>
    public string? ManagementApiKey { get; set; }

    /// <summary>
    /// Gets the capability identifiers the Engine must support to authenticate (002-020-020 §3.3 step 2).
    /// </summary>
    /// <remarks>
    /// The setter is internal because <see cref="FromConfiguration"/> populates the list; callers outside
    /// the assembly get a read-only view.
    /// </remarks>
    public IReadOnlyList<int> RequiredCapabilities { get; internal set; } = [];

    /// <summary>Gets or sets the heartbeat interval Cloud asks an Engine to use, in seconds.</summary>
    public int HeartbeatIntervalSeconds { get; set; } = DefaultHeartbeatIntervalSeconds;

    /// <summary>Gets or sets how long a queued command may wait before it is failed, in seconds.</summary>
    public int CommandQueueExpirySeconds { get; set; } = DefaultCommandQueueExpirySeconds;

    /// <summary>Gets or sets the number of queued commands delivered in one delivery batch.</summary>
    public int CommandBatchSize { get; set; } = DefaultCommandBatchSize;

    /// <summary>Gets or sets the timeout Cloud applies to an <c>ActivateExtensions</c> command, in seconds.</summary>
    public int ActivateExtensionsTimeoutSeconds { get; set; } = DefaultActivateExtensionsTimeoutSeconds;

    /// <summary>
    /// Builds the options from the environment and the application configuration.
    /// </summary>
    /// <param name="configuration">The application configuration.</param>
    /// <returns>The populated options.</returns>
    /// <exception cref="ArgumentNullException"><paramref name="configuration"/> is <see langword="null"/>.</exception>
    /// <exception cref="InvalidOperationException">A configured value is not parseable.</exception>
    internal static CloudOptions FromConfiguration(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var options = new CloudOptions
        {
            ConnectionString = Environment.GetEnvironmentVariable(ConnectionStringVariable)
                ?? configuration[$"{SectionName}:ConnectionString"],
            ManagementApiKey = Environment.GetEnvironmentVariable(ManagementApiKeyVariable)
                ?? configuration[$"{SectionName}:ManagementApiKey"],
            HeartbeatIntervalSeconds = ReadPositiveInt(
                configuration[$"{SectionName}:HeartbeatIntervalSeconds"],
                DefaultHeartbeatIntervalSeconds,
                "HeartbeatIntervalSeconds"),
            CommandQueueExpirySeconds = ReadPositiveInt(
                configuration[$"{SectionName}:CommandQueueExpirySeconds"],
                DefaultCommandQueueExpirySeconds,
                "CommandQueueExpirySeconds"),
            CommandBatchSize = ReadPositiveInt(
                configuration[$"{SectionName}:CommandBatchSize"],
                DefaultCommandBatchSize,
                "CommandBatchSize"),
            ActivateExtensionsTimeoutSeconds = ReadPositiveInt(
                configuration[$"{SectionName}:ActivateExtensionsTimeoutSeconds"],
                DefaultActivateExtensionsTimeoutSeconds,
                "ActivateExtensionsTimeoutSeconds")
        };

        string capabilityList = Environment.GetEnvironmentVariable(RequiredCapabilitiesVariable)
            ?? configuration[$"{SectionName}:RequiredCapabilities"]
            ?? string.Empty;
        options.RequiredCapabilities = ParseCapabilities(capabilityList);

        return options;
    }

    /// <summary>
    /// Verifies that the options are complete enough to start the service.
    /// </summary>
    /// <exception cref="InvalidOperationException">A required setting is missing.</exception>
    internal void Validate()
    {
        if (string.IsNullOrWhiteSpace(ConnectionString))
        {
            throw new InvalidOperationException(
                $"No PostgreSQL connection string is configured. Set {ConnectionStringVariable} or {SectionName}:ConnectionString.");
        }

        if (string.IsNullOrWhiteSpace(ManagementApiKey))
        {
            throw new InvalidOperationException(
                $"No management API key is configured. Set {ManagementApiKeyVariable} or {SectionName}:ManagementApiKey. "
                + "The management API is not served without one, because it can register Engine instances and issue their credentials.");
        }
    }

    private static int ReadPositiveInt(string? configuredValue, int fallback, string settingName)
    {
        if (string.IsNullOrWhiteSpace(configuredValue))
        {
            return fallback;
        }

        if (!int.TryParse(configuredValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out int value) || value <= 0)
        {
            throw new InvalidOperationException(
                $"The configuration value {SectionName}:{settingName} must be a positive integer, but was '{configuredValue}'.");
        }

        return value;
    }

    private static List<int> ParseCapabilities(string capabilityList)
    {
        List<int> capabilities = [];
        foreach (string entry in capabilityList.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!int.TryParse(entry, NumberStyles.Integer, CultureInfo.InvariantCulture, out int capabilityId))
            {
                throw new InvalidOperationException(
                    $"The required capability list contains a value that is not an integer: '{entry}'.");
            }

            capabilities.Add(capabilityId);
        }

        return capabilities;
    }
}
