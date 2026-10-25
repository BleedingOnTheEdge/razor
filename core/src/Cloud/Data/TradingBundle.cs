// -----------------------------------------------------------------------------
// <copyright file="TradingBundle.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// A pre-configured bundle of trading strategy slots, adapters, hook interceptors,
/// and default parameter configurations that can be deployed to engines or published to marketplace.
/// </summary>
internal sealed class TradingBundle
{
    /// <summary>Gets or sets the unique alphanumeric identifier (8-12 characters).</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Gets or sets the owning customer account identifier.</summary>
    public Guid AccountId { get; set; }

    /// <summary>Gets or sets the human-readable bundle name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the bundle description.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Gets or sets the package documentation markdown text.</summary>
    public string DocumentationMarkdown { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether the bundle is publicly discoverable.</summary>
    public bool IsPublic { get; set; }

    /// <summary>Gets or sets a value indicating whether the bundle is published to the marketplace.</summary>
    public bool PublishedToMarketplace { get; set; }

    /// <summary>Gets or sets the price of the bundle.</summary>
    public decimal Price { get; set; }

    /// <summary>Gets or sets the price currency (IRT, USDT, USD, Free).</summary>
    public string Currency { get; set; } = "Free";

    /// <summary>Gets or sets the primary strategy slot identifier.</summary>
    public string StrategySlotId { get; set; } = string.Empty;

    /// <summary>Gets or sets the JSON-serialized array of adapter slot identifiers.</summary>
    public string AdapterSlotIdsJson { get; set; } = "[]";

    /// <summary>Gets or sets the JSON-serialized array of hook interceptor identifiers.</summary>
    public string HookSlotIdsJson { get; set; } = "[]";

    /// <summary>Gets or sets the JSON-serialized key-value map of default parameters and genes.</summary>
    public string DefaultConfigurationsJson { get; set; } = "{}";

    /// <summary>Gets or sets the creation timestamp.</summary>
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Gets or sets the update timestamp.</summary>
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Gets the collection of historical snapshots associated with this bundle.</summary>
    public ICollection<BundleSnapshot> Snapshots { get; } = [];
}
