// -----------------------------------------------------------------------------
// <copyright file="ClockTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.UnitTests.Clock;

using System;
using Kernel.Clock;
using Xunit;

public sealed class ClockTests
{
    [Fact]
    public void TickClock_InitializesWithZeroTimestamp()
    {
        var clock = new TickClock();

        Assert.Equal(0, clock.GetTimestamp());
        Assert.Equal(DateTimeKind.Utc, clock.GetUtcNow().Kind);
        Assert.Equal(DateTime.MinValue, clock.GetUtcNow());
    }

    [Fact]
    public void TickClock_SetTickTime_UpdatesTimestampAndUtcNow()
    {
        var clock = new TickClock();
        long testTicks = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc).Ticks;

        clock.SetTickTime(testTicks);

        Assert.Equal(testTicks, clock.GetTimestamp());
        var utcNow = clock.GetUtcNow();
        Assert.Equal(DateTimeKind.Utc, utcNow.Kind);
        Assert.Equal(2026, utcNow.Year);
        Assert.Equal(10, utcNow.Month);
        Assert.Equal(11, utcNow.Day);
        Assert.Equal(12, utcNow.Hour);
    }

    [Fact]
    public void SystemClock_ReturnsEnvironmentTickCountAndCurrentUtcTime()
    {
        var clock = new SystemClock();

        long timestamp1 = clock.GetTimestamp();
        DateTime before = DateTime.UtcNow;
        DateTime now = clock.GetUtcNow();
        DateTime after = DateTime.UtcNow;
        long timestamp2 = clock.GetTimestamp();

        Assert.True(timestamp2 >= timestamp1);
        Assert.Equal(DateTimeKind.Utc, now.Kind);
        Assert.True(now >= before && now <= after);
    }
}
