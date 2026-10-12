// -----------------------------------------------------------------------------
// <copyright file="AuthEndpointsTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cloud.Data;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;

/// <summary>
/// Verifies authentication endpoints: login, registration, and session retrieval.
/// </summary>
public sealed class AuthEndpointsTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private static async Task<T?> ReadJsonAsync<T>(HttpResponseMessage response)
    {
        return await response.Content.ReadFromJsonAsync<T>(JsonOptions).ConfigureAwait(true);
    }

    private static Uri Relative(string url) => new(url, UriKind.Relative);

    [Fact]
    public async Task Login_WithDevCredentials_SucceedsWithoutPreconfiguredApiKey()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient anonymousClient = factory.CreateClient();

        var loginPayload = new
        {
            UserName = "admin-trader",
            Password = "dev-password"
        };

        using HttpResponseMessage response = await anonymousClient
            .PostAsJsonAsync(Relative("/api/auth/login"), loginPayload, JsonOptions)
            .ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        AuthSessionResponse? session = await ReadJsonAsync<AuthSessionResponse>(response).ConfigureAwait(true);
        Assert.NotNull(session);
        Assert.False(string.IsNullOrWhiteSpace(session.Token));
        Assert.Equal("admin-trader", session.User.UserName);
        Assert.Equal(UserRole.Admin, session.User.Role);
    }

    [Fact]
    public async Task Register_CreatesNewUserAndAccount_AndIssuesToken()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient anonymousClient = factory.CreateClient();

        var registerPayload = new
        {
            UserName = "quant_researcher",
            Password = "securePassword123!",
            AccountName = "Alpha Capital Management",
            Role = UserRole.Developer,
            SubscriptionTier = SubscriptionTier.Pro
        };

        using HttpResponseMessage registerResponse = await anonymousClient
            .PostAsJsonAsync(Relative("/api/auth/register"), registerPayload, JsonOptions)
            .ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        AuthSessionResponse? session = await ReadJsonAsync<AuthSessionResponse>(registerResponse).ConfigureAwait(true);
        Assert.NotNull(session);
        Assert.Equal("quant_researcher", session.User.UserName);
        Assert.Equal("Alpha Capital Management", session.User.AccountName);
        Assert.Equal(UserRole.Developer, session.User.Role);
        Assert.Equal(SubscriptionTier.Pro, session.User.SubscriptionTier);

        // Subsequent login with matching password succeeds
        var loginPayload = new
        {
            UserName = "quant_researcher",
            Password = "securePassword123!"
        };

        using HttpResponseMessage loginResponse = await anonymousClient
            .PostAsJsonAsync(Relative("/api/auth/login"), loginPayload, JsonOptions)
            .ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        // Login with invalid password fails with 401
        var wrongPasswordPayload = new
        {
            UserName = "quant_researcher",
            Password = "wrongPassword!"
        };

        using HttpResponseMessage failedResponse = await anonymousClient
            .PostAsJsonAsync(Relative("/api/auth/login"), wrongPasswordPayload, JsonOptions)
            .ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.Unauthorized, failedResponse.StatusCode);
    }

    [Fact]
    public async Task GetSession_ReturnsActiveUserProfile()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateClient();

        using HttpResponseMessage response = await client.GetAsync(Relative("/api/auth/session")).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        UserProfileView? user = await ReadJsonAsync<UserProfileView>(response).ConfigureAwait(true);
        Assert.NotNull(user);
        Assert.Equal("dev-operator", user.UserName);
    }
}
