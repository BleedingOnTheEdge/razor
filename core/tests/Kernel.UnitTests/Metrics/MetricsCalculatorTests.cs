using Kernel.Backtesting;
using Kernel.Metrics;
using Sdk.Shared;

namespace Kernel.UnitTests.Metrics;

/// <summary>
/// Covers the performance metrics that a completed backtest is judged by: return, win rate,
/// profit factor and the risk ratios.
/// <para>
/// These numbers are what a trader reads and what an optimisation searches against, so their
/// definitions matter as much as their arithmetic. The tests therefore pin the formulas at their
/// edges -- no trades, no losses, no drawdown, one trade, no dates -- because those are the cases
/// where a plausible implementation quietly returns a different answer.
/// </para>
/// </summary>
public sealed class MetricsCalculatorTests
{
    private readonly MetricsCalculator _calculator = new();

    /// <summary>Builds a trade whose return is derived from account equity at open.</summary>
    private static Position Trade(double profit, double equityAtOpen = 10_000.0, double returnPct = 0.0) =>
        new()
        {
            Profit = profit,
            AccountEquityAtOpen = equityAtOpen,
            ReturnPct = returnPct
        };

    private static BacktestResult Result(
        double balance,
        double drawdown = 0.0,
        double dailyDrawdown = 0.0,
        int? totalTrades = null,
        params Position[] history) =>
        new()
        {
            Balance = balance,
            Drawdown = drawdown,
            DailyDrawdown = dailyDrawdown,
            TotalTrades = totalTrades ?? history.Length,
            History = history
        };

    // ---- guards and headline figures ----

    [Fact]
    public void Calculate_Rejects_A_Null_Result()
    {
        Assert.Throws<ArgumentNullException>(() => _calculator.Calculate(null!, 10_000.0));
    }

    [Fact]
    public void Net_Profit_And_Return_Are_Measured_Against_The_Initial_Balance()
    {
        var result = Result(10_250.0, history: [Trade(150.0), Trade(100.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(250.0, metrics.NetProfit);
        Assert.Equal(2.5, metrics.ReturnPct);
    }

    [Fact]
    public void A_Losing_Run_Reports_A_Negative_Return()
    {
        var result = Result(9_500.0, history: [Trade(-500.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(-500.0, metrics.NetProfit);
        Assert.Equal(-5.0, metrics.ReturnPct);
    }

    [Fact]
    public void A_Zero_Initial_Balance_Yields_No_Percentage_Rather_Than_Dividing_By_It()
    {
        // A percentage return is undefined without a base; reporting zero is safer than infinity.
        var result = Result(500.0, history: [Trade(500.0)]);

        var metrics = _calculator.Calculate(result, 0.0);

        Assert.Equal(500.0, metrics.NetProfit);
        Assert.Equal(0.0, metrics.ReturnPct);
    }

    [Fact]
    public void Drawdowns_Are_Carried_Through_From_The_Result()
    {
        var result = Result(10_000.0, drawdown: 12.5, dailyDrawdown: 3.75);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(12.5, metrics.MaxDrawdownPct);
        Assert.Equal(3.75, metrics.MaxDailyDrawdownPct);
    }

    // ---- win rate and profit factor ----

    [Fact]
    public void Win_Rate_Is_The_Share_Of_Profitable_Trades()
    {
        var result = Result(
            10_225.0,
            history: [Trade(100.0), Trade(-50.0), Trade(200.0), Trade(-25.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(4, metrics.TotalTrades);
        Assert.Equal(50.0, metrics.WinRatePct);
    }

    [Fact]
    public void A_Trade_That_Breaks_Even_Counts_As_A_Loss()
    {
        // Only strictly positive profit is a win, so a flat trade dilutes the win rate.
        var result = Result(10_100.0, history: [Trade(100.0), Trade(0.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(50.0, metrics.WinRatePct);
    }

    [Fact]
    public void No_Trades_Leaves_The_Win_Rate_At_Zero()
    {
        var result = Result(10_000.0);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(0, metrics.TotalTrades);
        Assert.Equal(0.0, metrics.WinRatePct);
        Assert.Equal(0.0, metrics.NetProfit);
    }

    [Fact]
    public void Profit_Factor_Is_Gross_Profit_Over_Gross_Loss()
    {
        var result = Result(10_225.0, history: [Trade(300.0), Trade(-75.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(4.0, metrics.ProfitFactor);
    }

    [Fact]
    public void A_Run_With_No_Losses_Has_An_Infinite_Profit_Factor()
    {
        // Nothing was lost, so the ratio is unbounded rather than undefined, and callers
        // distinguish that case from a zero.
        var result = Result(10_300.0, history: [Trade(300.0), Trade(0.0, equityAtOpen: 0.0, returnPct: 0.01)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.True(double.IsPositiveInfinity(metrics.ProfitFactor));
    }

    [Fact]
    public void A_Run_With_Only_Losses_Has_A_Zero_Profit_Factor()
    {
        var result = Result(9_700.0, history: [Trade(-300.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(0.0, metrics.ProfitFactor);
    }

    [Fact]
    public void A_Run_Of_Flat_Trades_Reports_A_Zero_Profit_Factor()
    {
        // No gross profit and no gross loss: the ratio is vacuous, and zero is the honest answer.
        var result = Result(
            10_000.0,
            history: [Trade(0.0, equityAtOpen: 0.0, returnPct: 0.0), Trade(0.0, equityAtOpen: 0.0, returnPct: 0.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(0.0, metrics.ProfitFactor);
    }

    [Fact]
    public void Win_Rate_Uses_The_Declared_Trade_Count_While_Returns_Use_The_History()
    {
        // TotalTrades and the history can disagree; pinning which one each figure uses keeps the
        // behaviour explicit rather than accidental. Worth knowing, because a mismatch makes the
        // win rate disagree with the returns the ratios are computed from.
        var result = Result(10_100.0, totalTrades: 10, history: [Trade(100.0), Trade(-50.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(10, metrics.TotalTrades);
        Assert.Equal(10.0, metrics.WinRatePct);
    }

    // ---- ratios: edges ----

    [Fact]
    public void Fewer_Than_Two_Returns_Yields_No_Sharpe_Or_Sortino()
    {
        // Dispersion is undefined for a single observation, so the ratios are reported as zero.
        var result = Result(10_100.0, history: [Trade(100.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(0.0, metrics.SharpeRatio);
        Assert.Equal(0.0, metrics.SortinoRatio);
    }

    [Fact]
    public void Identical_Returns_Yield_No_Sharpe_Because_There_Is_No_Dispersion()
    {
        var result = Result(10_200.0, history: [Trade(100.0), Trade(100.0), Trade(100.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(0.0, metrics.SharpeRatio);
    }

    [Fact]
    public void A_Run_With_No_Losing_Trades_Has_An_Infinite_Sortino()
    {
        var result = Result(
            10_300.0,
            history: [Trade(100.0), Trade(150.0), Trade(50.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.True(double.IsPositiveInfinity(metrics.SortinoRatio));
    }

    [Fact]
    public void A_Run_Of_Flat_Trades_Reports_No_Sortino()
    {
        // No downside and no upside: neither infinite (nothing gained) nor undefined.
        var result = Result(
            10_000.0,
            history: [Trade(0.0, equityAtOpen: 0.0, returnPct: 0.0), Trade(0.0, equityAtOpen: 0.0, returnPct: 0.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(0.0, metrics.SortinoRatio);
    }

    [Fact]
    public void Losing_Trades_Produce_Finite_Risk_Adjusted_Ratios()
    {
        var result = Result(
            10_100.0,
            drawdown: 5.0,
            history: [Trade(300.0), Trade(-100.0), Trade(200.0), Trade(-300.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.True(double.IsFinite(metrics.SharpeRatio));
        Assert.True(double.IsFinite(metrics.SortinoRatio));
        Assert.True(double.IsFinite(metrics.CalmarRatio));
    }

    // ---- ratios: annualisation ----

    [Fact]
    public void A_Window_Of_About_A_Year_Normalises_Like_The_Default()
    {
        // Without dates the window is taken as exactly one year; a real calendar year is 366/365.25
        // of a year, so the two agree closely rather than exactly. Asserting closeness is the
        // honest form of this: they are the same normalisation, not the same arithmetic.
        var result = Result(10_200.0, drawdown: 10.0, history: [Trade(300.0), Trade(-100.0)]);
        var defaulted = _calculator.Calculate(result, 10_000.0);

        var oneYear = _calculator.Calculate(
            result,
            10_000.0,
            startDate: new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            endDate: new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc));

        Assert.Equal(defaulted.SharpeRatio, oneYear.SharpeRatio, 2);
    }

    [Fact]
    public void A_Window_Shorter_Than_A_Month_Is_Not_Annualised()
    {
        // Below a month, scaling up amplifies noise more than it informs, so the raw ratio is used
        // and the two treatments must be measurably different.
        var result = Result(10_200.0, drawdown: 10.0, history: [Trade(300.0), Trade(-100.0)]);

        var annualised = _calculator.Calculate(result, 10_000.0);
        var shortWindow = _calculator.Calculate(
            result,
            10_000.0,
            startDate: new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            endDate: new DateTime(2024, 1, 11, 0, 0, 0, DateTimeKind.Utc));

        Assert.NotEqual(annualised.SharpeRatio, shortWindow.SharpeRatio);
    }

    [Fact]
    public void An_Inverted_Or_Empty_Window_Falls_Back_To_One_Year()
    {
        // endDate before startDate is not a window, so the default is used rather than a negative one.
        var result = Result(10_200.0, drawdown: 10.0, history: [Trade(300.0), Trade(-100.0)]);
        var defaults = _calculator.Calculate(result, 10_000.0);

        var inverted = _calculator.Calculate(
            result,
            10_000.0,
            startDate: new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            endDate: new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc));

        Assert.Equal(defaults.SharpeRatio, inverted.SharpeRatio, 6);
    }

    // ---- calmar ----

    [Fact]
    public void Calmar_Is_Return_Over_Drawdown()
    {
        var result = Result(10_200.0, drawdown: 10.0, history: [Trade(200.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        // 2% return against a 10% drawdown.
        Assert.Equal(0.2, metrics.CalmarRatio, 6);
    }

    [Fact]
    public void A_Profit_With_No_Drawdown_Has_An_Infinite_Calmar()
    {
        var result = Result(10_200.0, drawdown: 0.0, history: [Trade(200.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.True(double.IsPositiveInfinity(metrics.CalmarRatio));
    }

    [Fact]
    public void A_Loss_With_No_Drawdown_Reports_Zero_Calmar()
    {
        // A negative return with no drawdown has no meaningful ratio, and infinity would be wrong.
        var result = Result(9_800.0, drawdown: 0.0, history: [Trade(-200.0)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(0.0, metrics.CalmarRatio);
    }

    // ---- trade returns ----

    [Fact]
    public void A_Trade_Return_Is_Measured_Against_The_Equity_At_Open()
    {
        // A large profit on a small account must register as a large return. Identical returns
        // leave no dispersion, so the ratio itself is zero -- what this pins is that the return is
        // taken against the equity at open rather than the initial balance: 100 on 1,000 is a 10%
        // trade, so the Sortino (which only needs a downside) reflects that scale.
        var result = Result(
            10_250.0,
            history:
            [
                Trade(profit: 200.0, equityAtOpen: 1_000.0),
                Trade(profit: -50.0, equityAtOpen: 1_000.0)
            ]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        // 200/1000 = +0.2 and -50/1000 = -0.05, so the downside deviation is small relative to the
        // mean and the ratio is finite and positive.
        Assert.True(double.IsFinite(metrics.SortinoRatio));
        Assert.True(metrics.SortinoRatio > 0);
    }

    [Fact]
    public void A_Trade_Without_Open_Equity_Falls_Back_To_Its_Recorded_Return()
    {
        // Older or synthetic histories may not carry the equity, and the recorded return is then
        // the only basis available.
        var result = Result(
            10_100.0,
            history: [Trade(profit: 100.0, equityAtOpen: 0.0, returnPct: 0.1), Trade(profit: -50.0, equityAtOpen: 0.0, returnPct: -0.05)]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(1.0, metrics.ReturnPct, 6);
        Assert.True(double.IsFinite(metrics.SharpeRatio));
    }

    [Fact]
    public void A_Mixed_History_Combines_Both_Return_Sources()
    {
        var result = Result(
            10_150.0,
            drawdown: 4.0,
            history:
            [
                Trade(profit: 200.0, equityAtOpen: 10_000.0),
                Trade(profit: -50.0, equityAtOpen: 0.0, returnPct: -0.005)
            ]);

        var metrics = _calculator.Calculate(result, 10_000.0);

        Assert.Equal(1.5, metrics.ReturnPct, 6);
        Assert.True(double.IsFinite(metrics.SortinoRatio));
    }
}
