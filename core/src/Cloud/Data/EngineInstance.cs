// -----------------------------------------------------------------------------
// <copyright file="EngineInstance.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// A registered, individually authenticated Engine deployment (002-030-160 §17.1 "per engine instance").
/// </summary>
/// <remarks>
/// The instance is identified by two independent keys. <see cref="EngineId"/> is the identifier the Engine
/// generates for itself and reports in every heartbeat; <see cref="ApiKeyHash"/> is the credential the
/// Engine presents when it authenticates. Authentication resolves the instance from the API key, and the
/// heartbeat's <c>EngineId</c> is then checked against <see cref="EngineId"/>, so an API key cannot be
/// replayed by a different Engine binary.
/// </remarks>
internal sealed class EngineInstance
{
    /// <summary>Gets or sets the Cloud-side instance identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the owning account identifier.</summary>
    public Guid AccountId { get; set; }

    /// <summary>Gets or sets the owning account.</summary>
    public Account? Account { get; set; }

    /// <summary>Gets or sets the licensing licence identifier.</summary>
    public Guid LicenseId { get; set; }

    /// <summary>Gets or sets the licensing licence.</summary>
    public License? License { get; set; }

    /// <summary>Gets or sets the stable identifier the Engine generates for itself.</summary>
    public string EngineId { get; set; } = string.Empty;

    /// <summary>Gets or sets the operator supplied display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the hash of the instance API key presented during authentication.</summary>
    public string ApiKeyHash { get; set; } = string.Empty;

    /// <summary>Gets or sets the administrative state.</summary>
    public EngineInstanceStatus Status { get; set; }

    /// <summary>Gets or sets the registration timestamp.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets or sets the timestamp of the most recent authenticated heartbeat.</summary>
    public DateTimeOffset? LastSeenAt { get; set; }

    /// <summary>Gets or sets the profile holding the active extension selections for the instance.</summary>
    public EngineProfile? Profile { get; set; }

    /// <summary>Gets the extensions the instance has reported, one row per discovered extension.</summary>
    public ICollection<ExtensionManifestEntry> ManifestEntries { get; } = [];

    /// <summary>Gets the commands submitted for the instance.</summary>
    public ICollection<EngineCommand> Commands { get; } = [];
}
