// -----------------------------------------------------------------------------
// <copyright file="AdminSettingsService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using System.Text.Json;
using Cloud.Data;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Strongly-typed cluster settings data transfer object.
/// </summary>
internal sealed class ClusterSettingsDto
{
    // Fleet & Engine Execution
    public int HeartbeatIntervalSeconds { get; set; } = 5;
    public int HeartbeatTimeoutSeconds { get; set; } = 30;
    public int MaxFleetSizePerAccount { get; set; } = 50;
    public int CommandQueueExpirySeconds { get; set; } = 300;
    public int AutoDrainGracePeriodSeconds { get; set; } = 60;

    // Security & Access Control
    public int EnforceStrictKeyRotationDays { get; set; } = 90;
    public bool RequireMfaForLiveTrading { get; set; }
    public bool AllowSelfRegistration { get; set; } = true;
    public string AllowedIpRanges { get; set; } = "*";
    public int SessionTimeoutMinutes { get; set; } = 120;

    // Marketplace & Additives
    public bool RequireCurationApproval { get; set; } = true;
    public double PlatformFeePercent { get; set; } = 5.0;
    public bool AllowUnverifiedAuthors { get; set; }

    // Telemetry & Storage Retention
    public int MetricsRetentionDays { get; set; } = 30;
    public int AuditLogRetentionDays { get; set; } = 365;
    public bool DetailedBehaviorLogging { get; set; } = true;
}

/// <summary>
/// Service managing system configuration and administrative policies.
/// </summary>
internal sealed class AdminSettingsService(
    IDbContextFactory<CloudDbContext> contextFactory,
    TimeProvider timeProvider)
{
    private const string SettingsKey = "Cluster.GlobalSettings";

    /// <summary>
    /// Gets the current cluster configuration settings.
    /// </summary>
    public async Task<ClusterSettingsDto> GetSettingsAsync(CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        SystemSetting? setting = await db.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == SettingsKey, cancellationToken)
            .ConfigureAwait(false);

        if (setting is null || string.IsNullOrWhiteSpace(setting.Value))
        {
            return new ClusterSettingsDto();
        }

        try
        {
            return JsonSerializer.Deserialize<ClusterSettingsDto>(setting.Value) ?? new ClusterSettingsDto();
        }
        catch (JsonException)
        {
            return new ClusterSettingsDto();
        }
    }

    /// <summary>
    /// Updates cluster configuration settings.
    /// </summary>
    public async Task<ClusterSettingsDto> SaveSettingsAsync(ClusterSettingsDto updated, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(updated);

        using CloudDbContext db = contextFactory.CreateDbContext();
        DateTimeOffset now = timeProvider.GetUtcNow();

        SystemSetting? setting = await db.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == SettingsKey, cancellationToken)
            .ConfigureAwait(false);

        string json = JsonSerializer.Serialize(updated);

        if (setting is null)
        {
            setting = new SystemSetting
            {
                Key = SettingsKey,
                Category = "Cluster",
                Description = "Global platform configuration policies",
                Value = json,
                UpdatedAt = now
            };
            db.SystemSettings.Add(setting);
        }
        else
        {
            setting.Value = json;
            setting.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return updated;
    }

    /// <summary>
    /// Resets cluster configuration settings to system defaults.
    /// </summary>
    public async Task<ClusterSettingsDto> ResetDefaultsAsync(CancellationToken cancellationToken = default)
    {
        var defaults = new ClusterSettingsDto();
        return await SaveSettingsAsync(defaults, cancellationToken).ConfigureAwait(false);
    }
}
