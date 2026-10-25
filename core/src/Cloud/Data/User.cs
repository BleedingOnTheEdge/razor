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

    /// <summary>Gets or sets the user's role and permission level.</summary>
    public UserRole Role { get; set; } = UserRole.Trader;

    /// <summary>Gets or sets the user's contact email address.</summary>
    public string? Email { get; set; }

    /// <summary>Gets or sets the user's friendly display name.</summary>
    public string? DisplayName { get; set; }

    /// <summary>Gets or sets the user's avatar image URL.</summary>
    public string? AvatarUrl { get; set; }

    /// <summary>Gets or sets the user's profile biography.</summary>
    public string? Bio { get; set; }

    /// <summary>Gets or sets the phone country code prefix.</summary>
    public string? PhoneCountryCode { get; set; }

    /// <summary>Gets or sets the primary mobile phone number.</summary>
    public string? PhoneNumber { get; set; }

    /// <summary>Gets or sets a secondary contact email.</summary>
    public string? SecondaryEmail { get; set; }

    /// <summary>Gets or sets whether two-factor authentication is enabled.</summary>
    public bool TwoFactorEnabled { get; set; }

    /// <summary>Gets or sets the linked Telegram username or chat ID.</summary>
    public string? TelegramHandle { get; set; }

    /// <summary>Gets or sets whether exports/reports sync with Google Drive.</summary>
    public bool GoogleDriveLinked { get; set; }

    /// <summary>Gets or sets whether exports/reports sync with Microsoft OneDrive.</summary>
    public bool OneDriveLinked { get; set; }

    /// <summary>Gets or sets whether OTP login is enabled via SMS or messenger.</summary>
    public bool SmsOtpEnabled { get; set; }
}
