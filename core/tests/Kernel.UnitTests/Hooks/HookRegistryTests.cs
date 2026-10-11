// -----------------------------------------------------------------------------
// <copyright file="HookRegistryTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.UnitTests.Hooks;

using Kernel.Hooks;
using Sdk.Shared;
using Xunit;

public sealed class HookRegistryTests
{
    [Fact]
    public void HookRegistry_InitializesAllSubRegistries()
    {
        var registry = new HookRegistry();

        Assert.NotNull(registry.Backtest);
        Assert.NotNull(registry.Live);
        Assert.NotNull(registry.Optimization);
        Assert.NotNull(registry.Report);
    }

    [Fact]
    public void HookRegistry_ClearAll_ClearsAllSubRegistries()
    {
        var registry = new HookRegistry();

        registry.Backtest.OnTickCompleted.Register((t, ctx) => { }, 1);
        registry.Live.OnTickProcessed.Register((t, ctx) => { }, 1);
        registry.Optimization.OnGenerationCompleted.Register((p, ctx) => { }, 1);
        registry.Report.OnAfterGenerate.Register((r, ctx) => { }, 1);

        registry.ClearAll();

        // Verify clean state by re-registering
        registry.Backtest.OnTickCompleted.Register((t, ctx) => { }, 1);
        registry.Live.OnTickProcessed.Register((t, ctx) => { }, 1);
        registry.Optimization.OnGenerationCompleted.Register((p, ctx) => { }, 1);
        registry.Report.OnAfterGenerate.Register((r, ctx) => { }, 1);
    }
}
