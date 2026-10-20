// -----------------------------------------------------------------------------
// <copyright file="CloudGovernanceBranchTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using Cloud.Data;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Targeted edge-case tests for User Governance, Registration, Marketplace fallbacks,
/// Lineage validation, and Divergence scoring.
/// </summary>
public sealed class CloudGovernanceBranchTests
{
    [Fact]
    public async Task UserService_AdminBranches_HandlesMissingEntitiesAndFilterCombinations()
    {
        using var testDb = new CloudTestDatabase();
        var hasher = new PasswordHasher<User>();
        var users = new UserService(testDb, new CloudOptions(), TimeProvider.System, hasher);

        // Seed an initial user
        using (CloudDbContext db = testDb.CreateDbContext())
        {
            await DatabaseSeeder.SeedAsync(db, hasher).ConfigureAwait(true);
        }

        // 1. GetUserById with non-existent ID returns null
        UserProfileView? missingUser = await users.GetUserByIdAsync(Guid.NewGuid()).ConfigureAwait(true);
        Assert.Null(missingUser);

        // 2. GetUserByUsername with non-existent username returns null
        UserProfileView? missingByName = await users.GetUserByUsernameAsync("non_existent_trader").ConfigureAwait(true);
        Assert.Null(missingByName);

        // 3. UpdateProfileAsync on non-existent user returns null
        UserProfileView? notFoundProfile = await users.UpdateProfileAsync(
            Guid.NewGuid(), "Name", "email@test.com", "url", "bio").ConfigureAwait(true);
        Assert.Null(notFoundProfile);

        // 4. UpdateProfileAsync with whitespace sets fields to null
        UserProfileView superadmin = (await users.GetUserByUsernameAsync("superadmin").ConfigureAwait(true))!;
        UserProfileView? cleared = await users.UpdateProfileAsync(
            superadmin.UserId, "   ", "   ", "   ", "   ").ConfigureAwait(true);
        Assert.NotNull(cleared);
        Assert.Null(cleared.DisplayName);
        Assert.Null(cleared.Email);

        // 5. UpdateProfileAsync with non-empty values sets trimmed fields
        UserProfileView? setProfile = await users.UpdateProfileAsync(
            superadmin.UserId, " Sys Admin ", " admin@test.io ", " https://avatar.png ", " Lead Bio ").ConfigureAwait(true);
        Assert.NotNull(setProfile);
        Assert.Equal("Sys Admin", setProfile.DisplayName);
        Assert.Equal("admin@test.io", setProfile.Email);

        // 6. ListAllUsersAsync with search matching username, email, and displayName
        IReadOnlyList<UserProfileView> matchUsername = await users.ListAllUsersAsync(search: "operator-alpha").ConfigureAwait(true);
        Assert.NotEmpty(matchUsername);

        IReadOnlyList<UserProfileView> matchEmail = await users.ListAllUsersAsync(search: "admin@test.io").ConfigureAwait(true);
        Assert.NotEmpty(matchEmail);

        IReadOnlyList<UserProfileView> matchDisplayName = await users.ListAllUsersAsync(search: "Sys Admin").ConfigureAwait(true);
        Assert.NotEmpty(matchDisplayName);

        // 7. ListAllUsersAsync filtered by role and tier
        IReadOnlyList<UserProfileView> traders = await users.ListAllUsersAsync(role: UserRole.Trader).ConfigureAwait(true);
        Assert.Equal(40, traders.Count);

        IReadOnlyList<UserProfileView> enterprises = await users.ListAllUsersAsync(tier: SubscriptionTier.Enterprise).ConfigureAwait(true);
        Assert.NotEmpty(enterprises);

        // 8. UpdateUserRoleAsync with non-existent user returns null
        UserProfileView? missingRoleUpdate = await users.UpdateUserRoleAsync(Guid.NewGuid(), UserRole.Operator).ConfigureAwait(true);
        Assert.Null(missingRoleUpdate);

        // 9. UpdateUserStatusAsync with non-existent user returns null
        UserProfileView? missingStatusUpdate = await users.UpdateUserStatusAsync(Guid.NewGuid(), false).ConfigureAwait(true);
        Assert.Null(missingStatusUpdate);

        // 10. DeleteUserAsync with non-existent user returns false
        bool deleteNonExistent = await users.DeleteUserAsync(Guid.NewGuid()).ConfigureAwait(true);
        Assert.False(deleteNonExistent);

        // 11. DeleteUserAsync on SuperAdmin throws InvalidOperationException
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => users.DeleteUserAsync(superadmin.UserId)).ConfigureAwait(true);
    }

    [Fact]
    public async Task UserService_DeleteUserAsync_HandlesSharedVsSoleAccounts()
    {
        using var testDb = new CloudTestDatabase();
        var hasher = new PasswordHasher<User>();
        var users = new UserService(testDb, new CloudOptions(), TimeProvider.System, hasher);

        Guid accountId = Guid.NewGuid();
        Guid user1Id = Guid.NewGuid();
        Guid user2Id = Guid.NewGuid();

        // Create shared account with two users
        using (CloudDbContext db = testDb.CreateDbContext())
        {
            var account = new Account
            {
                Id = accountId,
                Name = "Shared Account",
                SubscriptionTier = SubscriptionTier.Pro,
                CreatedAt = DateTimeOffset.UtcNow
            };
            db.Accounts.Add(account);

            var user1 = new User
            {
                Id = user1Id,
                AccountId = accountId,
                UserName = "shared_u1",
                PasswordHash = "h",
                Role = UserRole.Trader,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };
            var user2 = new User
            {
                Id = user2Id,
                AccountId = accountId,
                UserName = "shared_u2",
                PasswordHash = "h",
                Role = UserRole.Trader,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };
            db.Users.AddRange(user1, user2);
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        // Deleting user1 keeps account intact because user2 still belongs to it
        bool del1 = await users.DeleteUserAsync(user1Id).ConfigureAwait(true);
        Assert.True(del1);

        using (CloudDbContext db = testDb.CreateDbContext())
        {
            Assert.True(await db.Accounts.AnyAsync(a => a.Id == accountId).ConfigureAwait(true));
        }

        // Deleting user2 removes both user2 and the now unshared account
        bool del2 = await users.DeleteUserAsync(user2Id).ConfigureAwait(true);
        Assert.True(del2);

        using (CloudDbContext db = testDb.CreateDbContext())
        {
            Assert.False(await db.Accounts.AnyAsync(a => a.Id == accountId).ConfigureAwait(true));
        }
    }

    [Fact]
    public async Task UserService_AuthAndSubscription_ExercisesFallbackAndErrorBranches()
    {
        using var testDb = new CloudTestDatabase();
        var hasher = new PasswordHasher<User>();
        var users = new UserService(testDb, new CloudOptions(), TimeProvider.System, hasher);

        // 1. AuthenticateAsync fails for unknown users (no backdoor auto-provisioning)
        AuthSessionResponse? unauth = await users.AuthenticateAsync("unknown-user", "pass").ConfigureAwait(true);
        Assert.Null(unauth);

        await users.RegisterUserAsync("auto-admin-dev", "pass", null, UserRole.Admin, SubscriptionTier.Free).ConfigureAwait(true);
        AuthSessionResponse? adminSess = await users.AuthenticateAsync("auto-admin-dev", "pass").ConfigureAwait(true);
        Assert.NotNull(adminSess);
        Assert.Equal(UserRole.Admin, adminSess.User.Role);

        await users.RegisterUserAsync("auto-trader-01", "pass", null, UserRole.Trader, SubscriptionTier.Free).ConfigureAwait(true);
        AuthSessionResponse? traderSess = await users.AuthenticateAsync("auto-trader-01", "pass").ConfigureAwait(true);
        Assert.NotNull(traderSess);
        Assert.Equal(UserRole.Trader, traderSess.User.Role);

        await users.RegisterUserAsync("cluster-worker-01", "pass", null, UserRole.Operator, SubscriptionTier.Free).ConfigureAwait(true);
        AuthSessionResponse? opSess = await users.AuthenticateAsync("cluster-worker-01", "pass").ConfigureAwait(true);
        Assert.NotNull(opSess);
        Assert.Equal(UserRole.Operator, opSess.User.Role);

        // 2. AuthenticateAsync with suspended user returns null
        await users.UpdateUserStatusAsync(opSess.User.UserId, false).ConfigureAwait(true);
        AuthSessionResponse? suspendedSess = await users.AuthenticateAsync("cluster-worker-01", "pass").ConfigureAwait(true);
        Assert.Null(suspendedSess);

        // 3. UpgradeSubscriptionAsync with non-existent account returns null
        UserProfileView? nonExistentTier = await users.UpgradeSubscriptionAsync(Guid.NewGuid(), SubscriptionTier.Enterprise).ConfigureAwait(true);
        Assert.Null(nonExistentTier);

        // 4. UpgradeSubscriptionAsync on account with no users returns null
        Guid emptyAccountId = Guid.NewGuid();
        using (CloudDbContext db = testDb.CreateDbContext())
        {
            db.Accounts.Add(new Account
            {
                Id = emptyAccountId,
                Name = "Empty Account",
                SubscriptionTier = SubscriptionTier.Free,
                CreatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync().ConfigureAwait(true);
        }
        UserProfileView? emptyAccountUpgrade = await users.UpgradeSubscriptionAsync(emptyAccountId, SubscriptionTier.Pro).ConfigureAwait(true);
        Assert.Null(emptyAccountUpgrade);
    }

    [Fact]
    public async Task EngineRegistrationService_ManagementBranches_HandlesValidationAndMissingEntities()
    {
        using var testDb = new CloudTestDatabase();
        var regService = new EngineRegistrationService(testDb, TimeProvider.System);

        // 1. Validation rejection on empty engineId or empty name
        RegistrationOutcome badEngineId = await regService.RegisterAsync(
            Guid.NewGuid(), Guid.NewGuid(), "   ", "Name", CancellationToken.None).ConfigureAwait(true);
        Assert.Equal(ServiceStatus.Rejected, badEngineId.Status);

        RegistrationOutcome badName = await regService.RegisterAsync(
            Guid.NewGuid(), Guid.NewGuid(), "eng-1", "   ", CancellationToken.None).ConfigureAwait(true);
        Assert.Equal(ServiceStatus.Rejected, badName.Status);

        // 2. Non-existent account returns NotFound
        RegistrationOutcome notFoundAcc = await regService.RegisterAsync(
            Guid.NewGuid(), Guid.Empty, "eng-1", "Valid Name", CancellationToken.None).ConfigureAwait(true);
        Assert.Equal(ServiceStatus.NotFound, notFoundAcc.Status);

        // Seed account and licence
        SeededAccount seeded = await testDb.SeedAccountAsync("test-eng-op").ConfigureAwait(true);

        // 3. Invalid licence ID returns NotFound
        RegistrationOutcome notFoundLic = await regService.RegisterAsync(
            seeded.AccountId, Guid.NewGuid(), "eng-1", "Valid Name", CancellationToken.None).ConfigureAwait(true);
        Assert.Equal(ServiceStatus.NotFound, notFoundLic.Status);

        // 4. Licence belonging to another account returns Rejected
        SeededAccount otherAccount = await testDb.SeedAccountAsync("other-acc-user").ConfigureAwait(true);
        RegistrationOutcome otherLic = await regService.RegisterAsync(
            seeded.AccountId, otherAccount.LicenseId, "eng-1", "Valid Name", CancellationToken.None).ConfigureAwait(true);
        Assert.Equal(ServiceStatus.Rejected, otherLic.Status);

        // 5. UpdateAsync with non-existent instance returns null
        EngineInstance? missingUpdate = await regService.UpdateAsync(
            Guid.NewGuid(), "New Name", EngineInstanceStatus.Active).ConfigureAwait(true);
        Assert.Null(missingUpdate);

        // 6. RotateApiKeyAsync with non-existent instance returns (null, null)
        (EngineInstance? noInst, string? noKey) = await regService.RotateApiKeyAsync(Guid.NewGuid()).ConfigureAwait(true);
        Assert.Null(noInst);
        Assert.Null(noKey);

        // 7. RevokeAsync and DeleteAsync with non-existent instance return false
        Assert.False(await regService.RevokeAsync(Guid.NewGuid()).ConfigureAwait(true));
        Assert.False(await regService.DeleteAsync(Guid.NewGuid()).ConfigureAwait(true));
    }

    [Fact]
    public async Task MarketplaceService_AcquisitionFallbacks_HandlesUnregisteredAccountsAndInstances()
    {
        using var testDb = new CloudTestDatabase();
        var marketplace = new MarketplaceService(testDb, TimeProvider.System);

        // 1. Non-existent item returns null
        MarketplaceAcquisition? missingItem = await marketplace.AcquireItemAsync(
            Guid.NewGuid(), Guid.NewGuid(), null).ConfigureAwait(true);
        Assert.Null(missingItem);

        // 2. Search items triggers seeding of default items
        IReadOnlyList<MarketplaceItem> items = await marketplace.SearchItemsAsync().ConfigureAwait(true);
        Assert.NotEmpty(items);
        Guid realItemId = items[0].Id;

        // 3. Non-existent account returns null
        MarketplaceAcquisition? missingAccount = await marketplace.AcquireItemAsync(
            realItemId, Guid.NewGuid(), null).ConfigureAwait(true);
        Assert.Null(missingAccount);

        // 4. Passing accountId = Guid.Empty when an account exists reuses that account
        SeededAccount seeded = await testDb.SeedAccountAsync("mp-buyer").ConfigureAwait(true);
        MarketplaceAcquisition? acq = await marketplace.AcquireItemAsync(
            realItemId, Guid.Empty, Guid.NewGuid()).ConfigureAwait(true);
        Assert.NotNull(acq);
        Assert.Equal(seeded.AccountId, acq.AccountId);
        // Invalid targetInstanceId falls back to null
        Assert.Null(acq.EngineInstanceId);

        // 5. Re-acquiring already acquired item returns existing acquisition
        MarketplaceAcquisition? duplicate = await marketplace.AcquireItemAsync(
            realItemId, seeded.AccountId, null).ConfigureAwait(true);
        Assert.NotNull(duplicate);
        Assert.Equal(acq.Id, duplicate.Id);
    }

    [Fact]
    public async Task LineageAndRanking_EdgeCases_ValidateValidationAndDivergenceChecks()
    {
        using var testDb = new CloudTestDatabase();
        var lineage = new LineageService(testDb, TimeProvider.System, NullLogger<LineageService>.Instance);

        // Seed account and instance
        SeededAccount seeded = await testDb.SeedAccountAsync("lineage-user").ConfigureAwait(true);
        Guid instanceId = Guid.NewGuid();
        using (CloudDbContext db = testDb.CreateDbContext())
        {
            db.EngineInstances.Add(new EngineInstance
            {
                Id = instanceId,
                AccountId = seeded.AccountId,
                LicenseId = seeded.LicenseId,
                EngineId = "eng-lineage",
                Name = "Lineage Engine",
                ApiKeyHash = "hash",
                Status = EngineInstanceStatus.Active,
                CreatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        FlowRun original = await lineage.CreateOriginalRunAsync(instanceId, RunKind.Backtest).ConfigureAwait(true);
        var forkPoint = new ForkPoint(10, null, null);

        // 1. Intervention with empty reason throws ArgumentException
        var badIntervention = new[]
        {
            new InterventionSpecification(1, "fp1", "fp2", "Actor", "   ", "mod", null, null)
        };
        await Assert.ThrowsAsync<ArgumentException>(() => lineage.CreateChildRunAsync(
            original.Id,
            RunRelation.Branched,
            RunContinuity.Contiguous,
            forkPoint,
            null,
            null,
            interventions: badIntervention)).ConfigureAwait(true);

        // 2. Gap with empty reason throws ArgumentException
        var badGap = new[]
        {
            new GapSpecification(1, 10, "   ")
        };
        await Assert.ThrowsAsync<ArgumentException>(() => lineage.CreateChildRunAsync(
            original.Id,
            RunRelation.Branched,
            RunContinuity.Gapped,
            forkPoint,
            null,
            null,
            gaps: badGap)).ConfigureAwait(true);

        // 3. RunRankingService.IsDivergedOrGapped identifies all variation states
        var cleanRun = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = instanceId,
            Kind = RunKind.Backtest,
            Status = RunStatus.Completed,
            CreatedAt = DateTimeOffset.UtcNow,
            Relation = RunRelation.Appended,
            Continuity = RunContinuity.Contiguous,
            IsPartial = false
        };
        Assert.False(RunRankingService.IsDivergedOrGapped(cleanRun));

        var branchedRun = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = instanceId,
            Kind = RunKind.Backtest,
            Status = RunStatus.Completed,
            CreatedAt = DateTimeOffset.UtcNow,
            Relation = RunRelation.Branched,
            Continuity = RunContinuity.Contiguous
        };
        Assert.True(RunRankingService.IsDivergedOrGapped(branchedRun));

        var gappedRun = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = instanceId,
            Kind = RunKind.Backtest,
            Status = RunStatus.Completed,
            CreatedAt = DateTimeOffset.UtcNow,
            Relation = RunRelation.Appended,
            Continuity = RunContinuity.Gapped
        };
        Assert.True(RunRankingService.IsDivergedOrGapped(gappedRun));

        var partialRun = new FlowRun
        {
            Id = Guid.NewGuid(),
            EngineInstanceId = instanceId,
            Kind = RunKind.Backtest,
            Status = RunStatus.Completed,
            CreatedAt = DateTimeOffset.UtcNow,
            Relation = RunRelation.Appended,
            Continuity = RunContinuity.Contiguous,
            IsPartial = true
        };
        Assert.True(RunRankingService.IsDivergedOrGapped(partialRun));
    }
}
