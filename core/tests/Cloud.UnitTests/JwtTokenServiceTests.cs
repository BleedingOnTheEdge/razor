// -----------------------------------------------------------------------------
// <copyright file="JwtTokenServiceTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System;
using Cloud.Data;
using Cloud.Services;
using Xunit;

public sealed class JwtTokenServiceTests
{
    private readonly CloudOptions _options = new()
    {
        JwtSecret = "test-secret-key-1234567890-abcdefghijklmnop"
    };

    [Fact]
    public void GenerateToken_ProducesValidToken_And_ValidatesClaims()
    {
        var service = new JwtTokenService(_options, TimeProvider.System);
        Guid userId = Guid.NewGuid();
        Guid accountId = Guid.NewGuid();
        string userName = "trader-bob";
        UserRole role = UserRole.Trader;

        string token = service.GenerateToken(userId, accountId, userName, role);
        Assert.NotNull(token);
        Assert.Contains('.', token);

        JwtUserClaims? claims = service.ValidateToken(token);
        Assert.NotNull(claims);
        Assert.Equal(userId, claims.UserId);
        Assert.Equal(accountId, claims.AccountId);
        Assert.Equal(userName, claims.UserName);
        Assert.Equal(role, claims.Role);
        Assert.True(claims.ExpiresAt > DateTimeOffset.UtcNow);
    }

    [Fact]
    public void ValidateToken_WithTamperedPayload_ReturnsNull()
    {
        var service = new JwtTokenService(_options, TimeProvider.System);
        string token = service.GenerateToken(Guid.NewGuid(), Guid.NewGuid(), "alice", UserRole.Operator);

        string[] parts = token.Split('.');
        // Tamper with payload
        string tamperedPayload = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("{\"role\":\"SuperAdmin\"}")).TrimEnd('=');
        string tamperedToken = $"{parts[0]}.{tamperedPayload}.{parts[2]}";

        JwtUserClaims? claims = service.ValidateToken(tamperedToken);
        Assert.Null(claims);
    }

    [Fact]
    public void ValidateToken_WithExpiredToken_ReturnsNull()
    {
        var service = new JwtTokenService(_options, TimeProvider.System);
        // Lifetime negative 1 hour -> already expired
        string token = service.GenerateToken(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "charlie",
            UserRole.Trader,
            lifetime: TimeSpan.FromHours(-1));

        JwtUserClaims? claims = service.ValidateToken(token);
        Assert.Null(claims);
    }

    [Fact]
    public void ValidateToken_WithNullOrGarbage_ReturnsNull()
    {
        var service = new JwtTokenService(_options, TimeProvider.System);

        Assert.Null(service.ValidateToken(null));
        Assert.Null(service.ValidateToken(""));
        Assert.Null(service.ValidateToken("not-a-token"));
        Assert.Null(service.ValidateToken("a.b"));
        Assert.Null(service.ValidateToken("a.b.c.d"));
    }
}
