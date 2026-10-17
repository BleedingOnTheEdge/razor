using System.Diagnostics.CodeAnalysis;
using Sdk.Shared;

namespace Samples.Plugins.Adapters.Nobitex;

/// <summary>
/// Financial math contract for the Nobitex cryptocurrency exchange.
/// Implements spot crypto calculations, fees, and order validation.
/// </summary>
[SuppressMessage("Design", "CA1812:Avoid uninstantiated internal classes",
    Justification = "Instantiated by NobitexAdapter.")]
internal sealed class NobitexMarketCalculator : IMarketCalculator
{
    /// <inheritdoc/>
    public double NormalizeVolume(SymbolProperties symbolProps, double requestedVolume)
    {
        ArgumentNullException.ThrowIfNull(symbolProps);
        double step = symbolProps.MinVolume > 0 ? symbolProps.MinVolume : 0.0001;
        double lots = Math.Round(requestedVolume / step, MidpointRounding.AwayFromZero);
        return Math.Max(lots * step, step);
    }

    /// <inheritdoc/>
    public double NormalizePrice(SymbolProperties symbolProps, double requestedPrice)
    {
        ArgumentNullException.ThrowIfNull(symbolProps);
        double ts = symbolProps.TickSize > 0 ? symbolProps.TickSize : 1.0;
        return Math.Round(requestedPrice / ts, MidpointRounding.AwayFromZero) * ts;
    }

    /// <inheritdoc/>
    public double CalculateRequiredMargin(SymbolProperties symbolProps, double price, double volume, double leverage)
    {
        ArgumentNullException.ThrowIfNull(symbolProps);
        // Spot crypto requires full notional value (1x leverage)
        double lev = leverage > 0 ? leverage : 1.0;
        return volume * symbolProps.ContractSize * price / lev;
    }

    /// <inheritdoc/>
    public double CalculatePnL(SymbolProperties symbolProps, double entryPrice, double currentPrice, double volume, OrderType type)
    {
        ArgumentNullException.ThrowIfNull(symbolProps);
        double diff = type == OrderType.Buy ? currentPrice - entryPrice : entryPrice - currentPrice;
        return diff * symbolProps.ContractSize * volume;
    }

    /// <inheritdoc/>
    public double CalculateCommission(SymbolProperties symbolProps, double price, double volume)
    {
        ArgumentNullException.ThrowIfNull(symbolProps);
        double feeRate = symbolProps.TakerFeeRate > 0 ? symbolProps.TakerFeeRate : 0.002;
        double notional = price * volume * symbolProps.ContractSize;
        return notional * feeRate;
    }

    /// <inheritdoc/>
    public double CalculateSwap(SymbolProperties symbolProps, double volume, OrderType type, long openTime, long closeTime)
    {
        ArgumentNullException.ThrowIfNull(symbolProps);
        return 0.0; // No overnight swap on spot crypto
    }

    /// <inheritdoc/>
    public double CalculateFunding(SymbolProperties props, double volume, double openPrice, OrderType type, long currentTime, long lastFundingTime)
    {
        ArgumentNullException.ThrowIfNull(props);
        return 0.0; // Spot market does not charge perpetual funding
    }

    /// <inheritdoc/>
    public bool IsPendingOrderTriggered(SymbolProperties props, OrderType pendingType, double bid, double ask, double orderPrice)
    {
        ArgumentNullException.ThrowIfNull(props);
        return pendingType switch
        {
            OrderType.BuyLimit => ask <= orderPrice,
            OrderType.SellLimit => bid >= orderPrice,
            OrderType.BuyStop => ask >= orderPrice,
            OrderType.SellStop => bid <= orderPrice,
            _ => false
        };
    }

    /// <inheritdoc/>
    public double CalculateHoldingCost(SymbolProperties props, double volume, double openPrice, OrderType type, long fromTime, long toTime)
    {
        ArgumentNullException.ThrowIfNull(props);
        return 0.0;
    }

    /// <inheritdoc/>
    public double CalculateSlippage(SymbolProperties props, OrderType type, double volume, double price)
    {
        ArgumentNullException.ThrowIfNull(props);
        return 0.0;
    }
}
