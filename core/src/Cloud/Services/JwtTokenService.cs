// -----------------------------------------------------------------------------
// <copyright file="JwtTokenService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Cloud.Data;

/// <summary>
/// Verified claims extracted from a valid cryptographically signed JWT.
/// </summary>
internal sealed record JwtUserClaims(
    Guid UserId,
    Guid AccountId,
    string UserName,
    UserRole Role,
    DateTimeOffset ExpiresAt);

/// <summary>
/// Cryptographic HMAC-SHA256 JWT generation and validation service for multi-tenant isolation.
/// </summary>
internal sealed class JwtTokenService
{
    private readonly byte[] _secretKey;
    private readonly TimeProvider _timeProvider;

    public JwtTokenService(CloudOptions options, TimeProvider? timeProvider = null)
    {
        ArgumentNullException.ThrowIfNull(options);
        string secret = !string.IsNullOrWhiteSpace(options.JwtSecret)
            ? options.JwtSecret
            : "razor-enterprise-jwt-super-secret-hmac-sha256-signing-token-key-2026!";
        _secretKey = Encoding.UTF8.GetBytes(secret);
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    /// <summary>
    /// Issues a signed HMAC-SHA256 JWT for the given user profile.
    /// </summary>
    public string GenerateToken(Guid userId, Guid accountId, string userName, UserRole role, TimeSpan? lifetime = null)
    {
        DateTimeOffset now = _timeProvider.GetUtcNow();
        DateTimeOffset expires = now.Add(lifetime ?? TimeSpan.FromDays(7));

        var header = new { alg = "HS256", typ = "JWT" };
        var payload = new
        {
            sub = userId.ToString("D"),
            acc = accountId.ToString("D"),
            name = userName,
            role = role.ToString(),
            iat = now.ToUnixTimeSeconds(),
            exp = expires.ToUnixTimeSeconds()
        };

        string headerJson = JsonSerializer.Serialize(header);
        string payloadJson = JsonSerializer.Serialize(payload);

        string encodedHeader = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));
        string encodedPayload = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));

        string message = $"{encodedHeader}.{encodedPayload}";
        byte[] signatureBytes = ComputeHmacSha256(Encoding.UTF8.GetBytes(message), _secretKey);
        string encodedSignature = Base64UrlEncode(signatureBytes);

        return $"{message}.{encodedSignature}";
    }

    /// <summary>
    /// Validates an incoming JWT signature and expiration, returning verified claims.
    /// </summary>
    public JwtUserClaims? ValidateToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        string[] parts = token.Split('.');
        if (parts.Length != 3)
        {
            return null;
        }

        string encodedHeader = parts[0];
        string encodedPayload = parts[1];
        string signature = parts[2];

        string message = $"{encodedHeader}.{encodedPayload}";
        byte[] expectedSigBytes = ComputeHmacSha256(Encoding.UTF8.GetBytes(message), _secretKey);
        string expectedSig = Base64UrlEncode(expectedSigBytes);

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(signature),
                Encoding.UTF8.GetBytes(expectedSig)))
        {
            return null;
        }

        try
        {
            byte[] payloadBytes = Base64UrlDecode(encodedPayload);
            using var doc = JsonDocument.Parse(payloadBytes);
            var root = doc.RootElement;

            if (!root.TryGetProperty("sub", out var subProp) || !Guid.TryParse(subProp.GetString(), out Guid userId))
            {
                return null;
            }

            if (!root.TryGetProperty("acc", out var accProp) || !Guid.TryParse(accProp.GetString(), out Guid accountId))
            {
                return null;
            }

            string userName = root.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "" : "";
            string roleStr = root.TryGetProperty("role", out var roleProp) ? roleProp.GetString() ?? "Trader" : "Trader";
            Enum.TryParse<UserRole>(roleStr, true, out var role);

            long expSeconds = root.TryGetProperty("exp", out var expProp) ? expProp.GetInt64() : 0;
            DateTimeOffset expires = DateTimeOffset.FromUnixTimeSeconds(expSeconds);

            if (_timeProvider.GetUtcNow() > expires)
            {
                return null;
            }

            return new JwtUserClaims(userId, accountId, userName, role, expires);
        }
        catch
        {
            return null;
        }
    }

    private static byte[] ComputeHmacSha256(byte[] data, byte[] key)
    {
        using var hmac = new HMACSHA256(key);
        return hmac.ComputeHash(data);
    }

    private static string Base64UrlEncode(byte[] input)
    {
        return Convert.ToBase64String(input)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static byte[] Base64UrlDecode(string input)
    {
        string incoming = input.Replace('-', '+').Replace('_', '/');
        switch (incoming.Length % 4)
        {
            case 2: incoming += "=="; break;
            case 3: incoming += "="; break;
        }
        return Convert.FromBase64String(incoming);
    }
}
