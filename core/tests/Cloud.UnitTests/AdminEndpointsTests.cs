// -----------------------------------------------------------------------------
// <copyright file="AdminEndpointsTests.cs" company="BleedingOnTheEdge">
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
/// Unit and integration tests for Admin Governance (user management, RBAC elevation/demotion, suspension, deletion)
/// and Cluster Settings (fleet, security, marketplace policies).
/// </summary>
public sealed class AdminEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task GetAdminSettings_ReturnsPlatformPolicies()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        using HttpResponseMessage response = await client.GetAsync(
            new Uri("/api/admin/settings", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        ClusterSettingsDto? settings = await response.Content.ReadFromJsonAsync<ClusterSettingsDto>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(settings);
        Assert.True(settings.HeartbeatIntervalSeconds > 0);
        Assert.True(settings.HeartbeatTimeoutSeconds > 0);
    }

    [Fact]
    public async Task SaveAdminSettings_UpdatesClusterPolicies()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        var customSettings = new ClusterSettingsDto
        {
            HeartbeatIntervalSeconds = 45,
            HeartbeatTimeoutSeconds = 90,
            MaxFleetSizePerAccount = 25,
            CommandQueueExpirySeconds = 120,
            EnforceStrictKeyRotationDays = 30,
            AllowedIpRanges = "10.0.0.0/8,192.168.1.0/24",
            AllowSelfRegistration = false,
            RequireMfaForLiveTrading = true,
            PlatformFeePercent = 12.5,
            RequireCurationApproval = true
        };

        using HttpResponseMessage saveResponse = await client.PutAsJsonAsync(
            new Uri("/api/admin/settings", UriKind.Relative),
            customSettings,
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, saveResponse.StatusCode);
        ClusterSettingsDto? saved = await saveResponse.Content.ReadFromJsonAsync<ClusterSettingsDto>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(saved);
        Assert.Equal(45, saved.HeartbeatIntervalSeconds);
        Assert.Equal(12.5, saved.PlatformFeePercent);
        Assert.False(saved.AllowSelfRegistration);

        // Verification: GET returns the persisted custom settings
        using HttpResponseMessage getResp = await client.GetAsync(
            new Uri("/api/admin/settings", UriKind.Relative)).ConfigureAwait(true);
        ClusterSettingsDto? retrieved = await getResp.Content.ReadFromJsonAsync<ClusterSettingsDto>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(retrieved);
        Assert.Equal(45, retrieved.HeartbeatIntervalSeconds);
        Assert.Equal(12.5, retrieved.PlatformFeePercent);
    }

    [Fact]
    public async Task ResetAdminSettings_RestoresDefaultPolicies()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        // Mutate first
        await client.PutAsJsonAsync(
            new Uri("/api/admin/settings", UriKind.Relative),
            new ClusterSettingsDto { HeartbeatIntervalSeconds = 999 },
            JsonOptions).ConfigureAwait(true);

        // Reset
        using HttpResponseMessage resetResponse = await client.PostAsync(
            new Uri("/api/admin/settings/reset", UriKind.Relative),
            null).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);
        ClusterSettingsDto? reset = await resetResponse.Content.ReadFromJsonAsync<ClusterSettingsDto>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(reset);
        Assert.Equal(5, reset.HeartbeatIntervalSeconds);
        Assert.True(reset.AllowSelfRegistration);
    }

    [Fact]
    public async Task ListUsersAdmin_ReturnsUsersAndFiltersByRole()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        // Register a trader and an operator
        await client.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new
            {
                UserName = "gov_trader_1",
                Password = "Password123!",
                Role = UserRole.Trader,
                Tier = SubscriptionTier.Pro
            },
            JsonOptions).ConfigureAwait(true);

        await client.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new
            {
                UserName = "gov_operator_1",
                Password = "Password123!",
                Role = UserRole.Operator,
                Tier = SubscriptionTier.Enterprise
            },
            JsonOptions).ConfigureAwait(true);

        // All users
        using HttpResponseMessage allResponse = await client.GetAsync(
            new Uri("/api/admin/users", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, allResponse.StatusCode);
        List<UserProfileView>? allUsers = await allResponse.Content.ReadFromJsonAsync<List<UserProfileView>>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(allUsers);
        Assert.True(allUsers.Count >= 2);

        // Filter by Operator
        using HttpResponseMessage operatorResponse = await client.GetAsync(
            new Uri("/api/admin/users?Role=Operator", UriKind.Relative)).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, operatorResponse.StatusCode);
        List<UserProfileView>? operators = await operatorResponse.Content.ReadFromJsonAsync<List<UserProfileView>>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(operators);
        Assert.All(operators, u => Assert.Equal(UserRole.Operator, u.Role));
    }

    [Fact]
    public async Task UpdateUserRole_ElevatesUserRole()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        using HttpResponseMessage regResp = await client.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new
            {
                UserName = "trader_to_promote",
                Password = "Password123!",
                Role = UserRole.Trader
            },
            JsonOptions).ConfigureAwait(true);
        AuthSessionResponse? session = await regResp.Content.ReadFromJsonAsync<AuthSessionResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(session);
        Guid userId = session.User.UserId;

        // Elevate to Operator
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
    }

    [Fact]
    public async Task UpdateUserRole_ReturnsNotFound_WhenUserDoesNotExist()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        Guid missingId = Guid.NewGuid();
        using HttpResponseMessage response = await client.PutAsJsonAsync(
            new Uri($"/api/admin/users/{missingId}/role", UriKind.Relative),
            new
            {
                UserId = missingId,
                Role = UserRole.Operator
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateUserStatus_SuspendsAndReactivatesUser()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        using HttpResponseMessage regResp = await client.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new
            {
                UserName = "rogue_trader",
                Password = "Password123!",
                Role = UserRole.Trader
            },
            JsonOptions).ConfigureAwait(true);
        AuthSessionResponse? session = await regResp.Content.ReadFromJsonAsync<AuthSessionResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(session);
        Guid userId = session.User.UserId;

        // Suspend account
        using HttpResponseMessage suspendResp = await client.PutAsJsonAsync(
            new Uri($"/api/admin/users/{userId}/status", UriKind.Relative),
            new
            {
                UserId = userId,
                IsActive = false
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, suspendResp.StatusCode);

        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            User stored = await db.Users.AsNoTracking().SingleAsync(u => u.Id == userId).ConfigureAwait(true);
            Assert.False(stored.IsActive);
        }

        // Reactivate account
        using HttpResponseMessage reactivateResp = await client.PutAsJsonAsync(
            new Uri($"/api/admin/users/{userId}/status", UriKind.Relative),
            new
            {
                UserId = userId,
                IsActive = true
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, reactivateResp.StatusCode);

        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            User stored = await db.Users.AsNoTracking().SingleAsync(u => u.Id == userId).ConfigureAwait(true);
            Assert.True(stored.IsActive);
        }
    }

    [Fact]
    public async Task UpdateUserStatus_ReturnsNotFound_WhenUserDoesNotExist()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        Guid missingId = Guid.NewGuid();
        using HttpResponseMessage response = await client.PutAsJsonAsync(
            new Uri($"/api/admin/users/{missingId}/status", UriKind.Relative),
            new
            {
                UserId = missingId,
                IsActive = false
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteUser_RemovesStandardUser()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        using HttpResponseMessage regResp = await client.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new
            {
                UserName = "transient_user",
                Password = "Password123!",
                Role = UserRole.Trader
            },
            JsonOptions).ConfigureAwait(true);
        AuthSessionResponse? session = await regResp.Content.ReadFromJsonAsync<AuthSessionResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(session);
        Guid userId = session.User.UserId;

        using HttpResponseMessage deleteResp = await client.DeleteAsync(
            new Uri($"/api/admin/users/{userId}", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        using CloudDbContext db = factory.Database.CreateDbContext();
        bool exists = await db.Users.AnyAsync(u => u.Id == userId).ConfigureAwait(true);
        Assert.False(exists);
    }

    [Fact]
    public async Task DeleteUser_BlocksDeletingRootSuperAdmin()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        // Obtain root superadmin user
        Guid superadminId;
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            var existingSuperAdmin = await db.Users.FirstOrDefaultAsync(u => u.UserName == "superadmin").ConfigureAwait(true);
            if (existingSuperAdmin != null)
            {
                superadminId = existingSuperAdmin.Id;
            }
            else
            {
                var acc = new Account { Id = Guid.NewGuid(), Name = "Root Account", SubscriptionTier = SubscriptionTier.Enterprise, CreatedAt = DateTimeOffset.UtcNow };
                var superadmin = new User
                {
                    Id = Guid.NewGuid(),
                    AccountId = acc.Id,
                    UserName = "superadmin",
                    Role = UserRole.SuperAdmin,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                db.Accounts.Add(acc);
                db.Users.Add(superadmin);
                await db.SaveChangesAsync().ConfigureAwait(true);
                superadminId = superadmin.Id;
            }
        }

        // Attempting to delete root superadmin must fail with 400 BadRequest
        using HttpResponseMessage deleteResp = await client.DeleteAsync(
            new Uri($"/api/admin/users/{superadminId}", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.BadRequest, deleteResp.StatusCode);

        // Verify still exists
        using CloudDbContext verifyDb = factory.Database.CreateDbContext();
        bool exists = await verifyDb.Users.AnyAsync(u => u.Id == superadminId).ConfigureAwait(true);
        Assert.True(exists);
    }

    [Fact]
    public async Task DeleteUser_ReturnsNotFound_WhenUserDoesNotExist()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        Guid missingId = Guid.NewGuid();
        using HttpResponseMessage response = await client.DeleteAsync(
            new Uri($"/api/admin/users/{missingId}", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateUserSubscription_UpdatesTier()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        using HttpResponseMessage regResp = await client.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new
            {
                UserName = "sub_upgrade_user",
                Password = "Password123!",
                Role = UserRole.Trader,
                Tier = SubscriptionTier.Free
            },
            JsonOptions).ConfigureAwait(true);
        AuthSessionResponse? session = await regResp.Content.ReadFromJsonAsync<AuthSessionResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(session);
        Guid userId = session.User.UserId;

        using HttpResponseMessage updateResp = await client.PutAsJsonAsync(
            new Uri($"/api/admin/users/{userId}/subscription", UriKind.Relative),
            new
            {
                UserId = userId,
                Tier = SubscriptionTier.Enterprise
            },
            JsonOptions).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);
        UserProfileView? view = await updateResp.Content.ReadFromJsonAsync<UserProfileView>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(view);
        Assert.Equal(SubscriptionTier.Enterprise, view.SubscriptionTier);

        // Missing user returns 404
        using HttpResponseMessage missingResp = await client.PutAsJsonAsync(
            new Uri($"/api/admin/users/{Guid.NewGuid()}/subscription", UriKind.Relative),
            new
            {
                UserId = Guid.NewGuid(),
                Tier = SubscriptionTier.Pro
            },
            JsonOptions).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, missingResp.StatusCode);
    }

    [Fact]
    public async Task ResetUserPassword_ResetsPasswordAndRejectsEmpty()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        using HttpResponseMessage regResp = await client.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new
            {
                UserName = "pwd_reset_user",
                Password = "Password123!",
                Role = UserRole.Trader
            },
            JsonOptions).ConfigureAwait(true);
        AuthSessionResponse? session = await regResp.Content.ReadFromJsonAsync<AuthSessionResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(session);
        Guid userId = session.User.UserId;

        // Reset password
        using HttpResponseMessage resetResp = await client.PostAsJsonAsync(
            new Uri($"/api/admin/users/{userId}/reset-password", UriKind.Relative),
            new
            {
                UserId = userId,
                NewPassword = "NewStrongPassword123!"
            },
            JsonOptions).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, resetResp.StatusCode);

        // Empty password returns 400
        using HttpResponseMessage emptyResp = await client.PostAsJsonAsync(
            new Uri($"/api/admin/users/{userId}/reset-password", UriKind.Relative),
            new
            {
                UserId = userId,
                NewPassword = ""
            },
            JsonOptions).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, emptyResp.StatusCode);
    }

    [Fact]
    public async Task ImpersonateUser_CreatesImpersonationSession()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        // Register operator
        using HttpResponseMessage opResp = await client.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new
            {
                UserName = "admin_op_impersonator",
                Password = "Password123!",
                Role = UserRole.Operator
            },
            JsonOptions).ConfigureAwait(true);
        AuthSessionResponse? opSession = await opResp.Content.ReadFromJsonAsync<AuthSessionResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(opSession);

        // Register target
        using HttpResponseMessage regResp = await client.PostAsJsonAsync(
            new Uri("/api/auth/register", UriKind.Relative),
            new
            {
                UserName = "target_impersonate_user",
                Password = "Password123!",
                Role = UserRole.Trader
            },
            JsonOptions).ConfigureAwait(true);
        AuthSessionResponse? session = await regResp.Content.ReadFromJsonAsync<AuthSessionResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(session);
        Guid userId = session.User.UserId;

        client.DefaultRequestHeaders.Add("X-User-Id", opSession.User.UserId.ToString());

        using HttpResponseMessage impResp = await client.PostAsync(
            new Uri($"/api/admin/impersonate/{userId}", UriKind.Relative),
            null).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, impResp.StatusCode);
        AuthSessionResponse? impSession = await impResp.Content.ReadFromJsonAsync<AuthSessionResponse>(JsonOptions).ConfigureAwait(true);
        Assert.NotNull(impSession);
        Assert.False(string.IsNullOrWhiteSpace(impSession.Token));

        // Missing user returns 404
        using HttpResponseMessage missingResp = await client.PostAsync(
            new Uri($"/api/admin/impersonate/{Guid.NewGuid()}", UriKind.Relative),
            null).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, missingResp.StatusCode);
    }
}
