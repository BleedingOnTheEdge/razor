// -----------------------------------------------------------------------------
// <copyright file="LiveBroker.Orders.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

using System.Diagnostics;
using Kernel.Events;
using Kernel.Hooks;
using Sdk.Hooks;
using Sdk.Shared;
using Sdk.Slots.Adapter;

namespace Kernel.Brokers;

public sealed partial class LiveBroker
{
    /// <inheritdoc/>
    public async Task<AdapterOrderResponse> ExecuteMarketOrderAsync(
        string symbol, OrderType type, double volume, double sl = 0, double tp = 0, string comment = "")
    {
        var request = new AdapterOrderRequest
        {
            Symbol = symbol,
            Type = type,
            Volume = volume,
            StopLoss = sl,
            TakeProfit = tp,
            Comment = comment,
            MagicNumber = _magicNumber
        };

        if (!InvokeOrderValidationFilter(request, out var filtered, out var rejectReason))
        {
            return new AdapterOrderResponse { Success = false, ErrorMessage = rejectReason ?? "Rejected by filter" };
        }

        if (!InvokeOrderBeforeSendFilter(filtered, out filtered, out rejectReason))
        {
            return new AdapterOrderResponse { Success = false, ErrorMessage = rejectReason ?? "Rejected by filter" };
        }

        string key = NextOrderKey(symbol);
        if (!TryAcquireInFlight(key))
        {
            return new AdapterOrderResponse { Success = false, ErrorMessage = "Duplicate in‑flight order" };
        }

        if (!_lastPrices.TryGetValue(symbol, out var px) || !_symbolSpecs.TryGetValue(symbol, out var spec))
        {
            return new AdapterOrderResponse { Success = false, ErrorMessage = "Price or symbol properties not available" };
        }

        double refPrice = type == OrderType.Buy ? px.Ask : px.Bid;
        double requiredMargin = _adapter.Calculator.CalculateRequiredMargin(spec, refPrice, volume, _leverage);
        double conversionRate = GetConversionRate(symbol);
        double requiredMarginAccount = requiredMargin * conversionRate;

        bool marginOk;
        await _stateLock.WaitAsync().ConfigureAwait(false);
        try { marginOk = (_equity - _marginUsed) >= requiredMarginAccount - 1e-8; }
        finally { _stateLock.Release(); }
        if (!marginOk)
        {
            return new AdapterOrderResponse { Success = false, ErrorMessage = "Insufficient margin" };
        }

        var sw = Stopwatch.StartNew();
        var response = await _adapter.ExecuteOrderAsync(filtered).ConfigureAwait(false);
        sw.Stop();
        RecordTelemetry(response.Success, sw.ElapsedMilliseconds);

        if (response.Success)
        {
            await _stateLock.WaitAsync().ConfigureAwait(false);
            try { _marginUsed += requiredMarginAccount; UpdateDrawdowns(); }
            finally { _stateLock.Release(); }
        }

        InvokeOrderExecutedHook(filtered, response);
        return response;
    }

    /// <inheritdoc/>
    public async Task<AdapterOrderResponse> PlacePendingOrderAsync(
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
            Comment = comment,
            MagicNumber = _magicNumber
        };

        if (!InvokeOrderValidationFilter(request, out var filtered, out var rejectReason))
        {
            return new AdapterOrderResponse { Success = false, ErrorMessage = rejectReason ?? "Rejected by filter" };
        }

        if (!InvokeOrderBeforeSendFilter(filtered, out filtered, out rejectReason))
        {
            return new AdapterOrderResponse { Success = false, ErrorMessage = rejectReason ?? "Rejected by filter" };
        }

        string key = NextOrderKey(symbol);
        if (!TryAcquireInFlight(key))
        {
            return new AdapterOrderResponse { Success = false, ErrorMessage = "Duplicate in‑flight order" };
        }

        if (!_symbolSpecs.TryGetValue(symbol, out var spec))
        {
            return new AdapterOrderResponse { Success = false, ErrorMessage = "Symbol properties not available" };
        }

        double requiredMargin = _adapter.Calculator.CalculateRequiredMargin(spec, price, volume, _leverage);
        double conversionRate = GetConversionRate(symbol);
        double requiredMarginAccount = requiredMargin * conversionRate;

        bool marginOk;
        await _stateLock.WaitAsync().ConfigureAwait(false);
        try { marginOk = (_equity - _marginUsed) >= requiredMarginAccount - 1e-8; }
        finally { _stateLock.Release(); }
        if (!marginOk)
        {
            return new AdapterOrderResponse { Success = false, ErrorMessage = "Insufficient margin" };
        }

        var sw = Stopwatch.StartNew();
        var response = await _adapter.ExecuteOrderAsync(filtered).ConfigureAwait(false);
        sw.Stop();
        RecordTelemetry(response.Success, sw.ElapsedMilliseconds);

        if (response.Success)
        {
            await _stateLock.WaitAsync().ConfigureAwait(false);
            try { _marginUsed += requiredMarginAccount; UpdateDrawdowns(); }
            finally { _stateLock.Release(); }
        }

        InvokeOrderExecutedHook(filtered, response);
        return response;
    }

    /// <inheritdoc/>
    public Task<AdapterOrderResponse> ModifyOrderAsync(long ticket, double? sl = null, double? tp = null, double? price = null)
        => _adapter.ModifyOrderAsync(ticket, sl, tp, price);

    /// <inheritdoc/>
    public Task<AdapterOrderResponse> CancelOrderAsync(long ticket)
        => _adapter.CancelAsync(ticket);

    /// <inheritdoc/>
    public async Task<AdapterOrderResponse> ClosePositionAsync(long ticket, double volume = 0)
    {
        TryAcquireInFlight($"CLOSE_{ticket}");
        var sw = Stopwatch.StartNew();
        var response = await _adapter.ClosePositionAsync(ticket, volume > 0 ? volume : null).ConfigureAwait(false);
        sw.Stop();
        RecordTelemetry(response.Success, sw.ElapsedMilliseconds);
        return response;
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<AdapterOrderResponse>> CloseAllAsync(string symbol, OrderType? type = null)
    {
        var tasks = new List<Task<AdapterOrderResponse>>();
        await _stateLock.WaitAsync().ConfigureAwait(false);
        try
        {
            for (int i = _openPositions.Count - 1; i >= 0; i--)
            {
                if (_openPositions[i].Symbol == symbol && (type == null || _openPositions[i].Type == type))
                {
                    tasks.Add(ClosePositionAsync(_openPositions[i].Ticket));
                }
            }
        }
        finally { _stateLock.Release(); }
        await Task.WhenAll(tasks).ConfigureAwait(false);
        return tasks.ConvertAll(t => t.Result);
    }

    /// <inheritdoc/>
    public async Task<bool> HasOpenPositionAsync(string symbol, OrderType? type = null, CancellationToken cancellationToken = default)
    {
        await _stateLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try { return _openPositions.Any(p => p.Symbol == symbol && (type == null || p.Type == type)); }
        finally { _stateLock.Release(); }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Position>> GetOpenPositionsAsync(string? symbol = null, CancellationToken cancellationToken = default)
    {
        await _stateLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try { return symbol == null ? [.. _openPositions] : _openPositions.Where(p => p.Symbol == symbol).ToList(); }
        finally { _stateLock.Release(); }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Position>> GetHistoryAsync(CancellationToken cancellationToken = default)
    {
        await _stateLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try { return _history.ToList(); }
        finally { _stateLock.Release(); }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Order>> GetPendingOrdersAsync(CancellationToken cancellationToken = default)
    {
        await _stateLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try { return _pendingOrders.ToList(); }
        finally { _stateLock.Release(); }
    }

    /// <summary>
    /// Called by the adapter's event handler to enqueue a tick for processing.
    /// This is the public entry point for receiving ticks.
    /// </summary>
    public void EnqueueTick(string symbol, Tick tick) => OnTickReceived(symbol, tick);

    /// <summary>
    /// Establishes the connection and notifies hooks.
    /// </summary>
    public async Task ConnectAndNotifyAsync(CancellationToken ct)
    {
        bool connected = await _adapter.ConnectAsync(ct).ConfigureAwait(false);
        if (connected)
        {
            _metrics.SetConnectionState(true, _adapter.Name);
            _messageBus?.Publish(new ConnectionStateEvent(true, _adapter.Name)
            {
                Timestamp = _wallClock.GetUtcNow()
            });
            _hooks?.OnStart.InvokeActionChain(
                new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                    true, "live.start"));
        }
    }
}
