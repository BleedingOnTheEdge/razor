using Sdk.Shared;

namespace Sdk.UnitTests.Shared;

/// <summary>
/// Branch-coverage companions to <see cref="TickWindowTests"/>.
/// <para>
/// The existing suite exercises the O(1) rolling-accumulator path, where the queried timeframe is one the
/// window was constructed with. These tests drive the paths that only the fallbacks reach: a query for a
/// timeframe the window does not track (so there are no rolling stats to read), the defensive early
/// returns, the window-completion fallback that computes a bar from the raw buffer, and the untaken arms
/// of the price selector. The behaviour asserted is the contract, not the implementation.
/// </para>
/// </summary>
public class TickWindowBranchTests
{
    private static readonly string[] SymbolsX = { "X" };

    // ── GetCurrentStats: fallback when the queried timeframe has no rolling stats ──

    [Fact]
    public void GetCurrentStats_Falls_Back_To_Buffer_For_Untracked_Timeframe()
    {
        // The window tracks M1 only, so querying H1 finds no rolling accumulator and must compute
        // the aggregate from the raw tick buffer instead.
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 });
        window.PushTick("X", new Tick(0, 1.0, 1.1, 5));
        window.PushTick("X", new Tick(TimeSpan.TicksPerMinute, 1.5, 1.6, 7));
        window.PushTick("X", new Tick(TimeSpan.TicksPerMinute * 2, 1.2, 1.3, 9));

        window.GetCurrentStats("X", TimeFrame.H1, PriceType.Bid,
            out double open, out double high, out double low, out double close, out double volume, out bool isComplete);

        Assert.Equal(1.0, open);
        Assert.Equal(1.5, high);
        Assert.Equal(1.0, low);
        Assert.Equal(1.2, close);
        Assert.Equal(21, volume);
        // All three ticks fall inside the same H1 window, and it starts at the first tick, so the
        // aggregate covers the whole window and the fallback reports it complete.
        Assert.True(isComplete);
    }

    [Fact]
    public void GetCurrentStats_Fallback_Selects_Ask_And_Mid_Prices()
    {
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 });
        window.PushTick("X", new Tick(0, 1.0, 2.0, 1));
        window.PushTick("X", new Tick(TimeSpan.TicksPerMinute, 3.0, 4.0, 1));

        window.GetCurrentStats("X", TimeFrame.H1, PriceType.Ask,
            out double askOpen, out double askHigh, out double askLow, out double _, out double _, out bool _);
        Assert.Equal(2.0, askOpen);
        Assert.Equal(4.0, askHigh);
        Assert.Equal(2.0, askLow);

        // Midpoint of (1.0,2.0) and (3.0,4.0): 1.5 .. 3.5
        window.GetCurrentStats("X", TimeFrame.H1, PriceType.Mid,
            out double midOpen, out double midHigh, out double midLow, out double _, out double _, out bool _);
        Assert.Equal(1.5, midOpen);
        Assert.Equal(3.5, midHigh);
        Assert.Equal(1.5, midLow);
    }

    [Fact]
    public void GetCurrentStats_Fallback_Skips_Ticks_Before_The_Window_Start()
    {
        // Two hours of ticks: the H1 window starts at the last tick's hour, so the earlier tick must be
        // skipped by the fallback loop rather than contributing to the aggregate.
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 });
        long hour = TimeSpan.TicksPerMinute * 60;
        window.PushTick("X", new Tick(0, 9.0, 9.0, 100));
        window.PushTick("X", new Tick(hour, 1.0, 1.0, 1));
        window.PushTick("X", new Tick(hour + TimeSpan.TicksPerMinute, 2.0, 2.0, 2));

        window.GetCurrentStats("X", TimeFrame.H1, PriceType.Bid,
            out double open, out double _, out double low, out double close, out double volume, out bool _);

        Assert.Equal(1.0, open);
        Assert.Equal(1.0, low);
        Assert.Equal(2.0, close);
        Assert.Equal(3, volume);
    }

    [Fact]
    public void GetCurrentStats_Returns_No_Stats_For_Empty_Buffer_And_Zero_Period()
    {
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 });

        // No ticks: the buffer is empty, so there is nothing to aggregate.
        window.GetCurrentStats("X", TimeFrame.M1, PriceType.Bid,
            out double open, out double _, out double _, out double _, out double _, out bool isComplete);
        Assert.Equal(0, open);
        Assert.False(isComplete);

        // TimeFrame.Tick carries no period, so the period guard returns before touching the buffer.
        window.GetCurrentStats("X", TimeFrame.Tick, PriceType.Bid,
            out double tickOpen, out double _, out double _, out double _, out double _, out bool tickComplete);
        Assert.Equal(0, tickOpen);
        Assert.False(tickComplete);
    }

    [Fact]
    public void GetCurrentStats_Unknown_Symbol_Returns_No_Stats()
    {
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 });
        window.GetCurrentStats("NOPE", TimeFrame.M1, PriceType.Bid,
            out double open, out double _, out double _, out double _, out double _, out bool isComplete);
        Assert.Equal(0, open);
        Assert.False(isComplete);
    }

    [Fact]
    public void GetCurrentStats_Reports_Complete_Window_From_Buffer()
    {
        // Ticks straddling two M1 periods: the second period is complete, which the fallback must report.
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.H1 });
        window.PushTick("X", new Tick(0, 1.0, 1.0, 1));
        window.PushTick("X", new Tick(TimeSpan.TicksPerMinute, 1.1, 1.1, 1));
        window.PushTick("X", new Tick(TimeSpan.TicksPerMinute * 2, 1.2, 1.2, 1));

        window.GetCurrentStats("X", TimeFrame.M1, PriceType.Bid,
            out double open, out double _, out double _, out double _, out double _, out bool isComplete);

        Assert.Equal(1.2, open);
        Assert.True(isComplete);
    }

    // ── SelectPrice: the default arm ──

    [Fact]
    public void GetCurrentStats_Unknown_PriceType_Falls_Back_To_Bid()
    {
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 });
        window.PushTick("X", new Tick(0, 1.0, 9.0, 1));
        window.PushTick("X", new Tick(TimeSpan.TicksPerMinute, 2.0, 9.0, 1));

        // An out-of-range enum value exercises the selector's default arm, which must behave as Bid.
        window.GetCurrentStats("X", TimeFrame.H1, (PriceType)42,
            out double open, out double _, out double _, out double _, out double _, out bool _);

        Assert.Equal(1.0, open);
    }

    // ── PushTick: window completion via the buffer fallback ──

    [Fact]
    public void PushTick_Completes_Bar_Using_Buffer_When_No_Rolling_Stats_Exist()
    {
        // The first tick advances the window before any rolling accumulator has been fed, so completion
        // has to be derived from the buffer, and the resulting bar must be retrievable.
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 }, maxTicksPerSymbol: 50);
        window.PushTick("X", new Tick(0, 1.0, 1.0, 1));
        window.PushTick("X", new Tick(TimeSpan.TicksPerMinute, 2.0, 2.0, 1));
        window.PushTick("X", new Tick(TimeSpan.TicksPerMinute * 2, 3.0, 3.0, 1));

        Assert.True(window.TryGetLastCompletedBar("X", TimeFrame.M1,
            out double open, out double high, out double low, out double close, out double volume));
        Assert.True(open > 0);
        Assert.True(high >= open);
        Assert.True(low <= open);
        Assert.Equal(close, high);
        Assert.True(volume > 0);
    }

    [Fact]
    public void PushTick_Completes_Bar_From_Buffer_On_A_Time_Jump()
    {
        // A tick whose time jumps a whole hour: the completion fallback derives the bar's window from the
        // last buffered tick, so the earlier tick is inside it and yields a real, complete bar rather than
        // an invented or empty one.
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 }, maxTicksPerSymbol: 50);
        window.PushTick("X", new Tick(0, 1.0, 1.0, 4));
        window.PushTick("X", new Tick(TimeSpan.TicksPerMinute * 60, 2.0, 2.0, 6));

        Assert.True(window.TryGetLastCompletedBar("X", TimeFrame.M1,
            out double open, out double high, out double low, out double close, out double volume));
        Assert.Equal(1.0, open);
        Assert.Equal(1.0, high);
        Assert.Equal(1.0, low);
        Assert.Equal(1.0, close);
        Assert.Equal(4, volume);
    }

    [Fact]
    public void TryGetLastCompletedBar_Returns_False_For_Symbol_With_No_Bar()
    {
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 });
        window.PushTick("X", new Tick(0, 1.0, 1.0, 1));

        Assert.False(window.TryGetLastCompletedBar("X", TimeFrame.M1,
            out double open, out double _, out double _, out double _, out double _));
        Assert.Equal(0, open);

        Assert.False(window.TryGetLastCompletedBar("X", TimeFrame.H1,
            out double h1Open, out double _, out double _, out double _, out double _));
        Assert.Equal(0, h1Open);
    }

    // ── CopyRecentTicks: unknown symbol and bounded copy ──

    [Fact]
    public void CopyRecentTicks_Reports_What_It_Wrote()
    {
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 }, maxTicksPerSymbol: 50);
        for (int i = 0; i < 5; i++)
        {
            window.PushTick("X", new Tick(i, 1.0, 1.0, 1));
        }

        Span<Tick> destination = new Tick[3];
        Assert.Equal(3, window.CopyRecentTicks("X", destination, 3));
        Assert.Equal(4, destination[2].Time);

        Assert.Equal(0, window.CopyRecentTicks("NOPE", destination, 3));
    }

    [Fact]
    public void PushTick_Null_Symbol_Is_Rejected()
    {
        using var window = new TickWindow(SymbolsX, new[] { TimeFrame.M1 });
        Assert.Throws<ArgumentNullException>(() => window.PushTick(null!, new Tick(0, 1.0, 1.0, 1)));
    }

    [Fact]
    public void Constructor_Rejects_Null_Arguments()
    {
        Assert.Throws<ArgumentNullException>(() => new TickWindow(null!, new[] { TimeFrame.M1 }));
        Assert.Throws<ArgumentNullException>(() => new TickWindow(SymbolsX, null!));
    }
}
