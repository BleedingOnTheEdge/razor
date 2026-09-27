// -----------------------------------------------------------------------------
// <copyright file="ExtensionManifestEntry.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// One extension reported by an Engine in its <c>ExtensionManifest</c> message
/// (002-030-090 §10.3 step 8). The reported catalogue is what a profile selection is validated against.
/// </summary>
internal sealed class ExtensionManifestEntry
{
    /// <summary>Gets or sets the manifest entry identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the reporting instance identifier.</summary>
    public Guid EngineInstanceId { get; set; }

    /// <summary>Gets or sets the reporting instance.</summary>
    public EngineInstance? EngineInstance { get; set; }

    /// <summary>Gets or sets the slot the extension occupies.</summary>
    public ExtensionKind Kind { get; set; }

    /// <summary>Gets or sets the extension name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the timestamp of the manifest report that most recently contained the entry.</summary>
    public DateTimeOffset ReportedAt { get; set; }
}
