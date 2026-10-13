// -----------------------------------------------------------------------------
// <copyright file="EngineLifecycleTests.cs" company="BleedingOnTheEdge">
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
using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Tests of instance provisioning, the credentials an Engine authenticates with, and the heartbeat's
/// administrative decisions. These assert Cloud's rules, not that the calls return.
/// </summary>
public sealed class EngineLifecycleTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UnixEpoch;

    [Fact]
    public async Task Registration_CreatesTheInstanceItsProfileAndAnUnstoredApiKey()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        var service = new EngineRegistrationService(database, new TestTimeProvider(Now));

        RegistrationOutcome outcome = await service
            .RegisterAsync(account.AccountId, account.LicenseId, "engine-1", "Desk A", CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Succeeded, outcome.Status);
        Assert.Equal("engine-1", outcome.Instance!.EngineId);
        Assert.Equal("Desk A", outcome.Instance.Name);
        Assert.Equal(EngineInstanceStatus.Active, outcome.Instance.Status);
        Assert.Equal(Now, outcome.Instance.CreatedAt);
        Assert.Null(outcome.Instance.LastSeenAt);

        using CloudDbContext context = database.CreateDbContext();

        // The profile exists from the moment the instance does, so a manifest has somewhere to be reconciled.
        EngineInstance stored = await context.EngineInstances
            .Include(instance => instance.Profile)
            .SingleAsync(instance => instance.Id == outcome.Instance.Id)
            .ConfigureAwait(true);
        Assert.NotNull(stored.Profile);

        // Only the hash is persisted; the plaintext key is returned once and must not be recoverable.
        Assert.Equal(ApiKeyHasher.Hash(outcome.ApiKey!), stored.ApiKeyHash);
        Assert.DoesNotContain(outcome.ApiKey!, stored.ApiKeyHash, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Registration_RefusesASecondInstanceWithTheSameEngineId()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        var service = new EngineRegistrationService(database, new TestTimeProvider(Now));

        await service.RegisterAsync(account.AccountId, account.LicenseId, "engine-1", "A", CancellationToken.None)
            .ConfigureAwait(true);
        RegistrationOutcome second = await service
            .RegisterAsync(account.AccountId, account.LicenseId, "engine-1", "B", CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Rejected, second.Status);
        Assert.Contains("already registered", second.FailureReason!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Registration_EnforcesTheLicenceInstanceQuota()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync(maxInstances: 2).ConfigureAwait(true);
        var service = new EngineRegistrationService(database, new TestTimeProvider(Now));

        Assert.Equal(ServiceStatus.Succeeded, (await service.RegisterAsync(account.AccountId, account.LicenseId, "e1", "A", CancellationToken.None).ConfigureAwait(true)).Status);
        Assert.Equal(ServiceStatus.Succeeded, (await service.RegisterAsync(account.AccountId, account.LicenseId, "e2", "B", CancellationToken.None).ConfigureAwait(true)).Status);

        RegistrationOutcome third = await service
            .RegisterAsync(account.AccountId, account.LicenseId, "e3", "C", CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Rejected, third.Status);
        Assert.Contains("permits 2 instance", third.FailureReason!, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData((int)LicenseStatus.Suspended)]
    [InlineData((int)LicenseStatus.Expired)]
    [InlineData((int)LicenseStatus.Revoked)]
    public async Task Registration_RefusesALicenceThatIsNotRunnable(int licenseStatusValue)
    {
        var status = (LicenseStatus)licenseStatusValue;
        Assert.True(Enum.IsDefined(status));

        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync(licenseStatus: status).ConfigureAwait(true);
        var service = new EngineRegistrationService(database, new TestTimeProvider(Now));

        RegistrationOutcome outcome = await service
            .RegisterAsync(account.AccountId, account.LicenseId, "engine-1", "A", CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Rejected, outcome.Status);
    }

    [Fact]
    public async Task Registration_RefusesAnExpiredLicenceEvenWhenItsStatusIsStillActive()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database
            .SeedAccountAsync(expiresAt: Now.AddSeconds(-1))
            .ConfigureAwait(true);
        var service = new EngineRegistrationService(database, new TestTimeProvider(Now));

        RegistrationOutcome outcome = await service
            .RegisterAsync(account.AccountId, account.LicenseId, "engine-1", "A", CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Rejected, outcome.Status);
    }

    [Fact]
    public async Task Registration_RefusesALicenceBelongingToAnotherAccount()
    {
        using var database = new CloudTestDatabase();
        SeededAccount owner = await database.SeedAccountAsync("owner").ConfigureAwait(true);
        SeededAccount other = await database.SeedAccountAsync("other").ConfigureAwait(true);
        var service = new EngineRegistrationService(database, new TestTimeProvider(Now));

        RegistrationOutcome outcome = await service
            .RegisterAsync(other.AccountId, owner.LicenseId, "engine-1", "A", CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Rejected, outcome.Status);
        Assert.Contains("different account", outcome.FailureReason!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Registration_ReportsUnknownAccountAndLicenceAsNotFound()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        var service = new EngineRegistrationService(database, new TestTimeProvider(Now));

        Assert.Equal(
            ServiceStatus.NotFound,
            (await service.RegisterAsync(Guid.NewGuid(), account.LicenseId, "e", "n", CancellationToken.None).ConfigureAwait(true)).Status);
        Assert.Equal(
            ServiceStatus.NotFound,
            (await service.RegisterAsync(account.AccountId, Guid.NewGuid(), "e", "n", CancellationToken.None).ConfigureAwait(true)).Status);
    }

    [Theory]
    [InlineData("", "name")]
    [InlineData("   ", "name")]
    [InlineData("engine", "")]
    [InlineData("engine", "  ")]
    public async Task Registration_RequiresAnEngineIdAndAName(string engineId, string name)
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        var service = new EngineRegistrationService(database, new TestTimeProvider(Now));

        RegistrationOutcome outcome = await service
            .RegisterAsync(account.AccountId, account.LicenseId, engineId, name, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Rejected, outcome.Status);
    }

    [Fact]
    public async Task Authentication_AcceptsTheCredentialsRegistrationIssued()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);
        EngineAuthenticationService service = CreateAuthentication(database);

        AuthenticationOutcome outcome = await service
            .AuthenticateAsync(Credentials(account.UserName, registered.ApiKey!), CancellationToken.None)
            .ConfigureAwait(true);

        Assert.True(outcome.Succeeded);
        Assert.Equal(registered.Instance!.Id, outcome.Instance!.Id);
    }

    [Fact]
    public async Task Authentication_RefusesAWrongPasswordWithTheSameMessageAsAnUnknownUser()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);
        EngineAuthenticationService service = CreateAuthentication(database);

        AuthenticationOutcome wrongPassword = await service
            .AuthenticateAsync(Credentials(account.UserName, registered.ApiKey!, password: "wrong"), CancellationToken.None)
            .ConfigureAwait(true);
        AuthenticationOutcome unknownUser = await service
            .AuthenticateAsync(Credentials("nobody", registered.ApiKey!), CancellationToken.None)
            .ConfigureAwait(true);
        AuthenticationOutcome wrongKey = await service
            .AuthenticateAsync(Credentials(account.UserName, "not-the-key"), CancellationToken.None)
            .ConfigureAwait(true);

        Assert.False(wrongPassword.Succeeded);
        Assert.False(unknownUser.Succeeded);
        Assert.False(wrongKey.Succeeded);

        // One message for every credential fault: the answer must not say which half was wrong.
        Assert.Equal(wrongPassword.FailureReason, unknownUser.FailureReason);
        Assert.Equal(wrongPassword.FailureReason, wrongKey.FailureReason);
    }

    [Fact]
    public async Task Authentication_RefusesAnApiKeyBelongingToAnotherAccountAsAcredentialFault()
    {
        using var database = new CloudTestDatabase();
        SeededAccount first = await database.SeedAccountAsync("first").ConfigureAwait(true);
        SeededAccount second = await database.SeedAccountAsync("second").ConfigureAwait(true);
        RegistrationOutcome registeredForFirst = await RegisterAsync(database, first).ConfigureAwait(true);
        EngineAuthenticationService service = CreateAuthentication(database);

        // The second account's user presents the first account's key.
        AuthenticationOutcome outcome = await service
            .AuthenticateAsync(Credentials(second.UserName, registeredForFirst.ApiKey!), CancellationToken.None)
            .ConfigureAwait(true);

        Assert.False(outcome.Succeeded);
        Assert.Contains("Invalid user name, password or instance API key", outcome.FailureReason!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Authentication_RefusesAnInactiveUser()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);

        using (CloudDbContext context = database.CreateDbContext())
        {
            User user = await context.Users.SingleAsync(candidate => candidate.Id == account.UserId).ConfigureAwait(true);
            user.IsActive = false;
            await context.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        AuthenticationOutcome outcome = await CreateAuthentication(database)
            .AuthenticateAsync(Credentials(account.UserName, registered.ApiKey!), CancellationToken.None)
            .ConfigureAwait(true);

        Assert.False(outcome.Succeeded);
        Assert.Contains("disabled", outcome.FailureReason!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Authentication_RefusesABannedInstanceSpecifically()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);

        using (CloudDbContext context = database.CreateDbContext())
        {
            EngineInstance instance = await context.EngineInstances
                .SingleAsync(candidate => candidate.Id == registered.Instance!.Id)
                .ConfigureAwait(true);
            instance.Status = EngineInstanceStatus.Banned;
            await context.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        AuthenticationOutcome outcome = await CreateAuthentication(database)
            .AuthenticateAsync(Credentials(account.UserName, registered.ApiKey!), CancellationToken.None)
            .ConfigureAwait(true);

        Assert.False(outcome.Succeeded);
        Assert.Contains("barred", outcome.FailureReason!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Authentication_AllowsASuspendedInstanceToConnectSoCloudCanLockIt()
    {
        // Suspension is enforced through the heartbeat status, not by refusing the connection: the Engine has
        // to be connected to be told to stop its user tasks.
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);

        using (CloudDbContext context = database.CreateDbContext())
        {
            EngineInstance instance = await context.EngineInstances
                .SingleAsync(candidate => candidate.Id == registered.Instance!.Id)
                .ConfigureAwait(true);
            instance.Status = EngineInstanceStatus.Suspended;
            await context.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        AuthenticationOutcome outcome = await CreateAuthentication(database)
            .AuthenticateAsync(Credentials(account.UserName, registered.ApiKey!), CancellationToken.None)
            .ConfigureAwait(true);

        Assert.True(outcome.Succeeded);
    }

    [Fact]
    public async Task Authentication_RefusesAnEngineThatLacksARequiredCapability()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);

        var options = new CloudOptions
        {
            ConnectionString = "unused",
            ManagementApiKey = "key",
            RequiredCapabilities = [100, 111]
        };
        var service = new EngineAuthenticationService(
            database,
            options,
            new PasswordHasher<User>(),
            new TestTimeProvider(Now));

        AuthenticationOutcome outcome = await service
            .AuthenticateAsync(
                new EngineCredentials(account.UserName, CloudTestDatabase.Password, registered.ApiKey!, "1.0.0", [100, 101], "key"),
                CancellationToken.None)
            .ConfigureAwait(true);

        Assert.False(outcome.Succeeded);
        Assert.Contains("111", outcome.FailureReason!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Authentication_RefusesALicenceThatStoppedRunningAfterRegistration()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);

        using (CloudDbContext context = database.CreateDbContext())
        {
            License licence = await context.Licenses.SingleAsync(row => row.Id == account.LicenseId).ConfigureAwait(true);
            licence.Status = LicenseStatus.Revoked;
            await context.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        AuthenticationOutcome outcome = await CreateAuthentication(database)
            .AuthenticateAsync(Credentials(account.UserName, registered.ApiKey!), CancellationToken.None)
            .ConfigureAwait(true);

        Assert.False(outcome.Succeeded);
        Assert.Contains("licence", outcome.FailureReason!, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null, "password", "key")]
    [InlineData("user", null, "key")]
    [InlineData("user", "password", null)]
    [InlineData("", "password", "key")]
    [InlineData("user", "password", "  ")]
    public async Task Authentication_RefusesAnIncompleteCredentialSet(
        string? userName,
        string? password,
        string? apiKey)
    {
        using var database = new CloudTestDatabase();

        AuthenticationOutcome outcome = await CreateAuthentication(database)
            .AuthenticateAsync(new EngineCredentials(userName, password, apiKey, "1.0.0", [], "key"), CancellationToken.None)
            .ConfigureAwait(true);

        Assert.False(outcome.Succeeded);
    }

    [Fact]
    public async Task Heartbeat_AnswersOkAndRecordsTheInstanceAsSeen()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);
        var time = new TestTimeProvider(Now);
        var service = new HeartbeatService(database, CreateCommands(database, time), Options(), time);

        time.Advance(TimeSpan.FromMinutes(5));
        HeartbeatOutcome outcome = await service
            .HandleAsync(registered.Instance!.Id, "engine-1", CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal("OK", outcome.Status);
        Assert.True(outcome.AuthValid);
        Assert.Equal(CloudOptions.DefaultHeartbeatIntervalSeconds, outcome.NextIntervalSeconds);
        Assert.Equal(Now.AddMinutes(5), outcome.ServerTime);

        using CloudDbContext context = database.CreateDbContext();
        EngineInstance instance = await context.EngineInstances
            .SingleAsync(candidate => candidate.Id == registered.Instance.Id)
            .ConfigureAwait(true);
        Assert.Equal(Now.AddMinutes(5), instance.LastSeenAt);
    }

    [Fact]
    public async Task Heartbeat_InvalidatesTheSessionWhenTheEngineIdDoesNotMatchTheApiKey()
    {
        // Authentication resolves the instance from the API key alone, so this check is what stops a leaked
        // key from being replayed by a different Engine binary.
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);
        var time = new TestTimeProvider(Now);
        var service = new HeartbeatService(database, CreateCommands(database, time), Options(), time);

        HeartbeatOutcome outcome = await service
            .HandleAsync(registered.Instance!.Id, "a-different-engine", CancellationToken.None)
            .ConfigureAwait(true);

        Assert.False(outcome.AuthValid);
        Assert.Equal("Lock", outcome.Status);

        using CloudDbContext context = database.CreateDbContext();
        EngineInstance instance = await context.EngineInstances
            .SingleAsync(candidate => candidate.Id == registered.Instance.Id)
            .ConfigureAwait(true);
        Assert.Null(instance.LastSeenAt);
    }

    [Fact]
    public async Task Heartbeat_LocksAnInstanceWhoseLicenceLapsed()
    {
        using var database = new CloudTestDatabase();
        SeededAccount account = await database.SeedAccountAsync().ConfigureAwait(true);
        RegistrationOutcome registered = await RegisterAsync(database, account).ConfigureAwait(true);
        var time = new TestTimeProvider(Now);
        var service = new HeartbeatService(database, CreateCommands(database, time), Options(), time);

        using (CloudDbContext context = database.CreateDbContext())
        {
            License licence = await context.Licenses.SingleAsync(row => row.Id == account.LicenseId).ConfigureAwait(true);
            licence.ExpiresAt = Now.AddSeconds(-1);
            await context.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        HeartbeatOutcome outcome = await service
            .HandleAsync(registered.Instance!.Id, "engine-1", CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal("Lock", outcome.Status);
        Assert.True(outcome.AuthValid);
    }

    [Fact]
    public async Task Heartbeat_InvalidatesTheSessionWhenTheInstanceNoLongerExists()
    {
        using var database = new CloudTestDatabase();
        var time = new TestTimeProvider(Now);
        var service = new HeartbeatService(database, CreateCommands(database, time), Options(), time);

        HeartbeatOutcome outcome = await service
            .HandleAsync(Guid.NewGuid(), "engine-1", CancellationToken.None)
            .ConfigureAwait(true);

        Assert.False(outcome.AuthValid);
        Assert.Equal("Lock", outcome.Status);
    }

    private static CloudOptions Options() => new() { ConnectionString = "unused", ManagementApiKey = "key" };

    private static CommandService CreateCommands(CloudTestDatabase database, TestTimeProvider time)
    {
        return new CommandService(database, Options(), time, NullLogger<CommandService>.Instance);
    }

    private static EngineAuthenticationService CreateAuthentication(CloudTestDatabase database)
    {
        return new EngineAuthenticationService(
            database,
            Options(),
            new PasswordHasher<User>(),
            new TestTimeProvider(Now));
    }

    private static EngineCredentials Credentials(
        string userName,
        string apiKey,
        string password = CloudTestDatabase.Password)
    {
        return new EngineCredentials(userName, password, apiKey, "1.0.0", [100, 101], "public-key");
    }

    private static async Task<RegistrationOutcome> RegisterAsync(CloudTestDatabase database, SeededAccount account)
    {
        return await new EngineRegistrationService(database, new TestTimeProvider(Now))
            .RegisterAsync(account.AccountId, account.LicenseId, "engine-1", "instance", CancellationToken.None)
            .ConfigureAwait(true);
    }
}
