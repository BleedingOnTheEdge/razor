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

    // Messengers & Bots
    public string TelegramBotToken { get; set; } = string.Empty;
    public string TelegramDefaultChannel { get; set; } = string.Empty;
    public string DiscordWebhookUrl { get; set; } = string.Empty;
    public string SlackWebhookUrl { get; set; } = string.Empty;
    public bool EnableMessengerAlerts { get; set; } = true;

    // SMS Gateways
    public string SmsProvider { get; set; } = "Twilio";
    public string SmsApiKey { get; set; } = string.Empty;
    public string SmsSenderNumber { get; set; } = string.Empty;
    public bool EnableSmsAlerts { get; set; }

    // Payment Providers
    public string PaymentProvider { get; set; } = "Stripe";
    public string PaymentPublicKey { get; set; } = string.Empty;
    public string PaymentSecretKey { get; set; } = string.Empty;
    public string PaymentWebhookSecret { get; set; } = string.Empty;
    public string PaymentCurrency { get; set; } = "USD";

    // Dynamic Subscription Tiers Configuration (JSON)
    public string SubscriptionTiersJson { get; set; } = """
        [
          {"tier":"Free","priceMonthly":0,"maxInstances":1,"allowLiveTrading":false,"allowOptimization":true,"storageDays":7},
          {"tier":"Pro","priceMonthly":49,"maxInstances":5,"allowLiveTrading":true,"allowOptimization":true,"storageDays":90},
          {"tier":"Enterprise","priceMonthly":299,"maxInstances":50,"allowLiveTrading":true,"allowOptimization":true,"storageDays":365}
        ]
        """;
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
