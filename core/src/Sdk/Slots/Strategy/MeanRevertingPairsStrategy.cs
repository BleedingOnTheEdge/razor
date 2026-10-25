// -----------------------------------------------------------------------------
// <copyright file="MeanRevertingPairsStrategy.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Sdk.Slots.Strategy;

using Sdk.Shared;

/// <summary>
/// Built-in mean-reverting statistical strategy using rolling z-score price deviations.
/// Generates mean-reverting long or short orders when prices deviate significantly
/// from the moving average, with configurable risk stops and trade volumes.
/// </summary>
public class MeanRevertingPairsStrategy : StrategyBase
{
    private readonly List<double> _prices = [];

    /// <summary>Gets or sets the lookback period in ticks for mean calculation.</summary>
    [Gene(5.0, 100.0, 1.0, GeneType.Discrete, Name = "LookbackPeriod", Order = 1)]
    public double LookbackPeriod { get; set; } = 20.0;

    /// <summary>Gets or sets the entry deviation threshold in standard deviations.</summary>
    [Gene(0.5, 4.0, 0.0, GeneType.Continuous, Name = "EntryDeviation", Order = 2)]
    public double EntryDeviation { get; set; } = 2.0;

    /// <summary>Gets or sets the stop-loss percentage relative to entry price.</summary>
    [Gene(0.005, 0.10, 0.0, GeneType.Continuous, Name = "StopLossPct", Order = 3)]
    public double StopLossPct { get; set; } = 0.02;

    /// <summary>Gets or sets the take-profit percentage relative to entry price.</summary>
    [Gene(0.005, 0.10, 0.0, GeneType.Continuous, Name = "TakeProfitPct", Order = 4)]
    public double TakeProfitPct { get; set; } = 0.03;

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

        _prices.Add(price);
        int maxLen = (int)Math.Max(5, LookbackPeriod);
        while (_prices.Count > maxLen)
        {
            _prices.RemoveAt(0);
        }

        if (_prices.Count < maxLen || Broker == null)
        {
            return;
        }

        // Calculate sample mean
        double sum = 0.0;
        for (int i = 0; i < _prices.Count; i++)
        {
            sum += _prices[i];
        }
        double mean = sum / _prices.Count;

        // Calculate sample standard deviation
        double sumSq = 0.0;
        for (int i = 0; i < _prices.Count; i++)
        {
            double diff = _prices[i] - mean;
            sumSq += diff * diff;
        }
        double variance = sumSq / _prices.Count;
        double stdDev = Math.Sqrt(variance);

        if (stdDev < 1e-8)
        {
            return;
        }

        double zScore = (price - mean) / stdDev;

        // Price is significantly below mean: Expect upward reversion -> Buy
        if (zScore < -EntryDeviation)
        {
            double sl = price * (1.0 - StopLossPct);
            double tp = price * (1.0 + TakeProfitPct);
            _ = BuyAsync(symbol, TradeVolume, sl, tp, "MeanReversion Oversold Rebound");
        }
        // Price is significantly above mean: Expect downward reversion -> Sell
        else if (zScore > EntryDeviation)
        {
            double sl = price * (1.0 + StopLossPct);
            double tp = price * (1.0 - TakeProfitPct);
            _ = SellAsync(symbol, TradeVolume, sl, tp, "MeanReversion Overbought Retracement");
        }
    }
}
