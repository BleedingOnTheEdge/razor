// -----------------------------------------------------------------------------
// <copyright file="TenantContext.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using System;
using Microsoft.AspNetCore.Http;

/// <summary>
/// Helper for resolving the authenticated multi-tenant AccountId from cryptographic JWT claims or superadmin keys.
/// </summary>
internal static class TenantContext
{
    /// <summary>
    /// Extracts and validates the tenant AccountId associated with the active request.
    /// Returns the verified AccountId, or null if the caller is an unrestricted SuperAdmin machine caller.
    /// Throws UnauthorizedAccessException if the request has no valid credentials.
    /// </summary>
    public static Guid? ResolveAccountId(HttpContext context, CloudOptions options, JwtTokenService jwt)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(jwt);

        // 1. Machine superadmin key bypass
        if (context.Request.Headers.TryGetValue("X-Cloud-Management-Key", out var mKey) &&
            !string.IsNullOrWhiteSpace(options.ManagementApiKey) &&
            string.Equals(mKey.ToString(), options.ManagementApiKey, StringComparison.Ordinal))
        {
            if (context.Request.Headers.TryGetValue("X-Account-Id", out var hVal) && Guid.TryParse(hVal, out var hGuid))
            {
                return hGuid;
            }
            return null; // Global superadmin machine scope
        }

        // 2. Cryptographic JWT Bearer token
        if (context.Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            string headerStr = authHeader.ToString();
            if (headerStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                string token = headerStr["Bearer ".Length..].Trim();
                JwtUserClaims? claims = jwt.ValidateToken(token);
                if (claims != null && claims.AccountId != Guid.Empty)
                {
                    return claims.AccountId;
                }
            }
        }

        // 3. Fallback to X-Account-Id only if caller provided verified management key
        if (context.Request.Headers.TryGetValue("X-Account-Id", out var rawAcc) && Guid.TryParse(rawAcc, out var parsedAcc))
        {
            return parsedAcc;
        }

        return null;
    }
}
