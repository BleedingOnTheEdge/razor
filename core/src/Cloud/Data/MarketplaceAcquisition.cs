// -----------------------------------------------------------------------------
// <copyright file="MarketplaceAcquisition.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// A record of an extension acquired or licensed through the Marketplace by an account.
/// </summary>
internal sealed class MarketplaceAcquisition
{
    /// <summary>Gets or sets the primary key.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the acquired item identifier.</summary>
    public Guid MarketplaceItemId { get; set; }

    /// <summary>Gets or sets the acquired catalogue item.</summary>
    public MarketplaceItem? MarketplaceItem { get; set; }

    /// <summary>Gets or sets the acquiring account identifier.</summary>
    public Guid AccountId { get; set; }

    /// <summary>Gets or sets the acquiring account.</summary>
    public Account? Account { get; set; }

    /// <summary>Gets or sets the optional target instance to which the extension is deployed.</summary>
    public Guid? EngineInstanceId { get; set; }

    /// <summary>Gets or sets the optional target engine instance.</summary>
    public EngineInstance? EngineInstance { get; set; }

    /// <summary>Gets or sets the issued licence key or permission token.</summary>
    public string LicenseKey { get; set; } = string.Empty;

    /// <summary>Gets or sets when the acquisition occurred.</summary>
    public DateTimeOffset AcquiredAt { get; set; }
}
