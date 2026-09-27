// -----------------------------------------------------------------------------
// <copyright file="User.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// A user that owns or administers Engine instances (002-030-160 §17.1 "manages user accounts").
/// </summary>
/// <remarks>
/// The user name and password are the credentials the Engine presents in the <c>Auth</c> payload
/// (002-020-020 §3.3 step 1), so the user name is globally unique across accounts: the Engine sends a
/// user name and an instance API key with no account qualifier, and a per-account unique name could not
/// be resolved from those credentials alone.
/// </remarks>
internal sealed class User
{
    /// <summary>Gets or sets the user identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the owning account identifier.</summary>
    public Guid AccountId { get; set; }

    /// <summary>Gets or sets the owning account.</summary>
    public Account? Account { get; set; }

    /// <summary>Gets or sets the globally unique sign-in name.</summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>Gets or sets the salted password hash produced by <c>IPasswordHasher&lt;User&gt;</c>.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>Gets or sets the creation timestamp.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets or sets a value indicating whether the user may authenticate.</summary>
    public bool IsActive { get; set; } = true;
}
