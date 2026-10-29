// -----------------------------------------------------------------------------
// <copyright file="TrendFollowingStrategy.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Sdk.Slots.Strategy;

using Sdk.Shared;

/// <summary>
/// Standard built-in dual exponential moving average (EMA) trend-following strategy.
/// Computes fast and slow EMAs and triggers long or short orders on crossovers
/// with configurable stop-loss, take-profit, and volume gene parameters.
/// </summary>
public class TrendFollowingStrategy : StrategyBase
{
    private double _fastEma;
    private double _slowEma;
    private bool _initialized;

    /// <summary>Gets or sets the period of the fast exponential moving average.</summary>
    [Gene(2.0, 50.0, 1.0, GeneType.Discrete, Name = "FastPeriod", Order = 1)]
    public double FastPeriod { get; set; } = 9.0;

    /// <summary>Gets or sets the period of the slow exponential moving average.</summary>
    [Gene(10.0, 200.0, 1.0, GeneType.Discrete, Name = "SlowPeriod", Order = 2)]
    public double SlowPeriod { get; set; } = 21.0;

    /// <summary>Gets or sets the stop-loss percentage relative to entry price.</summary>
    [Gene(0.001, 0.10, 0.0, GeneType.Continuous, Name = "StopLossPct", Order = 3)]
    public double StopLossPct { get; set; } = 0.02;

    /// <summary>Gets or sets the take-profit percentage relative to entry price.</summary>
    [Gene(0.002, 0.20, 0.0, GeneType.Continuous, Name = "TakeProfitPct", Order = 4)]
    public double TakeProfitPct { get; set; } = 0.04;

    /// <summary>Gets or sets the order volume in lots.</summary>
    [Gene(0.01, 10.0, 0.0, GeneType.Continuous, Name = "TradeVolume", Order = 5)]
    public double TradeVolume { get; set; } = 1.0;

    /// <inheritdoc/>
    public override void OnTick(string symbol, Tick tick)
    {
        double price = tick.Ask > 0 ? tick.Ask : tick.Bid;
        if (price <= 0)
        {
            return;
        }

        if (!_initialized)
        {
            _fastEma = price;
            _slowEma = price;
            _initialized = true;
            return;
        }

        double fastAlpha = 2.0 / (Math.Max(2.0, FastPeriod) + 1.0);
        double slowAlpha = 2.0 / (Math.Max(2.0, SlowPeriod) + 1.0);

        double prevFast = _fastEma;
        double prevSlow = _slowEma;

        _fastEma = (price * fastAlpha) + (prevFast * (1.0 - fastAlpha));
        _slowEma = (price * slowAlpha) + (prevSlow * (1.0 - slowAlpha));

        if (Broker == null)
        {
            return;
        }

        // Bullish crossover: Fast EMA crosses above Slow EMA
        if (prevFast <= prevSlow && _fastEma > _slowEma)
        {
            double sl = price * (1.0 - StopLossPct);
            double tp = price * (1.0 + TakeProfitPct);
            _ = BuyAsync(symbol, TradeVolume, sl, tp, "TrendFollowing Bullish Crossover");
        }
        // Bearish crossover: Fast EMA crosses below Slow EMA
        else if (prevFast >= prevSlow && _fastEma < _slowEma)
        {
            double sl = price * (1.0 + StopLossPct);
            double tp = price * (1.0 - TakeProfitPct);
            _ = SellAsync(symbol, TradeVolume, sl, tp, "TrendFollowing Bearish Crossover");
        }
    }
}
