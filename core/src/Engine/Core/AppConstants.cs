namespace Engine.Core;

/// <summary>
/// Application‑wide constants.
/// </summary>
internal static class AppConstants
{
    private static string? _customEndpoint;
    private static string? _customFallbackEndpoint;

    /// <summary>Sets a custom primary endpoint URL.</summary>
    public static void SetPrimaryEndpoint(string endpoint)
    {
        _customEndpoint = endpoint;
    }

    /// <summary>Sets a custom fallback endpoint URL.</summary>
    public static void SetFallbackEndpoint(string endpoint)
    {
        _customFallbackEndpoint = endpoint;
    }

    /// <summary>Primary Cloud endpoint (can be overridden by environment variable or CLI flag).</summary>
    public static string PrimaryEndpoint
    {
        get
        {
            if (!string.IsNullOrWhiteSpace(_customEndpoint))
            {
                return _customEndpoint;
            }

            string? env = Environment.GetEnvironmentVariable("Razor_PRIMARY_ENDPOINT");
            if (!string.IsNullOrWhiteSpace(env))
            {
                return env;
            }

            return "ws://localhost:5000/engine";
        }
    }

    /// <summary>Fallback Cloud endpoint (can be overridden by environment variable or CLI flag).</summary>
    public static string FallbackEndpoint
    {
        get
        {
            if (!string.IsNullOrWhiteSpace(_customFallbackEndpoint))
            {
                return _customFallbackEndpoint;
            }

            string? env = Environment.GetEnvironmentVariable("Razor_FALLBACK_ENDPOINT");
            if (!string.IsNullOrWhiteSpace(env))
            {
                return env;
            }

            return PrimaryEndpoint.Contains("localhost", StringComparison.OrdinalIgnoreCase) ||
                   PrimaryEndpoint.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase)
                ? "ws://127.0.0.1:5000/engine"
                : "wss://cloud.Razor-fallback.io/engine";
        }
    }

    /// <summary>
    /// Directory that binary transfers are saved into (can be overridden by environment variable).
    /// </summary>
    /// <remarks>
    /// Configurable so that two connectors in one process cannot collide on the same file name. With a fixed
    /// directory the second writer fails with a sharing violation instead of saving its file, which is what
    /// happens when a test suite (or two engine instances) receives the same file name.
    /// </remarks>
    public static string DownloadDirectory => Environment.GetEnvironmentVariable("Razor_DOWNLOAD_DIR")
        ?? Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "downloads");

    /// <summary>Default grace period in hours.</summary>
    public const int DefaultGracePeriodHours = 3;

    /// <summary>Default heartbeat interval in seconds.</summary>
    public const int DefaultHeartbeatIntervalSeconds = 10;

    /// <summary>Default chunk size for binary transfers in bytes.</summary>
    public const int DefaultChunkSize = 64 * 1024;

    /// <summary>Default interval for uploading behaviour logs in seconds.</summary>
    public const int DefaultBehaviorUploadIntervalSeconds = 60;

    /// <summary>Engine version.</summary>
    public const string EngineVersion = "1.0.0";

    /// <summary>SDK version.</summary>
    public const string SdkVersion = "1.0.0";

    public static bool IsDevelopment { get; set; }

    // Retry settings
    public const int DefaultRetryDelaySeconds = 1;
    public const int MaxRetryDelaySeconds = 60;

    /// <summary>Supported feature IDs (capabilities).</summary>
    public static readonly int[] SupportedCapabilities =
    [
        100, // Live Trading
        101, // Backtesting
        102, // Optimisation
        103, // Neural Networks
        104, // Hooks
        105, // Cronjobs
        106, // Schedules
        108, // Self-Update
        109, // Log Streaming
        110, // Telemetry Export
        111  // Behavior Logging
    ];
}
