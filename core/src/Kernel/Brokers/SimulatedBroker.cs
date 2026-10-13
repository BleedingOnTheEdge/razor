// -----------------------------------------------------------------------------
// <copyright file="SimulatedBroker.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

#pragma warning disable CA1031

using Kernel.Clock;
using Kernel.Events;
using Kernel.Hooks;
using Kernel.Messaging;
using Sdk.Hooks;
using Sdk.Shared;
using Microsoft.Extensions.Logging;

namespace Kernel.Brokers;
#pragma warning disable CS1591 // Missing XML comment for publicly visible type or member

/// <summary>
/// Deterministic simulated broker for backtesting and optimization.
/// Uses the adapter's <see cref="IMarketCalculator"/> for all financial math,
/// including slippage, commission, and cross‑currency conversion.
/// </summary>
public sealed partial class SimulatedBroker : IBroker
{
    private readonly IMarketCalculator _calculator;
    private readonly Dictionary<string, SymbolProperties> _symbolSpecs;
    private readonly double _leverage;
    private readonly long _latencyTicks;
    private readonly int _maxOpenPositions;
    private readonly double _stopOutLevel;
    private readonly IMessageBus? _messageBus;
    private readonly TickClock _clock;
    private readonly IBacktestHooks? _hooks;
    private readonly ICurrencyConverter? _currencyConverter;
    private readonly string? _accountCurrency;
    private readonly ILogger<SimulatedBroker>? _logger;
    private readonly Lock _stateLock = new();
    private static long _eventCounter;

    private long _ticketCounter = 1;
    private double _balance;
    private double _equity;
    private double _marginUsed;
    private readonly List<MutablePosition> _positions = new(100);
    private readonly List<MutablePosition> _history = new(1000);
    private readonly List<Order> _pendingOrders = new(50);
    private readonly Dictionary<string, (double Bid, double Ask)> _marketPrices = new();
    private readonly Queue<QueuedMarketOrder> _executionQueue = new(10);

    private long _nextHoldingCostTime;
    private double _peakEquity;
    private double _peakDailyEquity;

    public double Balance => _balance;
    public double Equity => _equity;
    public double MarginUsed => _marginUsed;
    public double FreeMargin => _equity - _marginUsed;
    public double MaxDrawdown { get; private set; }
    public double MaxDailyDrawdown { get; private set; }
    public bool IsWarmup { get; internal set; }

    private static readonly Action<ILogger, string, Exception?> _logConversionFailed =
    LoggerMessage.Define<string>(LogLevel.Warning, 1000, "Failed to get conversion rate for {Symbol}, using 1.0");

    public SimulatedBroker(
        IMarketCalculator calculator,
        Dictionary<string, SymbolProperties> symbolSpecs,
        double initialBalance,
        double leverage,
        TickClock clock,
        long latencyTicks = 0,
        int maxOpenPositions = 100,
        double stopOutLevel = 0.50,
        IMessageBus? messageBus = null,
        IBacktestHooks? hooks = null,
        ICurrencyConverter? currencyConverter = null,
        string? accountCurrency = null,
        ILogger<SimulatedBroker>? logger = null)
    {
        _calculator = calculator ?? throw new ArgumentNullException(nameof(calculator));
        _symbolSpecs = symbolSpecs ?? throw new ArgumentNullException(nameof(symbolSpecs));
        _balance = initialBalance;
        _equity = initialBalance;
        _peakEquity = initialBalance;
        _peakDailyEquity = initialBalance;
        _leverage = leverage;
        _latencyTicks = Math.Max(0, latencyTicks);
        _maxOpenPositions = maxOpenPositions;
        _stopOutLevel = stopOutLevel;
        _messageBus = messageBus;
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _hooks = hooks;
        _currencyConverter = currencyConverter;
        _accountCurrency = accountCurrency;
        _logger = logger;
    }

    public Task InitializeLiveStateAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    public Task SyncStateAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public Task OnTickAsync(string symbol, Tick tick)
    {
        if (tick.Time < 0 || tick.Time > DateTime.MaxValue.Ticks)
        {
            return Task.CompletedTask;
        }

        _clock.SetTickTime(tick.Time);
        lock (_stateLock)
        {
            _marketPrices[symbol] = (tick.Bid, tick.Ask);
            ProcessHoldingCosts();

            if (_executionQueue.Count > 0)
            {
                ProcessExecutionQueue();
            }

            if (_pendingOrders.Count > 0)
            {
                CheckPendingOrders(symbol, tick.Bid, tick.Ask);
            }

            if (_positions.Count > 0)
            {
                UpdatePositions(symbol, tick.Bid, tick.Ask);
            }
            else
            {
                _marginUsed = 0;
                _equity = _balance;
            }

            InvokeEquityUpdatedHook();
        }
        return Task.CompletedTask;
    }

    // ── Order entry ──────────────────────────────────────────────────

    public Task<AdapterOrderResponse> ExecuteMarketOrderAsync(
        string symbol, OrderType type, double volume, double sl = 0, double tp = 0, string comment = "")
    {
        var request = new AdapterOrderRequest
        {
            Symbol = symbol,
            Type = type,
            Volume = volume,
            StopLoss = sl,
            TakeProfit = tp,
            Comment = comment
        };

        if (!InvokeOrderValidationFilter(request, out var filteredRequest, out var rejectionReason))
        {
            return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = rejectionReason ?? "Order rejected by filter" });
        }

        if (!InvokeOrderBeforeExecuteFilter(filteredRequest, out filteredRequest, out rejectionReason))
        {
            return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = rejectionReason ?? "Order rejected by filter" });
        }

        if (IsWarmup)
        {
            return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = "Orders not allowed during warmup." });
        }

        lock (_stateLock)
        {
            if (_positions.Count >= _maxOpenPositions)
            {
                return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = "Max open positions reached" });
            }

            AdapterOrderResponse response;
            if (_latencyTicks > 0 && _clock.GetTimestamp() > 0)
            {
                _executionQueue.Enqueue(new QueuedMarketOrder
                {
                    ExecutionTime = _clock.GetTimestamp() + _latencyTicks,
                    Symbol = symbol,
                    Type = type,
                    Volume = volume,
                    SL = sl,
                    TP = tp,
                    Comment = comment
                });
                response = new AdapterOrderResponse { Success = true, Ticket = _ticketCounter++ };
            }
            else
            {
                response = ExecuteInstantly(symbol, type, volume, sl, tp, comment);
            }

            InvokeOrderAfterExecuteHook(filteredRequest, response);
            return Task.FromResult(response);
        }
    }

    public Task<AdapterOrderResponse> PlacePendingOrderAsync(
        string symbol, OrderType type, double volume, double price, double sl, double tp, string comment = "")
    {
        var request = new AdapterOrderRequest
        {
            Symbol = symbol,
            Type = type,
            Volume = volume,
            Price = price,
            StopLoss = sl,
            TakeProfit = tp,
            Comment = comment
        };

        if (!InvokeOrderValidationFilter(request, out var filteredRequest, out var rejectionReason))
        {
            return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = rejectionReason ?? "Order rejected by filter" });
        }

        if (!InvokeOrderBeforeExecuteFilter(filteredRequest, out filteredRequest, out rejectionReason))
        {
            return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = rejectionReason ?? "Order rejected by filter" });
        }

        if (IsWarmup)
        {
            return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = "Orders not allowed during warmup." });
        }

        lock (_stateLock)
        {
            if (!_symbolSpecs.TryGetValue(symbol, out var spec))
            {
                return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = "Symbol properties not available" });
            }

            double requiredMargin = _calculator.CalculateRequiredMargin(spec, price, volume, _leverage);
            if (FreeMargin < requiredMargin - 1e-8)
            {
                return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = "Insufficient margin" });
            }

            _marginUsed += requiredMargin;
            var ticket = _ticketCounter++;
            _pendingOrders.Add(new Order
            {
                Ticket = ticket,
                Symbol = symbol,
                Type = type,
                Volume = volume,
                Price = price,
                SL = sl,
                TP = tp,
                Comment = comment
            });

            var response = new AdapterOrderResponse { Success = true, Ticket = ticket };
            InvokeOrderAfterExecuteHook(filteredRequest, response);
            return Task.FromResult(response);
        }
    }

    public Task<AdapterOrderResponse> ModifyOrderAsync(long ticket, double? sl = null, double? tp = null, double? price = null)
    {
        if (IsWarmup)
        {
            return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = "Orders not allowed during warmup." });
        }

        lock (_stateLock)
        {
            for (int i = 0; i < _positions.Count; i++)
            {
                if (_positions[i].Ticket == ticket)
                {
                    if (price.HasValue)
                    {
                        return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = "Cannot modify price of an open position" });
                    }

                    if (sl.HasValue)
                    {
                        _positions[i].SL = sl.Value;
                    }

                    if (tp.HasValue)
                    {
                        _positions[i].TP = tp.Value;
                    }

                    return Task.FromResult(new AdapterOrderResponse { Success = true });
                }
            }

            for (int i = 0; i < _pendingOrders.Count; i++)
            {
                if (_pendingOrders[i].Ticket == ticket)
                {
                    var o = _pendingOrders[i];
                    if (price.HasValue)
                    {
                        o = o with { Price = price.Value };
                    }

                    if (sl.HasValue)
                    {
                        o = o with { SL = sl.Value };
                    }

                    if (tp.HasValue)
                    {
                        o = o with { TP = tp.Value };
                    }

                    _pendingOrders[i] = o;
                    return Task.FromResult(new AdapterOrderResponse { Success = true });
                }
            }
        }
        return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = "Ticket not found" });
    }

    public Task<AdapterOrderResponse> CancelOrderAsync(long ticket)
    {
        lock (_stateLock)
        {
            var order = _pendingOrders.FirstOrDefault(o => o.Ticket == ticket);
            if (order != null && _symbolSpecs.TryGetValue(order.Symbol, out var spec))
            {
                double margin = _calculator.CalculateRequiredMargin(spec, order.Price, order.Volume, _leverage);
                _marginUsed = Math.Max(0, _marginUsed - margin);
            }

            int removed = _pendingOrders.RemoveAll(o => o.Ticket == ticket);
            return Task.FromResult(new AdapterOrderResponse
            {
                Success = removed > 0,
                ErrorMessage = removed > 0 ? string.Empty : "Ticket not found among pending orders"
            });
        }
    }

    public Task<AdapterOrderResponse> ClosePositionAsync(long ticket, double volume = 0)
    {
        lock (_stateLock)
        {
            for (int i = 0; i < _positions.Count; i++)
            {
                if (_positions[i].Ticket == ticket)
                {
                    if (!_marketPrices.TryGetValue(_positions[i].Symbol, out _))
                    {
                        return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = "Price not available" });
                    }

                    var px = _marketPrices[_positions[i].Symbol];
                    double closePx = _positions[i].Type == OrderType.Buy ? px.Bid : px.Ask;
                    double closeVol = volume > 0 ? volume : _positions[i].Volume;
                    ClosePositionInternal(i, closePx, _clock.GetTimestamp(), closeVol);
                    return Task.FromResult(new AdapterOrderResponse { Success = true });
                }
            }
        }
        return Task.FromResult(new AdapterOrderResponse { Success = false, ErrorMessage = "Ticket not found" });
    }

    public Task<IReadOnlyList<AdapterOrderResponse>> CloseAllAsync(string symbol, OrderType? type = null)
    {
        if (IsWarmup)
        {
            return Task.FromResult<IReadOnlyList<AdapterOrderResponse>>(
                new List<AdapterOrderResponse> { new() { Success = false, ErrorMessage = "Orders not allowed during warmup." } });
        }

        var responses = new List<AdapterOrderResponse>();
        lock (_stateLock)
        {
            for (int i = _pendingOrders.Count - 1; i >= 0; i--)
            {
                if (_pendingOrders[i].Symbol == symbol)
                {
                    var o = _pendingOrders[i];
                    if (_symbolSpecs.TryGetValue(o.Symbol, out var spec))
                    {
                        double margin = _calculator.CalculateRequiredMargin(spec, o.Price, o.Volume, _leverage);
                        _marginUsed = Math.Max(0, _marginUsed - margin);
                    }
                    _pendingOrders.RemoveAt(i);
                }
            }

            if (!_marketPrices.TryGetValue(symbol, out var px))
            {
                return Task.FromResult<IReadOnlyList<AdapterOrderResponse>>(responses);
            }

            for (int i = _positions.Count - 1; i >= 0; i--)
            {
                if (_positions[i].Symbol == symbol && (type == null || _positions[i].Type == type))
                {
                    double closePx = _positions[i].Type == OrderType.Buy ? px.Bid : px.Ask;
                    ClosePositionInternal(i, closePx, _clock.GetTimestamp(), _positions[i].Volume);
                    responses.Add(new AdapterOrderResponse { Success = true });
                }
            }
        }
        return Task.FromResult<IReadOnlyList<AdapterOrderResponse>>(responses);
    }

    public Task<bool> HasOpenPositionAsync(string symbol, OrderType? type = null, CancellationToken cancellationToken = default)
    {
        lock (_stateLock)
        {
            return Task.FromResult(_positions.Any(p => p.Symbol == symbol && (type == null || p.Type == type)));
        }
    }

    public Task<IReadOnlyList<Position>> GetOpenPositionsAsync(string? symbol = null, CancellationToken cancellationToken = default)
    {
        lock (_stateLock)
        {
            List<MutablePosition> source = string.IsNullOrEmpty(symbol) ? _positions : _positions.FindAll(p => p.Symbol == symbol);
            return Task.FromResult<IReadOnlyList<Position>>([.. source.Select(ToImmutable)]);
        }
    }

    public Task<IReadOnlyList<Position>> GetHistoryAsync(CancellationToken cancellationToken = default)
    {
        lock (_stateLock)
        {
            return Task.FromResult<IReadOnlyList<Position>>([.. _history.Select(ToImmutable)]);
        }
    }

    public Task<IReadOnlyList<Order>> GetPendingOrdersAsync(CancellationToken cancellationToken = default)
    {
        lock (_stateLock)
        {
            return Task.FromResult<IReadOnlyList<Order>>(_pendingOrders.ToList());
        }
    }


}
