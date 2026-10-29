// -----------------------------------------------------------------------------
// <copyright file="EngineCliOptionsTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.UnitTests.Core;

using System;
using Engine.Core;
using Xunit;

public sealed class EngineCliOptionsTests
{
    [Fact]
    public void Parse_SetsEndpointAndAppConstants()
    {
        string[] args = ["--endpoint=wss://razor.sinavali.ir/engine"];
        var options = EngineCliOptions.Parse(args);

        Assert.NotNull(options);
        Assert.Equal("wss://razor.sinavali.ir/engine", options.Endpoint);
        Assert.Equal("wss://razor.sinavali.ir/engine", AppConstants.PrimaryEndpoint);
        Assert.Equal("wss://razor.sinavali.ir/engine", AppConstants.FallbackEndpoint);
    }

    [Fact]
    public void Parse_NormalizesCloudFlagToWebSocketEndpoint()
    {
        string[] args = ["--cloud", "https://razor.sinavali.ir"];
        var options = EngineCliOptions.Parse(args);

        Assert.NotNull(options);
        Assert.Equal("wss://razor.sinavali.ir/engine", options.Endpoint);
        Assert.Equal("wss://razor.sinavali.ir/engine", AppConstants.PrimaryEndpoint);
    }

    [Fact]
    public void Parse_SetsCredentialsFromCliFlags()
    {
        string[] args =
        [
            "--instance", "4d15b35d-c1e5-48c9-ad95-7ad568692ea9",
            "--engine-id", "engine-worker-01",
            "--key", "ZtzjnDLuvSolF8GxYUEpOcRJP0carSVuu9wxBYgar4Y=",
            "--username", "pro-trader",
            "--password", "trader123",
            "--endpoint", "wss://razor.sinavali.ir/engine"
        ];

        var options = EngineCliOptions.Parse(args);

        Assert.NotNull(options);
        Assert.Equal("4d15b35d-c1e5-48c9-ad95-7ad568692ea9", options.InstanceId);
        Assert.Equal("engine-worker-01", options.EngineId);
        Assert.Equal("pro-trader", Credentials.Username);
        Assert.Equal("trader123", Credentials.Password);
        Assert.Equal("ZtzjnDLuvSolF8GxYUEpOcRJP0carSVuu9wxBYgar4Y=", Credentials.InstanceApiKey);
        Assert.Equal("wss://razor.sinavali.ir/engine", AppConstants.PrimaryEndpoint);
    }
}
