// -----------------------------------------------------------------------------
// <copyright file="MarketplaceItem.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// An extension listing in the Razor Marketplace catalogue (002-010-001 § Razor Marketplace).
/// </summary>
internal sealed class MarketplaceItem
{
    /// <summary>Gets or sets the primary key.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the extension display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the extension kind (slot type).</summary>
    public ExtensionKind Kind { get; set; }

    /// <summary>Gets or sets the extension semantic version.</summary>
    public string Version { get; set; } = "1.0.0";

    /// <summary>Gets or sets the author or publisher name.</summary>
    public string Author { get; set; } = string.Empty;

    /// <summary>Gets or sets the listing description.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Gets or sets the listing price (0 for free).</summary>
    public decimal Price { get; set; }

    /// <summary>Gets or sets the target SDK version compatibility.</summary>
    public string SdkVersion { get; set; } = "1.0.0";

    /// <summary>Gets or sets a value indicating whether the listing is Razor-curated.</summary>
    public bool IsCurated { get; set; }

    /// <summary>Gets or sets the cumulative download count.</summary>
    public int Downloads { get; set; }

    /// <summary>Gets or sets the user rating (0.0 to 5.0).</summary>
    public double Rating { get; set; } = 5.0;

    /// <summary>Gets or sets when the listing was created.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets or sets the acquisitions for this item.</summary>
    public ICollection<MarketplaceAcquisition> Acquisitions { get; set; } = [];
}
