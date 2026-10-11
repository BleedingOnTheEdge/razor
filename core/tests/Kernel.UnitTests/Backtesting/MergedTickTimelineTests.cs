// -----------------------------------------------------------------------------
// <copyright file="MergedTickTimelineTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.UnitTests.Backtesting;

using System;
using System.Collections.Generic;
using System.Linq;
using Kernel.Backtesting;
using Sdk.Shared;
using Xunit;

public sealed class MergedTickTimelineTests
{
    private static Tick CreateTick(long timeTicks, double bid = 1.0, double ask = 1.0002) =>
        new(timeTicks, bid, ask, 1.0);

    [Fact]
    public void EnumerateEvents_RejectsNullArguments()
    {
        Assert.Throws<ArgumentNullException>(() =>
            MergedTickTimeline.EnumerateEvents(null!, ["EURUSD"]).ToList());

        Assert.Throws<ArgumentNullException>(() =>
            MergedTickTimeline.EnumerateEvents([[]], null!).ToList());
    }

    [Fact]
    public void EnumerateEvents_RejectsMismatchedStreamAndSymbolCounts()
    {
        var streams = new IReadOnlyList<Tick>[] { Array.Empty<Tick>(), Array.Empty<Tick>() };
        var symbols = new[] { "EURUSD" };

        var ex = Assert.Throws<ArgumentException>(() =>
            MergedTickTimeline.EnumerateEvents(streams, symbols).ToList());

        Assert.Contains("Streams count (2) must equal symbols count (1)", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void EnumerateEvents_ReturnsEmpty_WhenStreamsArrayIsEmpty()
    {
        var result = MergedTickTimeline.EnumerateEvents(Array.Empty<IReadOnlyList<Tick>>(), Array.Empty<string>()).ToList();
        Assert.Empty(result);
    }

    [Fact]
    public void EnumerateEvents_SkipsNullAndEmptyStreams()
    {
        var streams = new IReadOnlyList<Tick>[]
        {
            null!,
            Array.Empty<Tick>(),
            new List<Tick> { CreateTick(100) }
        };
        var symbols = new[] { "AUDUSD", "GBPUSD", "EURUSD" };

        var result = MergedTickTimeline.EnumerateEvents(streams, symbols).ToList();

        Assert.Single(result);
        Assert.Equal(100, result[0].Time);
        Assert.Equal(2, result[0].StreamIndex);
        Assert.Equal("EURUSD", symbols[result[0].StreamIndex]);
    }

    [Fact]
    public void EnumerateEvents_MergesMultipleStreamsInMonotonicOrder()
    {
        var eurTicks = new List<Tick>
        {
            CreateTick(100, 1.1000, 1.1002),
            CreateTick(300, 1.1005, 1.1007),
            CreateTick(500, 1.1010, 1.1012)
        };

        var gbpTicks = new List<Tick>
        {
            CreateTick(200, 1.3000, 1.3002),
            CreateTick(400, 1.3005, 1.3007),
            CreateTick(600, 1.3010, 1.3012)
        };

        var streams = new IReadOnlyList<Tick>[] { eurTicks, gbpTicks };
        var symbols = new[] { "EURUSD", "GBPUSD" };

        var merged = MergedTickTimeline.EnumerateEvents(streams, symbols).ToList();

        Assert.Equal(6, merged.Count);
        long[] expectedTimes = [100, 200, 300, 400, 500, 600];
        int[] expectedStreams = [0, 1, 0, 1, 0, 1];

        for (int i = 0; i < 6; i++)
        {
            Assert.Equal(expectedTimes[i], merged[i].Time);
            Assert.Equal(expectedStreams[i], merged[i].StreamIndex);
        }
    }

    [Fact]
    public void EnumerateEvents_TieBreaksByStreamIndexWhenTimestampsAreEqual()
    {
        // When timestamps are identical, lower stream index comes first
        var stream0 = new List<Tick> { CreateTick(100) };
        var stream1 = new List<Tick> { CreateTick(100) };
        var stream2 = new List<Tick> { CreateTick(100) };

        var streams = new IReadOnlyList<Tick>[] { stream0, stream1, stream2 };
        var symbols = new[] { "SYM0", "SYM1", "SYM2" };

        var merged = MergedTickTimeline.EnumerateEvents(streams, symbols).ToList();

        Assert.Equal(3, merged.Count);
        Assert.Equal(0, merged[0].StreamIndex);
        Assert.Equal(1, merged[1].StreamIndex);
        Assert.Equal(2, merged[2].StreamIndex);
    }

    [Fact]
    public void EnumerateEvents_ThrowsInvalidOperationException_WhenStreamHasUnsortedTicks()
    {
        var unsortedTicks = new List<Tick>
        {
            CreateTick(200),
            CreateTick(150) // Non-monotonic!
        };

        var streams = new IReadOnlyList<Tick>[] { unsortedTicks };
        var symbols = new[] { "EURUSD" };

        var ex = Assert.Throws<InvalidOperationException>(() =>
            MergedTickTimeline.EnumerateEvents(streams, symbols).ToList());

        Assert.Contains("Stream 0 (EURUSD) contains unsorted ticks: 150 < 200", ex.Message, StringComparison.Ordinal);
    }
}
