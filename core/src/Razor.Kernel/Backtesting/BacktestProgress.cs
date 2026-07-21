namespace Razor.Kernel.Backtesting;

/// <summary>
/// Progress information emitted during a backtest.
/// </summary>
public sealed record BacktestProgress(
    double PercentComplete,
    string Message
);
