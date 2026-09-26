// -----------------------------------------------------------------------------
// <copyright file="Account.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// A customer account: the tenant that owns users, licences and Engine instances
/// (002-030-160 §17.1 "manages user accounts, licenses").
/// </summary>
internal sealed class Account
{
    /// <summary>Gets or sets the account identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the human readable account name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the creation timestamp.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets the users that may sign in to the account.</summary>
    public ICollection<User> Users { get; } = [];

    /// <summary>Gets the licences issued to the account.</summary>
    public ICollection<License> Licenses { get; } = [];

    /// <summary>Gets the Engine instances registered under the account.</summary>
    public ICollection<EngineInstance> Instances { get; } = [];
}
