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
    public async Task Login_WithUnregisteredUser_FailsWithUnauthorized()
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

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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
            Role = UserRole.Trader,
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
        Assert.Equal(UserRole.Operator, session.User.Role);
        Assert.Equal(SubscriptionTier.Free, session.User.SubscriptionTier);

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

    [Fact]
    public async Task RegisterAndLogin_ValidationFailures_ReturnAppropriateErrorCodes()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateClient();

        // 1. Missing username/password in register -> 400
        var emptyRegister = new
        {
            UserName = "",
            Password = ""
        };
        using HttpResponseMessage badRegister = await client
            .PostAsJsonAsync(Relative("/api/auth/register"), emptyRegister, JsonOptions)
            .ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, badRegister.StatusCode);

        // 2. Duplicate username registration -> 400 (InvalidOperationException)
        var reg1 = new
        {
            UserName = "unique_tester",
            Password = "password123"
        };
        using HttpResponseMessage okReg = await client
            .PostAsJsonAsync(Relative("/api/auth/register"), reg1, JsonOptions)
            .ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, okReg.StatusCode);

        using HttpResponseMessage dupReg = await client
            .PostAsJsonAsync(Relative("/api/auth/register"), reg1, JsonOptions)
            .ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, dupReg.StatusCode);

        // 3. Missing username/password in login -> 400
        var emptyLogin = new
        {
            UserName = "",
            Password = ""
        };
        using HttpResponseMessage badLogin = await client
            .PostAsJsonAsync(Relative("/api/auth/login"), emptyLogin, JsonOptions)
            .ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, badLogin.StatusCode);
    }
}
