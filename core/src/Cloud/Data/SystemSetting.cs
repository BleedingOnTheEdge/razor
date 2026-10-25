// -----------------------------------------------------------------------------
// <copyright file="SystemSetting.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// A persistent cluster-wide configuration setting managed by administrators.
/// </summary>
internal sealed class SystemSetting
{
    /// <summary>Gets or sets the unique configuration key.</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Gets or sets the setting value (JSON or scalar string).</summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>Gets or sets the logical category (e.g. Fleet, Security, Marketplace, Telemetry).</summary>
    public string Category { get; set; } = "General";

    /// <summary>Gets or sets an operator-facing explanation of the setting.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Gets or sets when the setting was last modified.</summary>
    public DateTimeOffset UpdatedAt { get; set; }
}
