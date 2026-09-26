// -----------------------------------------------------------------------------
// <copyright file="EngineAuthenticationService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// The credentials an Engine presents in its <c>Auth</c> payload (002-020-020 §3.3 step 1).
/// </summary>
/// <param name="UserName">The user name.</param>
/// <param name="Password">The user's password.</param>
/// <param name="InstanceApiKey">The per-instance API key.</param>
/// <param name="EngineVersion">The Engine version the client reports.</param>
/// <param name="Capabilities">The capability identifiers the client supports.</param>
/// <param name="EnginePublicKey">The Engine's ephemeral ECDH public key.</param>
internal sealed record EngineCredentials(
    string? UserName,
    string? Password,
    string? InstanceApiKey,
    string? EngineVersion,
    IReadOnlyList<int> Capabilities,
    string? EnginePublicKey);

/// <summary>
/// Validates the <c>Auth</c> handshake's credentials before any key exchange takes place
/// (002-020-020 §3.3 step 2: "Cloud validates credentials").
/// </summary>
/// <remarks>
/// <para>
/// Credential failures all return one message, and the password verification runs even when the user name
/// is unknown, against a decoy hash. Together those keep the endpoint from telling an unauthenticated
/// caller which half of a guess was right, or from answering faster when the user name does not exist.
/// </para>
/// <para>
/// Once the credentials are verified the remaining refusals are specific — licence state, instance state
/// and missing capabilities — because at that point the caller has already proven it holds the account's
/// password and the instance's API key.
/// </para>
/// </remarks>
internal sealed class EngineAuthenticationService(
    IDbContextFactory<CloudDbContext> contextFactory,
    CloudOptions options,
    IPasswordHasher<User> passwordHasher,
    TimeProvider timeProvider)
{
    /// <summary>A message that deliberately does not distinguish which credential was wrong.</summary>
    private const string CredentialFailure = "Invalid user name, password or instance API key.";

    private readonly string _decoyPasswordHash = passwordHasher.HashPassword(new User(), "_decoy_");

    /// <summary>
    /// Authenticates an Engine and resolves the instance it acts as.
    /// </summary>
    /// <param name="credentials">The credentials from the <c>Auth</c> payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The authenticated instance, or the reason the Engine was refused.</returns>
    internal async Task<AuthenticationOutcome> AuthenticateAsync(
        EngineCredentials credentials,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(credentials);

        if (string.IsNullOrWhiteSpace(credentials.UserName)
            || string.IsNullOrEmpty(credentials.Password)
            || string.IsNullOrWhiteSpace(credentials.InstanceApiKey))
        {
            return new AuthenticationOutcome(false, CredentialFailure, null);
        }

        using CloudDbContext db = contextFactory.CreateDbContext();

        User? user = await db.Users
            .FirstOrDefaultAsync(u => u.UserName == credentials.UserName, cancellationToken)
            .ConfigureAwait(false);

        // Verify even when the user does not exist, so the work done does not reveal whether it does.
        PasswordVerificationResult passwordResult = passwordHasher.VerifyHashedPassword(
            user ?? new User(),
            user?.PasswordHash ?? _decoyPasswordHash,
            credentials.Password);

        if (user is null || passwordResult == PasswordVerificationResult.Failed)
        {
            return new AuthenticationOutcome(false, CredentialFailure, null);
        }

        if (!user.IsActive)
        {
            return new AuthenticationOutcome(false, "The user account is disabled.", null);
        }

        string apiKeyHash = ApiKeyHasher.Hash(credentials.InstanceApiKey);
        EngineInstance? instance = await db.EngineInstances
            .Include(i => i.License)
            .FirstOrDefaultAsync(i => i.ApiKeyHash == apiKeyHash, cancellationToken)
            .ConfigureAwait(false);

        // An API key that belongs to another account is treated as unknown, not as an authorisation fault.
        if (instance is null || instance.AccountId != user.AccountId)
        {
            return new AuthenticationOutcome(false, CredentialFailure, null);
        }

        if (instance.Status == EngineInstanceStatus.Banned)
        {
            return new AuthenticationOutcome(false, "The instance is barred from the service.", null);
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        if (instance.License is null || !instance.License.IsRunnableAt(now))
        {
            return new AuthenticationOutcome(
                false,
                "The licence backing the instance is not active.",
                null);
        }

        List<int> missing = options.RequiredCapabilities
            .Where(capability => !credentials.Capabilities.Contains(capability))
            .Distinct()
            .OrderBy(capability => capability)
            .ToList();
        if (missing.Count > 0)
        {
            return new AuthenticationOutcome(
                false,
                $"The Engine does not support the required capabilities: {string.Join(", ", missing)}.",
                null);
        }

        if (passwordResult == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, credentials.Password);
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        return new AuthenticationOutcome(true, null, instance);
    }
}
