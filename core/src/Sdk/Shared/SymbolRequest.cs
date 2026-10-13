using System.Collections.Immutable;

namespace Sdk.Shared;

/// <summary>
/// A trading symbol and the timeframes the strategy consumes for it.
/// </summary>
/// <remarks>
/// Equality is the compiler‑generated record equality: field by field, with the
/// <see cref="ImmutableArray{T}"/> of timeframes compared through its own
/// (storage‑based) equality. Symbol uniqueness across a specification is enforced
/// separately and case‑insensitively by <see cref="StrategySpecification.Validate"/>.
/// </remarks>
public sealed record SymbolRequest
{
    /// <summary>Broker symbol (e.g., "EURUSD", "BTCUSDT").</summary>
    public string Symbol { get; init; } = string.Empty;

    /// <summary>Timeframes the strategy consumes. Can include <see cref="TimeFrame.Tick"/> for raw tick feed.</summary>
    public ImmutableArray<TimeFrame> TimeFrames { get; init; } = [];

    /// <summary>Creates a new symbol request.</summary>
    public SymbolRequest(string symbol, ImmutableArray<TimeFrame> timeFrames)
    {
        Symbol = symbol;
        TimeFrames = timeFrames;
    }

    /// <summary>Parameterless constructor for record initialisation.</summary>
    public SymbolRequest()
    {
    }
}
