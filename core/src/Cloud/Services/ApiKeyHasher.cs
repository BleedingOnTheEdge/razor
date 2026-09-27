// -----------------------------------------------------------------------------
// <copyright file="ApiKeyHasher.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using System.Security.Cryptography;

/// <summary>
/// Generates and hashes the per-instance API keys an Engine presents in its <c>Auth</c> payload
/// (002-020-020 §3.3 step 1).
/// </summary>
/// <remarks>
/// <para>
/// An API key is 256 bits from <see cref="RandomNumberGenerator"/> and is stored only as a SHA-256 hash.
/// A single, unsalted SHA-256 pass is deliberate and is not the same trade-off as for a user password:
/// the key space is 2^256, so there is no guessing or dictionary attack to slow down, and the hash
/// cannot be reversed to a usable credential if the table leaks. A password, by contrast, is chosen by a
/// human and is hashed with a slow, salted algorithm (see <see cref="EngineAuthenticationService"/>).
/// </para>
/// <para>
/// Hashes are compared through the stored value rather than a fixed-time comparison because the lookup is
/// an indexed equality match on a high-entropy secret, not a byte-by-byte comparison of a value under
/// attack.
/// </para>
/// </remarks>
internal static class ApiKeyHasher
{
    /// <summary>The entropy of a generated API key, in bytes.</summary>
    internal const int KeySizeBytes = 32;

    private const int HashSizeBytes = 32;

    /// <summary>
    /// Generates a new instance API key.
    /// </summary>
    /// <returns>A base64 encoded, 256-bit random key. Only its <see cref="Hash"/> is ever stored.</returns>
    internal static string GenerateKey()
    {
        byte[] key = new byte[KeySizeBytes];
        RandomNumberGenerator.Fill(key);
        return Convert.ToBase64String(key);
    }

    /// <summary>
    /// Hashes an API key for storage or lookup.
    /// </summary>
    /// <param name="apiKey">The API key to hash.</param>
    /// <returns>The uppercase hexadecimal SHA-256 hash of the UTF-8 key.</returns>
    /// <exception cref="ArgumentNullException"><paramref name="apiKey"/> is <see langword="null"/>.</exception>
    internal static string Hash(string apiKey)
    {
        ArgumentNullException.ThrowIfNull(apiKey);

        byte[] hash = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(apiKey));
        return Convert.ToHexString(hash);
    }

    /// <summary>
    /// Gets the number of hex characters a hash occupies, for sizing the persisted column.
    /// </summary>
    internal static int HashHexLength => HashSizeBytes * 2;
}
