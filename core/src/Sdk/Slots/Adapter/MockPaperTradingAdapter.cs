// -----------------------------------------------------------------------------
// <copyright file="MockPaperTradingAdapter.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Sdk.Slots.Adapter;

using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;
using Sdk.Shared;

/// <summary>
/// A zero-dependency, out-of-the-box simulated paper trading adapter for algorithmic development.
/// Generates realistic synthetic market ticks, tracks simulated cash balances and positions,
/// and provides local historical tick datasets for backtesting without broker API credentials.
/// </summary>
[AdapterName("MockPaperTradingAdapter")]
public sealed class MockPaperTradingAdapter : IAdapterCapability
{
    private static long _nextTicket = 100000;

    private readonly ConcurrentDictionary<string, SymbolProperties> _symbolProperties = new();
    private readonly ConcurrentDictionary<string, (double Bid, double Ask)> _currentPrices = new();
    private readonly ConcurrentDictionary<string, bool> _subscriptions = new();
    private readonly ConcurrentDictionary<long, Position> _positions = new();
    private readonly ConcurrentDictionary<long, Order> _pendingOrders = new();
    private readonly List<string> _tempFiles = [];
    private readonly Lock _lock = new();

    private double _balance = 100000.0; // $100,000 initial paper capital
    private bool _isConnected;

    /// <summary>Initialises a new instance of the <see cref="MockPaperTradingAdapter"/> class.</summary>
    public MockPaperTradingAdapter()
    {
        Calculator = new PaperTradingCalculator();

        // Seed standard instruments with variations
        RegisterSymbolGroup(65000.0, 65001.0, 1.0, 0.001, "BTC-USD", "BTC/USD", "BTCUSD", "BTC/USDT", "BTC-USDT", "BTCUSDT");
        RegisterSymbolGroup(3450.0, 3450.5, 1.0, 0.01, "ETH-USD", "ETH/USD", "ETHUSD", "ETH/USDT", "ETH-USDT", "ETHUSDT");
        RegisterSymbolGroup(1.08500, 1.08510, 100000.0, 0.01, "EUR-USD", "EUR/USD", "EURUSD", "EUR/USDT", "EUR-USDT", "EURUSDT");
        RegisterSymbolGroup(5750.0, 5750.5, 1.0, 0.1, "SPX-USD", "SPX/USD", "SPXUSD", "SPX/USDT", "SPX-USDT", "SPXUSDT");
    }

    /// <inheritdoc/>
    public string Name => "MockPaperTradingAdapter";

    /// <inheritdoc/>
    public IMarketCalculator Calculator { get; }

    /// <inheritdoc/>
    public bool IsConnected => _isConnected;

    /// <inheritdoc/>
    public bool SupportsHistoricalData => true;

    /// <inheritdoc/>
    public bool SupportsLiveData => true;

    /// <inheritdoc/>
    public bool SupportsExecution => true;

    /// <inheritdoc/>
    public event Action<string, Tick>? OnTickReceived;

    /// <inheritdoc/>
    public event Action<ExecutionReport>? OnExecutionUpdate;

    /// <inheritdoc/>
    public Task<bool> ConnectAsync(CancellationToken cancellationToken)
    {
        _isConnected = true;
        return Task.FromResult(true);
    }

    /// <inheritdoc/>
    public Task DisconnectAsync()
    {
        _isConnected = false;
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task SubscribeAsync(string symbol)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(symbol);
        _subscriptions[symbol] = true;

        if (!_currentPrices.ContainsKey(symbol))
        {
            RegisterSymbol(symbol, 100.0, 100.05, 1.0, 0.01);
        }

        // Emit initial tick
        EmitTick(symbol);
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task UnsubscribeAsync(string symbol)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(symbol);
        _subscriptions.TryRemove(symbol, out _);
        return Task.CompletedTask;
    }

    /// <summary>
    /// Emits a synthetic tick for the subscribed symbol using Brownian walk price variance.
    /// </summary>
    /// <param name="symbol">The target symbol.</param>
    [SuppressMessage("Security", "CA5394:Do not use insecure randomness", Justification = "Synthetic market tick generation in paper trading simulation")]
    public void EmitTick(string symbol)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(symbol);
        if (!_currentPrices.TryGetValue(symbol, out (double Bid, double Ask) prices))
        {
            string norm = NormalizeSymbolKey(symbol);
            var match = _currentPrices.FirstOrDefault(kvp => NormalizeSymbolKey(kvp.Key) == norm);
            if (match.Value.Bid > 0)
            {
                prices = match.Value;
                _currentPrices[symbol] = prices;
            }
            else
            {
                return;
            }
        }

        double spread = Math.Max(0.0001, prices.Ask - prices.Bid);
        double delta = (Random.Shared.NextDouble() - 0.495) * (prices.Bid * 0.0005);
        double newBid = Math.Max(0.0001, prices.Bid + delta);
        double newAsk = newBid + spread;

        _currentPrices[symbol] = (newBid, newAsk);

        var tick = new Tick(DateTime.UtcNow.Ticks, newBid, newAsk, 1.0, true);
        OnTickReceived?.Invoke(symbol, tick);
    }

    /// <inheritdoc/>
    public Task<AdapterOrderResponse> ExecuteOrderAsync(AdapterOrderRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (!_isConnected)
        {
            return Task.FromResult(new AdapterOrderResponse
            {
                Success = false,
                ErrorMessage = "Mock adapter is not connected."
            });
        }

        if (!_currentPrices.TryGetValue(request.Symbol, out (double Bid, double Ask) prices))
        {
            string norm = NormalizeSymbolKey(request.Symbol);
            var match = _currentPrices.FirstOrDefault(kvp => NormalizeSymbolKey(kvp.Key) == norm);
            if (match.Value.Bid > 0)
            {
                prices = match.Value;
                _currentPrices[request.Symbol] = prices;
            }
            else
            {
                return Task.FromResult(new AdapterOrderResponse
                {
                    Success = false,
                    ErrorMessage = $"Unknown symbol {request.Symbol}."
                });
            }
        }
        double execPrice = request.Type is OrderType.Buy or OrderType.BuyLimit or OrderType.BuyStop
            ? prices.Ask
            : prices.Bid;

        long ticket = Interlocked.Increment(ref _nextTicket);

        var position = new Position
        {
            Ticket = ticket,
            Symbol = request.Symbol,
            Type = request.Type,
            Volume = request.Volume,
            OpenPrice = execPrice,
            OpenTime = DateTime.UtcNow.Ticks,
            SL = request.StopLoss,
            TP = request.TakeProfit,
            Commission = request.Volume * 0.05,
            Profit = 0.0
        };

        _positions[ticket] = position;

        var response = new AdapterOrderResponse
        {
            Success = true,
            Ticket = ticket,
            ExecutedPrice = execPrice,
            ExecutedVolume = request.Volume
        };

        OnExecutionUpdate?.Invoke(new ExecutionReport
        {
            Ticket = ticket,
            Symbol = request.Symbol,
            Type = request.Type,
            State = ExecutionState.Filled,
            ExecutedPrice = execPrice,
            ExecutedVolume = request.Volume,
            RemainingVolume = 0.0,
            Commission = position.Commission,
            RealizedPnL = 0.0,
            Timestamp = DateTime.UtcNow.Ticks
        });

        return Task.FromResult(response);
    }

    /// <inheritdoc/>
    public Task<AdapterOrderResponse> ModifyOrderAsync(long ticket, double? sl = null, double? tp = null, double? price = null)
    {
        if (_positions.TryGetValue(ticket, out Position? pos))
        {
            var updated = pos with
            {
                SL = sl ?? pos.SL,
                TP = tp ?? pos.TP
            };
            _positions[ticket] = updated;

            return Task.FromResult(new AdapterOrderResponse
            {
                Success = true,
                Ticket = ticket,
                ExecutedPrice = pos.OpenPrice,
                ExecutedVolume = pos.Volume
            });
        }

        return Task.FromResult(new AdapterOrderResponse
        {
            Success = false,
            ErrorMessage = $"Position {ticket} not found."
        });
    }

    /// <inheritdoc/>
    public Task<AdapterOrderResponse> ClosePositionAsync(long ticket, double? volume = null)
    {
        if (_positions.TryRemove(ticket, out Position? pos))
        {
            double closePrice = pos.OpenPrice;
            if (_currentPrices.TryGetValue(pos.Symbol, out (double Bid, double Ask) prices))
            {
                closePrice = pos.Type is OrderType.Buy ? prices.Bid : prices.Ask;
            }

            double pnl = pos.Type is OrderType.Buy
                ? (closePrice - pos.OpenPrice) * pos.Volume
                : (pos.OpenPrice - closePrice) * pos.Volume;

            lock (_lock)
            {
                _balance += pnl - pos.Commission;
            }

            OnExecutionUpdate?.Invoke(new ExecutionReport
            {
                Ticket = ticket,
                Symbol = pos.Symbol,
                Type = pos.Type,
                State = ExecutionState.Filled,
                ExecutedPrice = closePrice,
                ExecutedVolume = pos.Volume,
                RemainingVolume = 0.0,
                Commission = pos.Commission,
                RealizedPnL = pnl,
                Timestamp = DateTime.UtcNow.Ticks
            });

            return Task.FromResult(new AdapterOrderResponse
            {
                Success = true,
                Ticket = ticket,
                ExecutedPrice = closePrice,
                ExecutedVolume = pos.Volume
            });
        }

        return Task.FromResult(new AdapterOrderResponse
        {
            Success = false,
            ErrorMessage = $"Position {ticket} not found."
        });
    }

    /// <inheritdoc/>
    public Task<AdapterOrderResponse> CancelAsync(long ticket)
    {
        if (_pendingOrders.TryRemove(ticket, out Order? order))
        {
            return Task.FromResult(new AdapterOrderResponse
            {
                Success = true,
                Ticket = ticket,
                ExecutedVolume = order.Volume
            });
        }

        return Task.FromResult(new AdapterOrderResponse
        {
            Success = false,
            ErrorMessage = $"Pending order {ticket} not found."
        });
    }

    /// <inheritdoc/>
    public Task<(double Balance, double Equity)> GetAccountInfoAsync(CancellationToken cancellationToken = default)
    {
        double unrealized = 0.0;
        foreach (Position pos in _positions.Values)
        {
            if (_currentPrices.TryGetValue(pos.Symbol, out (double Bid, double Ask) prices))
            {
                double currentPrice = pos.Type is OrderType.Buy ? prices.Bid : prices.Ask;
                unrealized += pos.Type is OrderType.Buy
                    ? (currentPrice - pos.OpenPrice) * pos.Volume
                    : (pos.OpenPrice - currentPrice) * pos.Volume;
            }
        }

        return Task.FromResult((_balance, _balance + unrealized));
    }

    /// <inheritdoc/>
    public Task<IReadOnlyList<Position>> GetActivePositionsAsync()
    {
        IReadOnlyList<Position> list = [.. _positions.Values];
        return Task.FromResult(list);
    }

    /// <inheritdoc/>
    public Task<IReadOnlyList<Order>> GetPendingOrdersAsync()
    {
        IReadOnlyList<Order> list = [.. _pendingOrders.Values];
        return Task.FromResult(list);
    }

    /// <inheritdoc/>
    public Task<SymbolProperties?> GetSymbolPropertiesAsync(string symbol, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return Task.FromResult<SymbolProperties?>(null);
        }

        if (_symbolProperties.TryGetValue(symbol, out SymbolProperties? props))
        {
            return Task.FromResult<SymbolProperties?>(props);
        }

        string norm = NormalizeSymbolKey(symbol);
        foreach (var kvp in _symbolProperties)
        {
            if (NormalizeSymbolKey(kvp.Key) == norm)
            {
                _symbolProperties[symbol] = kvp.Value;
                return Task.FromResult<SymbolProperties?>(kvp.Value);
            }
        }

        RegisterSymbol(symbol, 100.0, 100.05, 1.0, 0.01);
        return Task.FromResult<SymbolProperties?>(_symbolProperties[symbol]);
    }

    /// <inheritdoc/>
    public TimeFrame[]? GetSupportedTimeframes(string symbol) =>
    [
        TimeFrame.M1, TimeFrame.M5, TimeFrame.M15, TimeFrame.H1, TimeFrame.H4, TimeFrame.D1
    ];

    /// <inheritdoc/>
    [SuppressMessage("Security", "CA5394:Do not use insecure randomness", Justification = "Synthetic historical tick generation for offline backtests")]
    public Task<HistoricalDataResponse> FetchHistoryToBinaryFileAsync(HistoricalDataRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        string tempPath = Path.Combine(Path.GetTempPath(), $"razor_ticks_{Guid.NewGuid():N}.bin");

        double basePrice = _currentPrices.TryGetValue(request.Symbol, out (double Bid, double Ask) prices)
            ? prices.Bid
            : 100.0;

        const int recordCount = 500;
        long startTicks = request.StartTime.Ticks > 0 ? request.StartTime.Ticks : DateTime.UtcNow.AddHours(-1).Ticks;

        using (FileStream fs = new(tempPath, FileMode.Create, FileAccess.Write, FileShare.None))
        using (BinaryWriter writer = new(fs))
        {
            writer.Write(0x53524843u);
            writer.Write(1);

            double currentBid = basePrice;
            for (int i = 0; i < recordCount; i++)
            {
                currentBid += (Random.Shared.NextDouble() - 0.495) * (currentBid * 0.0002);
                double currentAsk = currentBid + 0.5;
                long tickTime = startTicks + (i * TimeSpan.TicksPerSecond);

                var tick = new Tick(tickTime, currentBid, currentAsk, 1.0, true);

                // Write raw sequential Tick bytes
                writer.Write(tick.Time);
                writer.Write(tick.Bid);
                writer.Write(tick.Ask);
                writer.Write(tick.Volume);
                writer.Write(tick.IsSynthetic);
            }
        }

        lock (_lock)
        {
            _tempFiles.Add(tempPath);
        }

        return Task.FromResult(new HistoricalDataResponse
        {
            Symbol = request.Symbol,
            Success = true,
            BinaryFilePath = tempPath,
            TotalRecords = recordCount
        });
    }

    /// <inheritdoc/>
    public Task DeleteHistoryFileAsync(string filePath)
    {
        if (File.Exists(filePath))
        {
            try { File.Delete(filePath); } catch { /* ignore */ }
        }
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task NotifyFileSafeToDeleteAsync(string filePath) => DeleteHistoryFileAsync(filePath);

    private static string NormalizeSymbolKey(string symbol) =>
        symbol.Replace("/", string.Empty, StringComparison.Ordinal)
              .Replace("-", string.Empty, StringComparison.Ordinal)
              .Replace("_", string.Empty, StringComparison.Ordinal)
              .Trim()
              .ToUpperInvariant();

    private void RegisterSymbolGroup(double bid, double ask, double contractSize, double minVolume, params string[] symbols)
    {
        foreach (string sym in symbols)
        {
            RegisterSymbol(sym, bid, ask, contractSize, minVolume);
        }
    }


    private void RegisterSymbol(string symbol, double bid, double ask, double contractSize, double minVolume)
    {
        _currentPrices[symbol] = (bid, ask);
        _symbolProperties[symbol] = new SymbolProperties
        {
            AssetClass = AssetClass.CryptoSpot,
            MarginMode = MarginMode.Cross,
            PendingTrigger = PendingOrderTriggerMode.UseMidPrice,
            MarginCurrency = "USD",
            ContractSize = contractSize,
            TickSize = 0.01,
            TickValue = 0.01,
            MinVolume = minVolume,
            MaxLeverage = 100.0,
            SwapLong = -0.01,
            SwapShort = 0.01,
            SwapRolloverHourUtc = 0,
            TripleSwapDayMultiplier = 3.0,
            FundingRate = 0.0001,
            InitialMarginRate = 0.1,
            MaintenanceMarginRate = 0.05,
            MakerFeeRate = 0.0002,
            TakerFeeRate = 0.0005
        };
    }

    private sealed class PaperTradingCalculator : DefaultMarketCalculator
    {
    }
}
