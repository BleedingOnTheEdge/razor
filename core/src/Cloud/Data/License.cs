// -----------------------------------------------------------------------------
// <copyright file="License.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// A licence entitling an account to run a bounded number of Engine instances
/// (002-030-160 §17.1 "manages user accounts, licenses").
/// </summary>
internal sealed class License
{
    /// <summary>Gets or sets the licence identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the licensed account identifier.</summary>
    public Guid AccountId { get; set; }

    /// <summary>Gets or sets the licensed account.</summary>
    public Account? Account { get; set; }

    /// <summary>Gets or sets the unique licence key.</summary>
    public string LicenseKey { get; set; } = string.Empty;

    /// <summary>Gets or sets the licence state.</summary>
    public LicenseStatus Status { get; set; }

    /// <summary>Gets or sets the issue timestamp.</summary>
    public DateTimeOffset IssuedAt { get; set; }

    /// <summary>Gets or sets the expiry timestamp, or <see langword="null"/> when the licence does not expire.</summary>
    public DateTimeOffset? ExpiresAt { get; set; }

    /// <summary>Gets or sets the maximum number of Engine instances the licence may register.</summary>
    public int MaxInstances { get; set; }

    /// <summary>Gets the Engine instances registered against the licence.</summary>
    public ICollection<EngineInstance> Instances { get; } = [];

    /// <summary>
    /// Gets a value indicating whether the licence entitles an instance to run at the given instant.
    /// </summary>
    /// <param name="instant">The instant to test.</param>
    /// <returns><see langword="true"/> when the licence is active and unexpired at <paramref name="instant"/>.</returns>
    /// <remarks>
    /// An <see cref="LicenseStatus.Active"/> licence with an <see cref="ExpiresAt"/> in the past is treated as
    /// expired rather than active: the stored status is set by an administrator, while the expiry is a
    /// property of time, so a lapsed licence must not keep an Engine running merely because no background
    /// job has moved its status yet.
    /// </remarks>
    internal bool IsRunnableAt(DateTimeOffset instant)
    {
        return Status == LicenseStatus.Active && (ExpiresAt is null || ExpiresAt > instant);
    }
}
