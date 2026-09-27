// -----------------------------------------------------------------------------
// <copyright file="SessionCipher.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Protocol;

using System.Security.Cryptography;
using System.Text;

/// <summary>
/// The Cloud half of the Engine's session cipher (002-020-020 §3.3): ECDH key agreement on NIST P-256,
/// a PBKDF2-derived AES-256-GCM session key, and the HMAC challenge that proves both sides derived the
/// same key.
/// </summary>
/// <remarks>
/// <para>
/// This type exists to interoperate with <c>Engine.Core.SecurityManager</c>, and every step below mirrors
/// that implementation rather than re-deriving a "cleaner" scheme. In particular:
/// </para>
/// <list type="bullet">
///   <item><description>
///   the shared secret is <c>ECDiffieHellman.DeriveKeyFromHash(..., SHA256, null, null)</c>, which is
///   <c>SHA256(Z)</c> over the raw ECDH secret <c>Z</c> — <em>not</em> the raw secret itself;
///   </description></item>
///   <item><description>
///   the session key is <c>PBKDF2(sharedSecret, UTF8(nonce), 100_000, SHA256, 32)</c>, where the salt is
///   the UTF-8 bytes of the nonce <em>string</em> Cloud sent, not the decoded nonce bytes;
///   </description></item>
///   <item><description>
///   the plaintext is prefixed with the little-endian <see cref="ulong"/> sequence number, and the
///   ciphertext is framed as <c>nonce (12) || tag (16) || cipher</c> before base64 encoding. The Engine
///   strips the sequence prefix without validating it, so Cloud must both emit the prefix and tolerate
///   any value it receives.
///   </description></item>
/// </list>
/// <para>
/// The sequence prefix is <see cref="BitConverter"/>-encoded, so it is little-endian. Every platform the
/// Engine supports (Windows, Linux, macOS on x64 and ARM64) is little-endian, which is what makes this
/// framing interoperable; a big-endian peer would desynchronise the plaintext.
/// </para>
/// </remarks>
internal sealed class SessionCipher : IDisposable
{
    private const int SequencePrefixSize = sizeof(ulong);
    private const int NonceSize = 12;
    private const int TagSize = 16;
    private const int SessionKeySize = 32;
    private const int NonceEntropySize = 32;
    private const int Pbkdf2Iterations = 100_000;

    private readonly ECDiffieHellman _ecdh;
    private byte[]? _sessionKey;
    private ulong _sequenceNumber;
    private bool _disposed;

    /// <summary>
    /// Initialises a new instance of the <see cref="SessionCipher"/> class with a fresh ephemeral key pair.
    /// </summary>
    internal SessionCipher()
    {
        _ecdh = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
    }

    /// <summary>
    /// Gets the Cloud's ephemeral public key, base64 encoded SubjectPublicKeyInfo, for the
    /// <c>PublicKey</c> field of the <c>AuthResponse</c> payload.
    /// </summary>
    /// <returns>The base64 SubjectPublicKeyInfo of the ephemeral ECDH public key.</returns>
    internal string GetPublicKey()
    {
        return Convert.ToBase64String(_ecdh.PublicKey.ExportSubjectPublicKeyInfo());
    }

    /// <summary>
    /// Creates the random nonce the Engine uses as the PBKDF2 salt.
    /// </summary>
    /// <returns>A base64 encoded, 256-bit random nonce.</returns>
    internal static string CreateNonce()
    {
        byte[] nonce = new byte[NonceEntropySize];
        RandomNumberGenerator.Fill(nonce);
        return Convert.ToBase64String(nonce);
    }

    /// <summary>
    /// Derives the session key from the Engine's ephemeral public key and the nonce Cloud issued.
    /// </summary>
    /// <param name="enginePublicKey">The base64 SubjectPublicKeyInfo the Engine sent in its <c>Auth</c> payload.</param>
    /// <param name="nonce">The nonce Cloud issued in the <c>AuthResponse</c> payload.</param>
    /// <exception cref="CryptographicException">The Engine's public key is not a valid NIST P-256 SubjectPublicKeyInfo.</exception>
    /// <exception cref="FormatException">The Engine's public key is not valid base64.</exception>
    internal void EstablishSession(string enginePublicKey, string nonce)
    {
        byte[] enginePublicKeyBytes = Convert.FromBase64String(enginePublicKey);

        using var engineKey = ECDiffieHellman.Create();
        engineKey.ImportSubjectPublicKeyInfo(enginePublicKeyBytes, out _);

        byte[] sharedSecret = _ecdh.DeriveKeyFromHash(engineKey.PublicKey, HashAlgorithmName.SHA256, null, null);
        byte[] salt = string.IsNullOrEmpty(nonce) ? new byte[SessionKeySize] : Encoding.UTF8.GetBytes(nonce);
        _sessionKey = Rfc2898DeriveBytes.Pbkdf2(sharedSecret, salt, Pbkdf2Iterations, HashAlgorithmName.SHA256, SessionKeySize);
    }

    /// <summary>
    /// Encrypts a plaintext payload with the established session key.
    /// </summary>
    /// <param name="plainText">The JSON payload to encrypt.</param>
    /// <returns>The base64 framed ciphertext <c>nonce || tag || cipher</c>.</returns>
    /// <exception cref="InvalidOperationException">No session key has been established.</exception>
    internal string Encrypt(string plainText)
    {
        byte[] sessionKey = RequireSessionKey();

        byte[] sequenceBytes = BitConverter.GetBytes(++_sequenceNumber);
        byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
        byte[] combined = new byte[sequenceBytes.Length + plainBytes.Length];
        Buffer.BlockCopy(sequenceBytes, 0, combined, 0, sequenceBytes.Length);
        Buffer.BlockCopy(plainBytes, 0, combined, sequenceBytes.Length, plainBytes.Length);

        byte[] nonce = new byte[NonceSize];
        RandomNumberGenerator.Fill(nonce);
        byte[] cipherText = new byte[combined.Length];
        byte[] tag = new byte[TagSize];

        using (var gcm = new AesGcm(sessionKey, TagSize))
        {
            gcm.Encrypt(nonce, combined, cipherText, tag);
        }

        byte[] result = new byte[NonceSize + TagSize + cipherText.Length];
        Buffer.BlockCopy(nonce, 0, result, 0, NonceSize);
        Buffer.BlockCopy(tag, 0, result, NonceSize, TagSize);
        Buffer.BlockCopy(cipherText, 0, result, NonceSize + TagSize, cipherText.Length);
        return Convert.ToBase64String(result);
    }

    /// <summary>
    /// Decrypts a payload the Engine encrypted with the established session key.
    /// </summary>
    /// <param name="cipherText">The base64 framed ciphertext <c>nonce || tag || cipher</c>.</param>
    /// <returns>The decrypted payload and the sequence number the Engine stamped on it.</returns>
    /// <exception cref="InvalidOperationException">No session key has been established, or the frame is too short.</exception>
    /// <exception cref="CryptographicException">The authentication tag does not verify.</exception>
    internal DecryptedMessage Decrypt(string cipherText)
    {
        byte[] sessionKey = RequireSessionKey();

        byte[] data = Convert.FromBase64String(cipherText);
        if (data.Length < NonceSize + TagSize + SequencePrefixSize)
        {
            throw new InvalidOperationException("Cipher text is shorter than the nonce, tag and sequence prefix.");
        }

        byte[] nonce = data[..NonceSize];
        byte[] tag = data[NonceSize..(NonceSize + TagSize)];
        byte[] cipher = data[(NonceSize + TagSize)..];

        byte[] plain = new byte[cipher.Length];
        using (var gcm = new AesGcm(sessionKey, TagSize))
        {
            gcm.Decrypt(nonce, cipher, tag, plain);
        }

        // The sequence number is returned rather than discarded so that the session can enforce
        // 002-020-020 §3.3 step 6 ("each message includes a sequence number to prevent replay").
        ulong sequence = BitConverter.ToUInt64(plain, 0);
        string json = Encoding.UTF8.GetString(plain, SequencePrefixSize, plain.Length - SequencePrefixSize);
        return new DecryptedMessage(sequence, json);
    }

    /// <summary>
    /// Computes the HMAC-SHA256 challenge the Engine must return in <c>AuthConfirm</c>.
    /// </summary>
    /// <param name="nonce">The nonce Cloud issued in the <c>AuthResponse</c> payload.</param>
    /// <returns>The base64 HMAC-SHA256 of the UTF-8 nonce under the session key.</returns>
    /// <exception cref="InvalidOperationException">No session key has been established.</exception>
    internal string ComputeChallenge(string nonce)
    {
        byte[] sessionKey = RequireSessionKey();
        byte[] hash = HMACSHA256.HashData(sessionKey, Encoding.UTF8.GetBytes(nonce));
        return Convert.ToBase64String(hash);
    }

    /// <summary>
    /// Verifies the challenge the Engine returned in <c>AuthConfirm</c>.
    /// </summary>
    /// <param name="nonce">The nonce Cloud issued in the <c>AuthResponse</c> payload.</param>
    /// <param name="challenge">The base64 challenge the Engine sent.</param>
    /// <returns><see langword="true"/> when the challenge proves the Engine derived the same session key.</returns>
    internal bool VerifyChallenge(string nonce, string challenge)
    {
        byte[] expected;
        byte[] actual;
        try
        {
            expected = Convert.FromBase64String(ComputeChallenge(nonce));
            actual = Convert.FromBase64String(challenge);
        }
        catch (FormatException)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    /// <inheritdoc/>
    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _ecdh.Dispose();
        GC.SuppressFinalize(this);
    }

    private byte[] RequireSessionKey()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        return _sessionKey ?? throw new InvalidOperationException(
            "The session key has not been established; EstablishSession must run before any encryption.");
    }
}

/// <summary>
/// A decrypted Engine payload together with the sequence number that accompanied it.
/// </summary>
/// <param name="Sequence">The little-endian sequence number the Engine prefixed to the plaintext.</param>
/// <param name="Json">The decrypted JSON payload.</param>
internal sealed record DecryptedMessage(ulong Sequence, string Json);
