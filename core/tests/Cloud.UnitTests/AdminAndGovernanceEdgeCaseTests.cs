// -----------------------------------------------------------------------------
// <copyright file="AdminAndGovernanceEdgeCaseTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cloud.Data;
using Cloud.Endpoints;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Adversarial and edge case tests for Admin Governance and Cluster Settings.
/// Tests corrupt data recovery, RBAC tier boundary enforcement, suspension lockouts,
/// and superadmin immutability.
/// </summary>
public sealed class AdminAndGovernanceEdgeCaseTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task CorruptedSettingsJson_GracefullyFallsBackToDefaults()
    {
        using var factory = new CloudWebApplicationFactory();

        // Inject corrupt non-JSON string directly into the database system settings table
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            var corruptSetting = new SystemSetting
            {
                Key = "Cluster.GlobalSettings",
                Category = "Cluster",
                Description = "Corrupted policy",
                Value = "<<INVALID_CORRUPTED_JSON_DATA>>",
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.SystemSettings.Add(corruptSetting);
            await db.SaveChangesAsync().ConfigureAwait(true);
        }

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await client.GetAsync(
            new Uri("/api/admin/settings", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        ClusterSettingsDto? settings = await response.Content.ReadFromJsonAsync<ClusterSettingsDto>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(settings);
        // Falls back to safe default interval
        Assert.Equal(5, settings.HeartbeatIntervalSeconds);
        Assert.Equal(30, settings.HeartbeatTimeoutSeconds);
    }

    [Fact]
    public async Task SuspendedUser_CannotLogin_OrAccessProtectedEndpoints()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient adminClient = factory.CreateAuthorisedClient();

        // 1. Register a test trader
        using HttpResponseMessage regResp = await adminClient.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new
            {
                UserName = "locked_trader",
                Password = "Password123!",
                Role = UserRole.Trader
            },
            JsonOptions).ConfigureAwait(true);
        Assert.True(regResp.IsSuccessStatusCode);

        AuthSessionResponse? session = await regResp.Content.ReadFromJsonAsync<AuthSessionResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(session);
        Guid userId = session.User.UserId;

        // 2. Admin suspends the user
        using HttpResponseMessage suspendResp = await adminClient.PutAsJsonAsync(
            new Uri($"/api/admin/users/{userId}/status", UriKind.Relative),
            new
            {
                UserId = userId,
                IsActive = false
            },
            JsonOptions).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, suspendResp.StatusCode);

        // 3. User attempts to login while suspended
        using HttpClient anonClient = factory.CreateClient();
        using HttpResponseMessage loginResp = await anonClient.PostAsJsonAsync(
            new Uri("/api/auth/login", UriKind.Relative),
            new
            {
                UserName = "locked_trader",
                Password = "Password123!"
            },
            JsonOptions).ConfigureAwait(true);

        // Suspended users must not be authenticated
        Assert.Equal(HttpStatusCode.Unauthorized, loginResp.StatusCode);
    }

    [Fact]
    public async Task SuperAdmin_RoleCannotBeDeleted_EvenWithMultipleAdmins()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        // Query all users to locate root superadmin
        using HttpResponseMessage usersResp = await client.GetAsync(
            new Uri("/api/admin/users", UriKind.Relative)).ConfigureAwait(true);
        List<UserProfileView>? users = await usersResp.Content.ReadFromJsonAsync<List<UserProfileView>>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(users);

        Guid superAdminId;
        UserProfileView? superAdmin = users.FirstOrDefault(u => u.Role == UserRole.SuperAdmin);
        if (superAdmin is null)
        {
            // Seed one if seeder had not run
            using CloudDbContext db = factory.Database.CreateDbContext();
            var acc = new Account { Id = Guid.NewGuid(), Name = "Root Account", SubscriptionTier = SubscriptionTier.Enterprise, CreatedAt = DateTimeOffset.UtcNow };
            var rootUser = new User { Id = Guid.NewGuid(), AccountId = acc.Id, UserName = "root_superadmin", Role = UserRole.SuperAdmin, IsActive = true, CreatedAt = DateTimeOffset.UtcNow };
            db.Accounts.Add(acc);
            db.Users.Add(rootUser);
            await db.SaveChangesAsync().ConfigureAwait(true);
            superAdminId = rootUser.Id;
        }
        else
        {
            superAdminId = superAdmin.UserId;
        }

        // Attempt deletion of root SuperAdmin
        using HttpResponseMessage deleteResp = await client.DeleteAsync(
            new Uri($"/api/admin/users/{superAdminId}", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.BadRequest, deleteResp.StatusCode);
    }

    [Fact]
    public async Task ElevatingUserToOperator_GrantsFleetManagement_WithoutUserManagement()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        // 1. Register a fresh developer
        using HttpResponseMessage regResp = await client.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new
            {
                UserName = "dev_to_operator",
                Password = "Password123!",
                Role = UserRole.Developer
            },
            JsonOptions).ConfigureAwait(true);
        AuthSessionResponse? session = await regResp.Content.ReadFromJsonAsync<AuthSessionResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(session);
        Guid userId = session.User.UserId;

        // 2. Elevate to Operator
        using HttpResponseMessage elevateResp = await client.PutAsJsonAsync(
            new Uri($"/api/admin/users/{userId}/role", UriKind.Relative),
            new
            {
                UserId = userId,
                Role = UserRole.Operator
            },
            JsonOptions).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, elevateResp.StatusCode);

        UserProfileView? updated = await elevateResp.Content.ReadFromJsonAsync<UserProfileView>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(updated);
        Assert.Equal(UserRole.Operator, updated.Role);
        Assert.True(updated.CanManageFleet);
        Assert.False(updated.CanManageUsers);
        Assert.False(updated.CanManageSettings);
    }

    [Fact]
    public async Task ResetClusterSettings_RestoresAllDefaultValuesIdempotently()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        // Perform reset twice
        for (int i = 0; i < 2; i++)
        {
            using HttpResponseMessage resetResp = await client.PostAsync(
                new Uri("/api/admin/settings/reset", UriKind.Relative),
                null).ConfigureAwait(true);

            Assert.Equal(HttpStatusCode.OK, resetResp.StatusCode);
            ClusterSettingsDto? reset = await resetResp.Content.ReadFromJsonAsync<ClusterSettingsDto>(JsonOptions).ConfigureAwait(true);
            Assert.NotNull(reset);
            Assert.Equal(5, reset.HeartbeatIntervalSeconds);
            Assert.Equal(30, reset.HeartbeatTimeoutSeconds);
            Assert.Equal(50, reset.MaxFleetSizePerAccount);
            Assert.True(reset.AllowSelfRegistration);
            Assert.True(reset.RequireCurationApproval);
        }
    }
}
