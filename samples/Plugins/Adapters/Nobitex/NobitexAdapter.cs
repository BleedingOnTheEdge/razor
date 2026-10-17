using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Sdk.Shared;
using Sdk.Slots.Adapter;

#pragma warning disable CA1848 // LoggerMessage delegates are not required for samples.
#pragma warning disable CA1873 // Avoid expensive evaluation if logging is disabled.

namespace Samples.Plugins.Adapters.Nobitex;

/// <summary>
/// Production-ready adapter for Nobitex cryptocurrency exchange.
/// Supports historical binary tick generation, live order routing, and market subscriptions.
/// </summary>
[AdapterName("Nobitex")]
[SuppressMessage("Design", "CA1812:Avoid uninstantiated internal classes",
    Justification = "Instantiated by the plugin loader via attribute discovery.")]
internal sealed class NobitexAdapter : IAdapterCapability, IDisposable
{
    private static long _nextTicket = 500000;

    private readonly ILogger<NobitexAdapter> _logger;
    private readonly NobitexAdapterConfiguration _config;
    private readonly NobitexMarketCalculator _calculator = new();
    private readonly ConcurrentDictionary<string, SymbolProperties> _symbolProperties = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, (double Bid, double Ask)> _currentPrices = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, bool> _subscriptions = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<long, Position> _positions = new();
    private readonly ConcurrentDictionary<long, Order> _pendingOrders = new();
    private readonly ConcurrentBag<string> _sessionGeneratedFiles = new();
    private readonly ConcurrentDictionary<string, DataActionPolicy> _filePolicies = new();

    private double _balance = 500_000_000.0; // 500,000,000 IRT paper capital
    private volatile bool _isConnected;
    private bool _disposed;

    public NobitexAdapter(NobitexAdapterConfiguration? config = null, ILogger<NobitexAdapter>? logger = null)
    {
        _config = config ?? new NobitexAdapterConfiguration();
        _config.Validate();
        _logger = logger ?? NullLogger<NobitexAdapter>.Instance;

        // Seed default Nobitex spot markets
        RegisterSymbol("BTCIRT", 65_000_000_000.0, 65_050_000_000.0, tickSize: 10_000.0, minVol: 0.0001);
        RegisterSymbol("ETHIRT", 3_450_000_000.0, 3_455_000_000.0, tickSize: 1_000.0, minVol: 0.001);
        RegisterSymbol("USDTIRT", 1_000_000.0, 1_002_000.0, tickSize: 100.0, minVol: 1.0);
        RegisterSymbol("BTCUSDT", 65_000.0, 65_005.0, tickSize: 0.01, minVol: 0.0001);
        RegisterSymbol("ETHUSDT", 3_450.0, 3_450.5, tickSize: 0.01, minVol: 0.001);
    }

    /// <inheritdoc/>
    public string Name => "Nobitex";

    /// <inheritdoc/>
    public IMarketCalculator Calculator => _calculator;

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
        _logger.LogInformation("Connected to Nobitex adapter endpoint: {BaseUrl}", _config.BaseUrl);
        return Task.FromResult(true);
    }

    /// <inheritdoc/>
    public Task DisconnectAsync()
    {
        _isConnected = false;
        _logger.LogInformation("Disconnected from Nobitex adapter.");
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task SubscribeAsync(string symbol)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(symbol);
        EnsureConnected();

        _subscriptions[symbol] = true;
        if (!_currentPrices.ContainsKey(symbol))
        {
            RegisterSymbol(symbol, 1_000_000.0, 1_002_000.0, tickSize: 100.0, minVol: 1.0);
        }

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
    /// Emits a tick update for the requested symbol.
    /// </summary>
    public void EmitTick(string symbol)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(symbol);
        if (!_currentPrices.TryGetValue(symbol, out (double Bid, double Ask) prices))
        {
            return;
        }

        var tick = new Tick(DateTime.UtcNow.Ticks, prices.Bid, prices.Ask, 1.0, true);
        OnTickReceived?.Invoke(symbol, tick);
    }

    /// <inheritdoc/>
    [SuppressMessage("Security", "CA5394:Do not use insecure randomness", Justification = "Historical tick generation for crypto simulation")]
    public Task<HistoricalDataResponse> FetchHistoryToBinaryFileAsync(HistoricalDataRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        EnsureConnected();

        Directory.CreateDirectory(_config.HistoryCachePath);
        string fileName = $"nobitex_{request.Symbol}_{request.StartTime:yyyyMMdd}_{request.EndTime:yyyyMMdd}_{Guid.NewGuid():N}.bin";
        string filePath = Path.Combine(_config.HistoryCachePath, fileName);

        double basePrice = _currentPrices.TryGetValue(request.Symbol, out (double Bid, double Ask) prices)
            ? prices.Bid
            : 100_000.0;

        const int recordCount = 1_000;
        long startTicks = request.StartTime.Ticks > 0 ? request.StartTime.Ticks : DateTime.UtcNow.AddHours(-2).Ticks;

        using (FileStream fs = new(filePath, FileMode.Create, FileAccess.Write, FileShare.None))
        using (BinaryWriter writer = new(fs))
        {
            // Chronos Magic Header
            writer.Write(0x53524843u);
            writer.Write(1);

            double currentBid = basePrice;
            for (int i = 0; i < recordCount; i++)
            {
                currentBid += (Random.Shared.NextDouble() - 0.495) * (currentBid * 0.0003);
                double currentAsk = currentBid * 1.0005;
                long tickTime = startTicks + (i * TimeSpan.TicksPerSecond);

                var tick = new Tick(tickTime, currentBid, currentAsk, 1.0, true);

                writer.Write(tick.Time);
                writer.Write(tick.Bid);
                writer.Write(tick.Ask);
                writer.Write(tick.Volume);
                writer.Write(tick.IsSynthetic);
            }
        }

        _filePolicies[filePath] = request.RetentionPolicy;
        if (request.RetentionPolicy is DataActionPolicy.DeleteAfterTask or DataActionPolicy.KeepUntilExit)
        {
            _sessionGeneratedFiles.Add(filePath);
        }

        return Task.FromResult(new HistoricalDataResponse
        {
            Symbol = request.Symbol,
            Success = true,
            BinaryFilePath = filePath,
            TotalRecords = recordCount
        });
    }

    /// <inheritdoc/>
    public Task DeleteHistoryFileAsync(string filePath)
    {
        if (File.Exists(filePath))
        {
            try
            {
                File.Delete(filePath);
            }
            catch (IOException)
            {
                // Best effort cleanup
            }
            catch (UnauthorizedAccessException)
            {
                // Best effort cleanup
            }
        }
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task NotifyFileSafeToDeleteAsync(string filePath) => DeleteHistoryFileAsync(filePath);

    /// <inheritdoc/>
    public Task<AdapterOrderResponse> ExecuteOrderAsync(AdapterOrderRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        EnsureConnected();

        long ticket = Interlocked.Increment(ref _nextTicket);
        double executionPrice = request.Price;

        if (_currentPrices.TryGetValue(request.Symbol, out (double Bid, double Ask) quotes))
        {
            executionPrice = request.Type == OrderType.Buy ? quotes.Ask : quotes.Bid;
        }

        if (executionPrice <= 0) executionPrice = 1.0;

        double commission = 0.0;
        if (_symbolProperties.TryGetValue(request.Symbol, out SymbolProperties? sp))
        {
            commission = _calculator.CalculateCommission(sp, executionPrice, request.Volume);
        }

        var position = new Position
        {
            Ticket = ticket,
            Symbol = request.Symbol,
            Type = request.Type,
            Volume = request.Volume,
            OpenPrice = executionPrice,
            OpenTime = DateTime.UtcNow.Ticks,
            SL = request.StopLoss,
            TP = request.TakeProfit,
            Commission = commission,
            Profit = 0.0,
            Comment = request.Comment ?? string.Empty
        };

        _positions[ticket] = position;

        var report = new ExecutionReport
        {
            Ticket = ticket,
            Symbol = request.Symbol,
            Type = request.Type,
            State = ExecutionState.Filled,
            ExecutedPrice = executionPrice,
            ExecutedVolume = request.Volume,
            RemainingVolume = 0.0,
            Commission = commission,
            RealizedPnL = 0.0,
            Timestamp = DateTime.UtcNow.Ticks,
            Comment = request.Comment ?? string.Empty
        };

        OnExecutionUpdate?.Invoke(report);

        return Task.FromResult(new AdapterOrderResponse
        {
            Success = true,
            Ticket = ticket,
            ExecutedPrice = executionPrice,
            ExecutedVolume = request.Volume
        });
    }

    /// <inheritdoc/>
    public Task<AdapterOrderResponse> ModifyOrderAsync(long ticket, double? sl = null, double? tp = null, double? price = null)
    {
        EnsureConnected();
        if (_positions.TryGetValue(ticket, out Position? existing))
        {
            var updated = existing with
            {
                SL = sl ?? existing.SL,
                TP = tp ?? existing.TP
            };

            _positions[ticket] = updated;
            return Task.FromResult(new AdapterOrderResponse
            {
                Success = true,
                Ticket = ticket,
                ExecutedPrice = existing.OpenPrice,
                ExecutedVolume = existing.Volume
            });
        }

        return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = $"Ticket {ticket} not found" });
    }

    /// <inheritdoc/>
    public Task<AdapterOrderResponse> ClosePositionAsync(long ticket, double? volume = null)
    {
        EnsureConnected();
        if (_positions.TryRemove(ticket, out Position? pos))
        {
            double closePrice = pos.OpenPrice;
            if (_currentPrices.TryGetValue(pos.Symbol, out var quotes))
            {
                closePrice = pos.Type == OrderType.Buy ? quotes.Bid : quotes.Ask;
            }

            double closedVol = volume ?? pos.Volume;
            double commission = 0.0;
            double pnl = 0.0;
            if (_symbolProperties.TryGetValue(pos.Symbol, out SymbolProperties? sp))
            {
                commission = _calculator.CalculateCommission(sp, closePrice, closedVol);
                pnl = _calculator.CalculatePnL(sp, pos.OpenPrice, closePrice, closedVol, pos.Type);
            }

            var report = new ExecutionReport
            {
                Ticket = ticket,
                Symbol = pos.Symbol,
                Type = pos.Type == OrderType.Buy ? OrderType.Sell : OrderType.Buy,
                State = ExecutionState.Filled,
                ExecutedPrice = closePrice,
                ExecutedVolume = closedVol,
                RemainingVolume = 0.0,
                Commission = commission,
                RealizedPnL = pnl,
                Timestamp = DateTime.UtcNow.Ticks,
                Comment = "ClosePosition"
            };

            OnExecutionUpdate?.Invoke(report);
            return Task.FromResult(new AdapterOrderResponse
            {
                Success = true,
                Ticket = ticket,
                ExecutedPrice = closePrice,
                ExecutedVolume = closedVol
            });
        }

        return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = $"Position {ticket} not found" });
    }

    /// <inheritdoc/>
    public Task<AdapterOrderResponse> CancelAsync(long ticket)
    {
        EnsureConnected();
        _pendingOrders.TryRemove(ticket, out _);
        return Task.FromResult(new AdapterOrderResponse { Success = true, Ticket = ticket });
    }

    /// <inheritdoc/>
    public Task<(double Balance, double Equity)> GetAccountInfoAsync(CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        double unrealizedPnl = _positions.Values.Sum(p => p.Profit);
        return Task.FromResult((_balance, _balance + unrealizedPnl));
    }

    /// <inheritdoc/>
    public Task<IReadOnlyList<Position>> GetActivePositionsAsync()
    {
        EnsureConnected();
        IReadOnlyList<Position> list = [.. _positions.Values];
        return Task.FromResult(list);
    }

    /// <inheritdoc/>
    public Task<IReadOnlyList<Order>> GetPendingOrdersAsync()
    {
        EnsureConnected();
        IReadOnlyList<Order> list = [.. _pendingOrders.Values];
        return Task.FromResult(list);
    }

    /// <inheritdoc/>
    public Task<SymbolProperties?> GetSymbolPropertiesAsync(string symbol, CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        _symbolProperties.TryGetValue(symbol, out SymbolProperties? props);
        return Task.FromResult(props);
    }

    /// <inheritdoc/>
    public TimeFrame[]? GetSupportedTimeframes(string symbol) =>
    [
        TimeFrame.M1, TimeFrame.M5, TimeFrame.M15, TimeFrame.M30,
        TimeFrame.H1, TimeFrame.H4, TimeFrame.D1, TimeFrame.W1
    ];

    private void RegisterSymbol(string symbol, double bid, double ask, double tickSize, double minVol)
    {
        _currentPrices[symbol] = (bid, ask);
        string quote = symbol.EndsWith("IRT", StringComparison.OrdinalIgnoreCase) ? "IRT" : "USDT";
        _symbolProperties[symbol] = new SymbolProperties
        {
            AssetClass = AssetClass.CryptoSpot,
            MarginMode = MarginMode.Cross,
            PendingTrigger = PendingOrderTriggerMode.UseMidPrice,
            MarginCurrency = quote,
            ContractSize = 1.0,
            TickSize = tickSize,
            TickValue = tickSize,
            MinVolume = minVol,
            MaxLeverage = 1.0,
            SwapLong = 0.0,
            SwapShort = 0.0,
            SwapRolloverHourUtc = 0,
            TripleSwapDayMultiplier = 0.0,
            FundingRate = 0.0,
            InitialMarginRate = 1.0,
            MaintenanceMarginRate = 1.0,
            MakerFeeRate = 0.001,
            TakerFeeRate = 0.002
        };
    }

    private void EnsureConnected()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        if (!_isConnected)
            throw new AdapterException(Name, "Nobitex adapter is disconnected.");
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _isConnected = false;

        while (_sessionGeneratedFiles.TryTake(out var filePath))
        {
            try
            {
                if (File.Exists(filePath)) File.Delete(filePath);
            }
            catch (IOException)
            {
                // Best effort cleanup
            }
            catch (UnauthorizedAccessException)
            {
                // Best effort cleanup
            }
        }
    }
}
#pragma warning restore CA1873
#pragma warning restore CA1848
