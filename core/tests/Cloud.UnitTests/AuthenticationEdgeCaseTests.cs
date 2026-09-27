// -----------------------------------------------------------------------------
// <copyright file="AuthenticationEdgeCaseTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using Cloud;
using Cloud.Data;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

/// <summary>
/// Tests of the authentication decisions that a well-formed credential set never reaches: an Engine that
/// cannot satisfy Cloud's capability requirement, and a password stored under a work factor that is no longer
/// good enough (002-020-020 §3.3 step 2).
/// </summary>
public sealed class AuthenticationEdgeCaseTests
{
    [Fact]
    public async Task AuthenticationRefusesAnEngineThatCannotSatisfyTheRequiredCapabilities()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);

        // Cloud's required capabilities are what it refuses to run without: an Engine missing one would be
        // sent commands from a feature band it does not implement. The refusal names exactly what is missing,
        // because an operator cannot fix a compatibility gap they cannot see.
        var options = new CloudOptions
        {
            ConnectionString = "unused",
            ManagementApiKey = "a-key",
            RequiredCapabilities = [100, 104]
        };

        var authentication = new EngineAuthenticationService(
            database,
            options,
            new PasswordHasher<User>(),
            TimeProvider.System);

        AuthenticationOutcome outcome = await authentication
            .AuthenticateAsync(
                new EngineCredentials(
                    "operator",
                    CloudTestDatabase.Password,
                    registered.ApiKey!,
                    "1.0.0",
                    [100, 103],
                    null),
                CancellationToken.None)
            .ConfigureAwait(true);

        Assert.False(outcome.Succeeded);
        Assert.Null(outcome.Instance);

        // Only 104 is missing, listed once and in order even though it is reported once per comparison.
        Assert.Equal("The Engine does not support the required capabilities: 104.", outcome.FailureReason);
    }

    [Fact]
    public async Task AuthenticationAcceptsAnEngineThatSatisfiesThemAndIgnoresTheSurplus()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);

        var options = new CloudOptions
        {
            ConnectionString = "unused",
            ManagementApiKey = "a-key",
            RequiredCapabilities = [100, 104]
        };

        var authentication = new EngineAuthenticationService(
            database,
            options,
            new PasswordHasher<User>(),
            TimeProvider.System);

        // A capability the Engine advertises twice, and one Cloud does not require, are both fine: the check
        // is that the requirement is satisfied, not that the two lists are equal.
        AuthenticationOutcome outcome = await authentication
            .AuthenticateAsync(
                new EngineCredentials(
                    "operator",
                    CloudTestDatabase.Password,
                    registered.ApiKey!,
                    "1.0.0",
                    [100, 100, 104, 999],
                    null),
                CancellationToken.None)
            .ConfigureAwait(true);

        Assert.True(outcome.Succeeded);
        Assert.Equal(registered.Instance!.Id, outcome.Instance!.Id);
    }

    [Fact]
    public async Task AuthenticationRehashesAPasswordStoredUnderAForgottenWorkFactor()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);

        // A hash written when the application used a cheaper work factor still verifies, but the stored form
        // is weaker than the current standard. Reporting that is the point: the caller rehashes on the one
        // occasion it holds the plaintext, which is what upgrades the stored credential without a reset.
        string weakHash;
        using (CloudDbContext db = database.CreateDbContext())
        {
            User user = await db.Users.SingleAsync(candidate => candidate.Id == account.UserId).ConfigureAwait(true);
            weakHash = new PasswordHasher<User>(Options.Create(new PasswordHasherOptions { IterationCount = 1_000 }))
                .HashPassword(user, CloudTestDatabase.Password);

            user.PasswordHash = weakHash;
            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        var options = new CloudOptions { ConnectionString = "unused", ManagementApiKey = "a-key" };
        var authentication = new EngineAuthenticationService(
            database,
            options,
            new PasswordHasher<User>(),
            TimeProvider.System);

        AuthenticationOutcome outcome = await authentication
            .AuthenticateAsync(
                new EngineCredentials(
                    "operator",
                    CloudTestDatabase.Password,
                    registered.ApiKey!,
                    "1.0.0",
                    [],
                    null),
                CancellationToken.None)
            .ConfigureAwait(true);

        Assert.True(outcome.Succeeded);

        using CloudDbContext after = database.CreateDbContext();
        User updated = await after.Users.SingleAsync(candidate => candidate.Id == account.UserId).ConfigureAwait(true);
        Assert.NotEqual(weakHash, updated.PasswordHash);

        // The replacement must still be the same password, or the rehash would lock the operator out.
        Assert.Equal(
            PasswordVerificationResult.Success,
            new PasswordHasher<User>().VerifyHashedPassword(updated, updated.PasswordHash, CloudTestDatabase.Password));
    }

    private static async Task<RegistrationOutcome> RegisterAsync(CloudTestDatabase database, SeededAccount account)
    {
        var registration = new EngineRegistrationService(database, TimeProvider.System);
        return await registration
            .RegisterAsync(account.AccountId, account.LicenseId, "engine-1", "test instance", CancellationToken.None)
            .ConfigureAwait(false);
    }
}
