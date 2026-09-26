// -----------------------------------------------------------------------------
// <copyright file="ManagementApiKeyMiddleware.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

/// <summary>
/// Authenticates callers of the management API with the shared key from configuration.
/// </summary>
/// <remarks>
/// <para>
/// The management API can register Engine instances and therefore mint their credentials, so it is never
/// served unauthenticated: <see cref="CloudOptions.Validate"/> refuses to start the application without a key,
/// and this filter rejects every <c>/api</c> request that does not present it. A missing configured key is
/// treated as a rejection rather than as "no authentication required", so the failure mode is closed.
/// </para>
/// <para>
/// The <c>/engine</c> WebSocket is deliberately excluded. An Engine never holds this key; it authenticates
/// through the protocol handshake in <see cref="Engine.EngineSession"/> instead.
/// </para>
/// <para>
/// Per-user accounts and roles are not part of this slice; the shared key is the whole authorisation model,
/// which is exactly why it is one credential and not a default value.
/// </para>
/// </remarks>
internal static class ManagementApiKeyMiddleware
{
    /// <summary>The request header the caller presents the key in.</summary>
    internal const string HeaderName = "X-Cloud-Management-Key";

    private const string ProtectedPrefix = "/api";

    /// <summary>
    /// Adds the management API key filter to the pipeline.
    /// </summary>
    /// <param name="app">The application builder.</param>
    /// <param name="options">The Cloud options carrying the expected key.</param>
    /// <returns>The application builder, for chaining.</returns>
    /// <exception cref="ArgumentNullException">An argument is <see langword="null"/>.</exception>
    internal static IApplicationBuilder UseManagementApiKey(this IApplicationBuilder app, CloudOptions options)
    {
        ArgumentNullException.ThrowIfNull(app);
        ArgumentNullException.ThrowIfNull(options);

        byte[]? expectedKey = options.ManagementApiKey is null
            ? null
            : Encoding.UTF8.GetBytes(options.ManagementApiKey);

        return app.Use(async (context, next) =>
        {
            ArgumentNullException.ThrowIfNull(context);

            if (!context.Request.Path.StartsWithSegments(ProtectedPrefix, StringComparison.Ordinal) || IsAuthorised(context, expectedKey))
            {
                await next(context).ConfigureAwait(false);
                return;
            }

            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        });
    }

    private static bool IsAuthorised(HttpContext context, byte[]? expectedKey)
    {
        if (expectedKey is null || expectedKey.Length == 0)
        {
            return false;
        }

        if (!context.Request.Headers.TryGetValue(HeaderName, out Microsoft.Extensions.Primitives.StringValues provided)
            || provided.Count == 0
            || provided[0] is not string providedKey
            || providedKey.Length == 0)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(providedKey), expectedKey);
    }
}
