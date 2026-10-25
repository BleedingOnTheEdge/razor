// -----------------------------------------------------------------------------
// <copyright file="BundleSnapshot.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

using System.Text.Json.Serialization;

/// <summary>
/// An immutable state-of-change snapshot of a bundle capturing slots, hooks, configurations,
/// and associated backtested DNAs.
/// </summary>
internal sealed class BundleSnapshot
{
    /// <summary>Gets or sets the snapshot unique identifier.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Gets or sets the associated bundle identifier.</summary>
    public string BundleId { get; set; } = string.Empty;

    /// <summary>Gets or sets the parent bundle.</summary>
    [JsonIgnore]
    public TradingBundle? Bundle { get; set; }

    /// <summary>Gets or sets the version tag (e.g. v1.0.0, v1.1.0).</summary>
    public string Version { get; set; } = "v1.0.0";

    /// <summary>Gets or sets the human-readable snapshot label.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the JSON-serialized state containing slots, hooks, and parameters.</summary>
    public string SnapshotStateJson { get; set; } = "{}";

    /// <summary>Gets or sets the snapshot creation timestamp.</summary>
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Gets the collection of attached parameter DNAs with backtest reports.</summary>
    public ICollection<BundleDna> Dnas { get; } = [];
}
