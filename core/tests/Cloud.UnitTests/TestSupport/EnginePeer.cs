// -----------------------------------------------------------------------------
// <copyright file="EnginePeer.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests.TestSupport;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Cloud.Protocol;

/// <summary>
/// The Engine's half of the wire protocol, implemented independently of Cloud for the tests.
/// </summary>
/// <remarks>
/// <para>
/// This type is a transcription of the Engine's own code — <c>Engine.Core.SecurityManager</c> for the key
/// agreement, cipher framing and challenge, and <c>Engine.Communication.CloudConnector</c> for the
/// envelope and the handshake order. It is written from that source rather than from Cloud's types on
/// purpose: if the tests derived their expectations from Cloud's implementation, they would pass even if
/// Cloud disagreed with the Engine, which is precisely the failure they exist to catch.
/// </para>
/// <para>
/// The Engine's constants are reproduced verbatim: NIST P-256, <c>SHA256</c> over the raw ECDH secret,
/// PBKDF2 with 100,000 iterations and the UTF-8 nonce as salt, AES-256-GCM with a 16-byte tag framed as
/// <c>nonce || tag || cipher</c>, and a little-endian <see cref="ulong"/> sequence number prefixed to the
/// plaintext.
/// </para>
/// </remarks>
internal sealed class EnginePeer : IDisposable
{
    private readonly ECDiffieHellman _ecdh = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
    private byte[]? _sessionKey;
    private ulong _sequenceNumber;
    private bool _disposed;

    /// <summary>Gets the base64 SubjectPublicKeyInfo the Engine would send in its <c>Auth</c> payload.</summary>
    internal string PublicKey => Convert.ToBase64String(_ecdh.PublicKey.ExportSubjectPublicKeyInfo());

    /// <summary>Gets the nonce Cloud issued, kept so the peer can compute the same challenge.</summary>
    internal string? Nonce
    {
        get; private set;
    }

    /// <summary>Gets the session identifier Cloud issued.</summary>
    internal string? SessionId
    {
        get; private set;
    }

    /// <summary>
    /// Derives the session key from Cloud's public key and nonce, exactly as the Engine does.
    /// </summary>
    /// <param name="cloudPublicKey">The base64 public key from Cloud's <c>AuthResponse</c>.</param>
    /// <param name="nonce">The nonce from Cloud's <c>AuthResponse</c>.</param>
    internal void EstablishSession(string cloudPublicKey, string nonce)
    {
        Nonce = nonce;

        using var cloudKey = ECDiffieHellman.Create();
        cloudKey.ImportSubjectPublicKeyInfo(Convert.FromBase64String(cloudPublicKey), out _);

        byte[] sharedSecret = _ecdh.DeriveKeyFromHash(cloudKey.PublicKey, HashAlgorithmName.SHA256, null, null);
        byte[] salt = string.IsNullOrEmpty(nonce) ? new byte[32] : Encoding.UTF8.GetBytes(nonce);
        _sessionKey = Rfc2898DeriveBytes.Pbkdf2(sharedSecret, salt, 100_000, HashAlgorithmName.SHA256, 32);
    }

    /// <summary>Encrypts a payload as the Engine would, including the sequence prefix.</summary>
    /// <param name="plainText">The JSON payload.</param>
    /// <returns>The base64 framed ciphertext.</returns>
    internal string Encrypt(string plainText)
    {
        byte[] sessionKey = _sessionKey ?? throw new InvalidOperationException("The session is not established.");

        byte[] sequenceBytes = BitConverter.GetBytes(++_sequenceNumber);
        byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
        byte[] combined = new byte[sequenceBytes.Length + plainBytes.Length];
        Buffer.BlockCopy(sequenceBytes, 0, combined, 0, sequenceBytes.Length);
        Buffer.BlockCopy(plainBytes, 0, combined, sequenceBytes.Length, plainBytes.Length);

        byte[] nonce = new byte[12];
        RandomNumberGenerator.Fill(nonce);
        byte[] cipher = new byte[combined.Length];
        byte[] tag = new byte[16];

        using (var gcm = new AesGcm(sessionKey, 16))
        {
            gcm.Encrypt(nonce, combined, cipher, tag);
        }

        byte[] result = new byte[12 + 16 + cipher.Length];
        Buffer.BlockCopy(nonce, 0, result, 0, 12);
        Buffer.BlockCopy(tag, 0, result, 12, 16);
        Buffer.BlockCopy(cipher, 0, result, 28, cipher.Length);
        return Convert.ToBase64String(result);
    }

    /// <summary>Decrypts a payload Cloud sent, discarding the sequence prefix as the Engine does.</summary>
    /// <param name="cipherText">The base64 framed ciphertext.</param>
    /// <returns>The decrypted JSON payload.</returns>
    internal string Decrypt(string cipherText)
    {
        byte[] sessionKey = _sessionKey ?? throw new InvalidOperationException("The session is not established.");

        byte[] data = Convert.FromBase64String(cipherText);
        byte[] nonce = data[..12];
        byte[] tag = data[12..28];
        byte[] cipher = data[28..];

        byte[] plain = new byte[cipher.Length];
        using (var gcm = new AesGcm(sessionKey, 16))
        {
            gcm.Decrypt(nonce, cipher, tag, plain);
        }

        return Encoding.UTF8.GetString(plain, 8, plain.Length - 8);
    }

    /// <summary>Computes the AuthConfirm challenge the Engine would return.</summary>
    /// <param name="nonce">The nonce Cloud issued.</param>
    /// <returns>The base64 HMAC-SHA256 of the nonce under the session key.</returns>
    internal string ComputeChallenge(string nonce)
    {
        byte[] sessionKey = _sessionKey ?? throw new InvalidOperationException("The session is not established.");
        return Convert.ToBase64String(HMACSHA256.HashData(sessionKey, Encoding.UTF8.GetBytes(nonce)));
    }

    /// <summary>Records the session identifier Cloud issued, so a test can compare it with Cloud's state.</summary>
    /// <param name="sessionId">The session identifier from the <c>AuthResponse</c>.</param>
    internal void RecordSessionId(string sessionId)
    {
        SessionId = sessionId;
    }

    /// <summary>Builds an <c>Auth</c> envelope as the Engine would.</summary>
    /// <param name="userName">The user name.</param>
    /// <param name="password">The password.</param>
    /// <param name="apiKey">The instance API key.</param>
    /// <param name="capabilities">The advertised capability identifiers.</param>
    /// <returns>The serialised envelope.</returns>
    internal string BuildAuth(string userName, string password, string apiKey, int[] capabilities)
    {
        return Serialize(CloudMessage.Create(CloudProtocol.MessageType.Auth, new
        {
            Username = userName,
            Password = password,
            InstanceApiKey = apiKey,
            EngineVersion = "1.0.0",
            ClientCapabilities = capabilities,
            PublicKey = PublicKey
        }));
    }

    /// <summary>Builds an encrypted envelope as the Engine would, with the payload JSON the caller supplies.</summary>
    /// <param name="messageType">The message discriminator.</param>
    /// <param name="payloadJson">The payload as JSON text.</param>
    /// <param name="correlationId">The correlation identifier, for a command answer.</param>
    /// <returns>The serialised envelope.</returns>
    internal string BuildEncrypted(string messageType, string payloadJson, string? correlationId = null)
    {
        return Serialize(CloudMessage.CreateEncrypted(messageType, Encrypt(payloadJson), correlationId));
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

    private static string Serialize(CloudMessage message)
    {
        return JsonSerializer.Serialize(message);
    }
}
