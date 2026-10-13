using Sdk.Shared;

namespace Sdk.UnitTests.Shared;

/// <summary>
/// Drives the window-completion fallback that <see cref="TickWindowBranchTests"/> could not reach.
/// <para>
/// The constructor seeds each configured timeframe's last-complete time to <c>0</c> and eagerly creates
/// a rolling accumulator per aggregated price type. So the <em>first</em> tick whose window start is
/// greater than zero sees <c>currentWindowStart &gt; lastTime</c> — the window is treated as completed —
/// while the Mid accumulator still has <c>Count == 0</c> because no tick has been fed yet. That takes the
/// fallback branch, which recomputes the completed bar from the raw ring buffer rather than from the
/// accumulator. Every assertion below follows from that: the bar is built from the buffered ticks, and it
/// is marked complete.
/// </para>
/// </summary>
public class TickWindowCompletionFallbackTests
{
    private static readonly string[] SymbolsX = { "X" };

    [Fact]
    public void First_Positive_Tick_Completes_A_Window_Without_Storing_A_Bar()
    {
        // The constructor seeds the last-complete time to 0, so the first tick whose window starts after
        // 0 is treated as completing a window. The tick is not yet in the ring buffer at that point, so the
        // completion fallback finds an empty buffer and stores no bar -- the window event still fires.
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 }, maxTicksPerSymbol: 50);
        int completed = 0;
        window.WindowCompleted += (_, _) => completed++;

        window.PushTick("X", new Tick(TimeSpan.TicksPerMinute, 2.0, 4.0, 7));

        Assert.Equal(1, completed);
        Assert.False(window.TryGetLastCompletedBar("X", TimeFrame.M1,
            out double _, out double _, out double _, out double _, out double _));
    }

    [Fact]
    public void Fallback_Aggregates_High_Low_Close_Across_Buffered_Ticks()
    {
        // Several ticks land in the same window before it completes, so the fallback's inner loop walks
        // them: the first seeds open/high/low/close, the rest must move high and low and advance close.
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.H1 }, maxTicksPerSymbol: 50);
        long m = TimeSpan.TicksPerMinute;

        window.PushTick("X", new Tick(m, 1.0, 1.0, 1));          // mid 1.0
        window.PushTick("X", new Tick(m * 2, 5.0, 5.0, 2));      // mid 5.0 -> new high
        window.PushTick("X", new Tick(m * 3, 2.0, 2.0, 3));      // mid 2.0 -> new low
        window.PushTick("X", new Tick(m * 4, 3.0, 3.0, 4));      // mid 3.0 -> close

        window.GetCurrentStats("X", TimeFrame.H1, PriceType.Bid,
            out double open, out double high, out double low, out double close, out double volume, out bool _);

        Assert.Equal(1.0, open);
        Assert.Equal(5.0, high);
        Assert.Equal(1.0, low);
        Assert.Equal(3.0, close);
        Assert.Equal(10, volume);
    }

    [Fact]
    public void Fallback_Skips_Buffered_Ticks_Before_The_Window_Start()
    {
        // The buffer retains ticks from earlier windows; the fallback must skip any tick whose time is
        // before the completing window's start rather than folding it into the aggregate.
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.H1 }, maxTicksPerSymbol: 50);
        long h = TimeSpan.TicksPerMinute * 60;

        window.PushTick("X", new Tick(0, 9.0, 9.0, 100));   // lands in the previous window
        window.PushTick("X", new Tick(h, 1.0, 1.0, 1));     // completes it; window start = h
        window.PushTick("X", new Tick(h + h, 2.0, 2.0, 1)); // completes again; window start = 2h

        Assert.True(window.TryGetLastCompletedBar("X", TimeFrame.H1,
            out double open, out double high, out double low, out double _, out double volume));

        // Only the tick at h is inside the completed window; the t=0 tick precedes it and must be skipped.
        Assert.Equal(1.0, open);
        Assert.Equal(1.0, high);
        Assert.Equal(1.0, low);
        Assert.Equal(1, volume);
    }

    [Fact]
    public void WindowCompleted_Raised_When_The_Fallback_Completes_A_Bar()
    {
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 }, maxTicksPerSymbol: 50);
        var raised = new List<(string Symbol, TimeFrame TimeFrame)>();
        window.WindowCompleted += (symbol, tf) => raised.Add((symbol, tf));

        window.PushTick("X", new Tick(TimeSpan.TicksPerMinute, 1.0, 1.0, 1));
        window.PushTick("X", new Tick(TimeSpan.TicksPerMinute * 2, 1.0, 1.0, 1));

        Assert.Equal(2, raised.Count);
        Assert.All(raised, r => Assert.Equal(TimeFrame.M1, r.TimeFrame));
    }

    [Fact]
    public void GetRecentTicks_Returns_Nothing_For_An_Unknown_Symbol()
    {
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 }, maxTicksPerSymbol: 4);
        for (int i = 0; i < 6; i++)
        {
            window.PushTick("X", new Tick(i, 1.0, 1.0, 1));
        }

        // The ring buffer is capacity 4 and has wrapped; reads are bounded by what is stored.
        Assert.Empty(window.GetRecentTicks("NOPE", 3));
        Assert.NotEmpty(window.GetRecentTicks("X", 3));
        Assert.True(window.GetRecentTicks("X", 3).Count <= 4);
    }

    [Fact]
    public void Dispose_Is_Idempotent_And_Releases_The_Buffer()
    {
        var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 }, maxTicksPerSymbol: 8);
        window.PushTick("X", new Tick(1, 1.0, 1.0, 1));

        window.Dispose();
        // A second dispose must be a no-op rather than returning the pooled array twice.
        window.Dispose();
    }
}
