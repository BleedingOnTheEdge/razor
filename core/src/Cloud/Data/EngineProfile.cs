// -----------------------------------------------------------------------------
// <copyright file="EngineProfile.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// The per-instance profile holding the user's active adapter, strategy, indicator, neural network and
/// hook plugin selections (002-030-160 §17.1; applied by 002-030-090 §10.3 step 10).
/// </summary>
internal sealed class EngineProfile
{
    /// <summary>Gets or sets the profile identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the owning instance identifier.</summary>
    public Guid EngineInstanceId { get; set; }

    /// <summary>Gets or sets the owning instance.</summary>
    public EngineInstance? EngineInstance { get; set; }

    /// <summary>Gets the configured selections, active and inactive.</summary>
    public ICollection<ProfileSelection> Selections { get; } = [];
}

/// <summary>
/// One candidate extension in an <see cref="EngineProfile"/>, with a flag marking it as selected.
/// </summary>
/// <remarks>
/// The <see cref="ExtensionKind"/> values whose slots hold a single extension are mutually exclusive by
/// construction — see <see cref="Cloud.Services.ProfileService"/>, which deactivates the previous holder
/// when a new one is activated.
/// </remarks>
internal sealed class ProfileSelection
{
    /// <summary>Gets or sets the selection identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the owning profile identifier.</summary>
    public Guid EngineProfileId { get; set; }

    /// <summary>Gets or sets the owning profile.</summary>
    public EngineProfile? EngineProfile { get; set; }

    /// <summary>Gets or sets the slot the selection belongs to.</summary>
    public ExtensionKind Kind { get; set; }

    /// <summary>Gets or sets the extension name, as reported by the Engine's manifest.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether the extension is selected.</summary>
    public bool IsActive { get; set; }
}
