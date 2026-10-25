// -----------------------------------------------------------------------------
// <copyright file="BundleDna.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

using System.Text.Json.Serialization;

/// <summary>
/// A parameter DNA attached to a bundle snapshot, carrying backtest badges and performance indicators.
/// </summary>
internal sealed class BundleDna
{
    /// <summary>Gets or sets the DNA record identifier.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Gets or sets the parent snapshot identifier.</summary>
    public Guid BundleSnapshotId { get; set; }

    /// <summary>Gets or sets the parent bundle snapshot.</summary>
    [JsonIgnore]
    public BundleSnapshot? BundleSnapshot { get; set; }

    /// <summary>Gets or sets the DNA lineage identifier or hash.</summary>
    public string DnaId { get; set; } = string.Empty;

    /// <summary>Gets or sets the DNA name or descriptor.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the parameters JSON payload.</summary>
    public string ParametersJson { get; set; } = "{}";

    /// <summary>Gets or sets the verification status badge: Untested, Tested, or Backtested.</summary>
    public string BacktestStatus { get; set; } = "Untested";

    /// <summary>Gets or sets the fitness score if evaluated.</summary>
    public double? Fitness { get; set; }

    /// <summary>Gets or sets the net profit recorded in the report.</summary>
    public decimal? NetProfit { get; set; }

    /// <summary>Gets or sets a markdown or text summary of the backtest report.</summary>
    public string? ReportSummary { get; set; }

    /// <summary>Gets or sets the attachment timestamp.</summary>
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
