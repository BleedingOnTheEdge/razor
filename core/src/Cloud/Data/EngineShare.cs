// -----------------------------------------------------------------------------
// <copyright file="EngineShare.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// Represents a temporary access delegation grant for an Engine instance.
/// Allows an engine owner to grant another user time-bounded access to controls and flow execution.
/// </summary>
internal sealed class EngineShare
{
    /// <summary>Gets or sets the unique share identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the target engine instance identifier.</summary>
    public Guid EngineInstanceId { get; set; }

    /// <summary>Gets or sets the target engine instance.</summary>
    public EngineInstance? EngineInstance { get; set; }

    /// <summary>Gets or sets the owner account identifier.</summary>
    public Guid OwnerAccountId { get; set; }

    /// <summary>Gets or sets the user ID the engine is shared with (optional if shared by email).</summary>
    public Guid? SharedWithUserId { get; set; }

    /// <summary>Gets or sets the email address the engine is shared with.</summary>
    public string SharedWithEmail { get; set; } = string.Empty;

    /// <summary>Gets or sets the timestamp when the share was created.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets or sets the expiration timestamp in UTC.</summary>
    public DateTimeOffset ExpiresAtUtc { get; set; }

    /// <summary>Gets or sets whether the recipient can inspect telemetry, reports, and instance status.</summary>
    public bool CanRead { get; set; } = true;

    /// <summary>Gets or sets whether the recipient can send operational control commands (e.g. pause, resume, config).</summary>
    public bool CanControl { get; set; } = true;

    /// <summary>Gets or sets whether the recipient can launch flow runs (Backtest, Live, Optimization).</summary>
    public bool CanRunFlows { get; set; } = true;

    /// <summary>Gets or sets whether the share has been manually revoked before expiration.</summary>
    public bool IsRevoked { get; set; }

    /// <summary>Gets whether the share is currently active and not expired.</summary>
    public bool IsActive(DateTimeOffset now) => !IsRevoked && ExpiresAtUtc > now;
}
