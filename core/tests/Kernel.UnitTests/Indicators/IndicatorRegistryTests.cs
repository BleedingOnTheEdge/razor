// -----------------------------------------------------------------------------
// <copyright file="IndicatorRegistryTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.UnitTests.Indicators;

using System;
using Kernel.Indicators;
using Sdk.Shared;
using Xunit;

internal sealed class DummyIndicator : Indicator
{
    public bool WasDisposed
    {
        get; private set;
    }

    public override void Calculate(long index)
    {
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        WasDisposed = true;
    }
}

internal sealed class ParameterizedIndicator : Indicator, IRegistryAwareIndicator
{
    public string Symbol
    {
        get;
    }
    public int Period
    {
        get;
    }
    public bool WasDisposed
    {
        get; private set;
    }
    public IIndicatorRegistry? InjectedRegistry
    {
        get; private set;
    }

    public ParameterizedIndicator(string symbol, int period)
    {
        Symbol = symbol;
        Period = period;
    }

    public override void Calculate(long index)
    {
    }

    public void SetRegistry(IIndicatorRegistry registry)
    {
        InjectedRegistry = registry;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        WasDisposed = true;
    }
}

public sealed class IndicatorRegistryTests : IDisposable
{
    private readonly TickWindow _tickWindow;

    public IndicatorRegistryTests()
    {
        _tickWindow = new TickWindow(["EURUSD"], [TimeFrame.M1]);
    }

    public void Dispose()
    {
        _tickWindow.Dispose();
    }

    [Fact]
    public void Constructor_RejectsNullTickWindow()
    {
        Assert.Throws<ArgumentNullException>(() => new IndicatorRegistry(null!));
    }

    [Fact]
    public void Get_CreatesInstance_WithParameterlessConstructor()
    {
        var registry = new IndicatorRegistry(_tickWindow);

        var ind = registry.Get<DummyIndicator>();

        Assert.NotNull(ind);
        Assert.Contains(ind, registry.ActiveIndicators);
    }

    [Fact]
    public void Get_CachesInstanceAndIncrementsReferenceCount_ForSameArguments()
    {
        var registry = new IndicatorRegistry(_tickWindow);

        var first = registry.Get<ParameterizedIndicator>("EURUSD", 14);
        var second = registry.Get<ParameterizedIndicator>("EURUSD", 14);

        Assert.Same(first, second);
        Assert.Single(registry.ActiveIndicators);

        // Different arguments return distinct instances
        var different = registry.Get<ParameterizedIndicator>("EURUSD", 21);
        Assert.NotSame(first, different);
        Assert.Equal(2, registry.ActiveIndicators.Count);
    }

    [Fact]
    public void Get_InjectsRegistryAndWindow()
    {
        var registry = new IndicatorRegistry(_tickWindow);

        var ind = registry.Get<ParameterizedIndicator>("EURUSD", 14);

        Assert.Same(registry, ind.InjectedRegistry);
    }

    [Fact]
    public void Unregister_DecrementsRefCount_AndDisposesOnlyWhenCountReachesZero()
    {
        var registry = new IndicatorRegistry(_tickWindow);

        var first = registry.Get<ParameterizedIndicator>("EURUSD", 14);
        var second = registry.Get<ParameterizedIndicator>("EURUSD", 14);

        // First unregister reduces ref count from 2 to 1 -> not disposed
        bool result1 = registry.Unregister(first);
        Assert.True(result1);
        Assert.False(first.WasDisposed);
        Assert.Single(registry.ActiveIndicators);

        // Second unregister reduces ref count from 1 to 0 -> disposed and removed from active
        bool result2 = registry.Unregister(second);
        Assert.True(result2);
        Assert.True(first.WasDisposed);
        Assert.Empty(registry.ActiveIndicators);
    }

    [Fact]
    public void Unregister_ReturnsFalseForNullOrUnknownIndicator()
    {
        var registry = new IndicatorRegistry(_tickWindow);

        Assert.False(registry.Unregister(null!));

        using var untracked = new DummyIndicator { Signature = "untracked-sig" };
        Assert.False(registry.Unregister(untracked));
    }

    [Fact]
    public void DisposeAll_DisposesAllCachedIndicatorsAndClearsRegistry()
    {
        var registry = new IndicatorRegistry(_tickWindow);

        var ind1 = registry.Get<DummyIndicator>();
        var ind2 = registry.Get<ParameterizedIndicator>("EURUSD", 14);

        registry.DisposeAll();

        Assert.True(ind1.WasDisposed);
        Assert.True(ind2.WasDisposed);
        Assert.Empty(registry.ActiveIndicators);
    }

    [Fact]
    public void Factory_Create_ReturnsIndicatorRegistryInstance()
    {
        var registry = IndicatorRegistryFactory.Create(_tickWindow);
        Assert.NotNull(registry);
    }
}
