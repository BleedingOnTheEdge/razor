// -----------------------------------------------------------------------------
// <copyright file="LiveBroker.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------
using Kernel.Clock;
using Kernel.Events;
using Kernel.Hooks;
using Kernel.Messaging;
using Kernel.Telemetry;
using Sdk.Hooks;
using Sdk.Shared;
using Sdk.Slots.Adapter;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
namespace Kernel.Brokers;

/// <summary>
/// Live broker wrapping an <see cref="IAdapterCapability"/> for real exchange trading.
/// All market‑time calculations are tick‑driven; wall‑clock is used only for in‑flight guards and telemetry.
/// Supports cross‑currency conversion if the adapter provides an <see cref="ICurrencyConverter"/>.
/// </summary>
public sealed partial class LiveBroker
{
    private async Task EndSessionAsync()
    {
        List<Position> positionsToClose;
        await _stateLock.WaitAsync().ConfigureAwait(false);
        try
        {
            _isDisposing = true;
            positionsToClose = _openPositions.ToList();
        }
        finally { _stateLock.Release(); }

        var closeTasks = positionsToClose.Select(p => ClosePositionAsync(p.Ticket));
        try { await Task.WhenAll(closeTasks).ConfigureAwait(false); }
        catch (Exception ex) { _logEndSessionCloseError(_logger, ex); }

        _messageBus?.Publish(new LiveSessionEndedEvent
        {
            FinalBalance = _balance,
            FinalEquity = _equity,
            MaxDrawdownPct = MaxDrawdown,
            MaxDailyDrawdownPct = MaxDailyDrawdown,
            TotalTrades = _history.Count,
            CorrelationId = Guid.NewGuid(),
            Timestamp = _wallClock.GetUtcNow()
        });
    }

    private string NextOrderKey(string symbol) => $"{symbol}_ORD_{Interlocked.Increment(ref _orderSequence)}";

    private bool TryAcquireInFlight(string key)
    {
        long now = _wallClock.GetTimestamp();
        if (_inFlightOps.TryGetValue(key, out long expiry) && now < expiry)
        {
            return false;
        }

        // Remove expired entry if present.
        if (expiry > 0 && now >= expiry)
        {
            _inFlightOps.TryRemove(key, out _);
        }

        _inFlightOps[key] = now + _orderGuardTimeoutSeconds * 1000L;
        return true;
    }

    private void CleanupInFlightEntries()
    {
        long now = _wallClock.GetTimestamp();
        foreach (var kv in _inFlightOps)
        {
            if (now >= kv.Value)
            {
                _inFlightOps.TryRemove(kv.Key, out _);
            }
        }
    }

    private double CalculateActiveMarginUsed()
    {
        double used = 0;
        foreach (var pos in _openPositions)
        {
            // Use TryGetValue instead of indexer.
            if (_symbolSpecs.TryGetValue(pos.Symbol, out var spec))
            {
                double margin = _adapter.Calculator.CalculateRequiredMargin(spec, pos.OpenPrice, pos.Volume, _leverage);
                double conv = GetConversionRate(pos.Symbol);
                used += margin * conv;
            }
        }
        return used;
    }

    private double CalculateTotalMarginUsed()
    {
        double used = CalculateActiveMarginUsed();
        foreach (var o in _pendingOrders)
        {
            // Use TryGetValue instead of indexer.
            if (_symbolSpecs.TryGetValue(o.Symbol, out var spec))
            {
                double margin = _adapter.Calculator.CalculateRequiredMargin(spec, o.Price, o.Volume, _leverage);
                double conv = GetConversionRate(o.Symbol);
                used += margin * conv;
            }
        }
        return used;
    }

    private async Task HandleExecutionReportAsync(ExecutionReport report)
    {
        await _stateLock.WaitAsync().ConfigureAwait(false);
        try
        {
            if (_isDisposing)
            {
                return;
            }

            if (report.State is not (ExecutionState.Filled or ExecutionState.PartiallyFilled))
            {
                return;
            }

            _liquidationTickets.Remove(report.Ticket);

            if (_positionMap.TryGetValue(report.Ticket, out var pos))
            {
                if (report.State == ExecutionState.Filled && report.RemainingVolume <= 0)
                {
                    double finalProfit = report.RealizedPnL + pos.Swap;
                    _balance += finalProfit;

                    var closedPosition = pos with
                    {
                        ClosePrice = report.ExecutedPrice,
                        CloseTime = report.Timestamp,
                        Profit = finalProfit
                    };
                    _history.Add(closedPosition);
                    // Trim history to prevent unbounded growth.
                    if (_history.Count > _maxHistorySize)
                    {
                        _history.RemoveRange(0, _history.Count - _maxHistorySize);
                    }
                    _openPositions.Remove(pos);
                    _positionMap.Remove(report.Ticket);

                    _hooks?.OnPositionClosed.InvokeActionChain(
                        closedPosition,
                        new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                            _adapter.IsConnected, "live.position.closed"));

                    _messageBus?.Publish(new OrderExecutedEvent
                    {
                        Symbol = pos.Symbol,
                        OrderType = pos.Type.ToString(),
                        Volume = report.ExecutedVolume,
                        Price = report.ExecutedPrice,
                        IsOpen = false,
                        CorrelationId = Guid.NewGuid(),
                        Timestamp = _marketClock.GetUtcNow()
                    });
                }
                else
                {
                    double newVolume = pos.Volume + (report.Type == pos.Type ? report.ExecutedVolume : -report.ExecutedVolume);
                    // Use TryGetValue instead of indexer.
                    if (_symbolSpecs.TryGetValue(pos.Symbol, out var spec))
                    {
                        newVolume = _adapter.Calculator.NormalizeVolume(spec, newVolume);
                    }

                    var updated = pos with { Volume = newVolume };
                    int idx = _openPositions.IndexOf(pos);
                    if (idx >= 0) { _openPositions[idx] = updated; _positionMap[report.Ticket] = updated; }
                }
            }
            else if (!_isDisposing)
            {
                var newPos = new Position
                {
                    Ticket = report.Ticket,
                    Symbol = report.Symbol,
                    Type = report.Type,
                    Volume = report.ExecutedVolume,
                    OpenPrice = report.ExecutedPrice,
                    OpenTime = report.Timestamp,
                    Comment = report.Comment,
                    Commission = report.Commission,
                    AccountEquityAtOpen = _equity
                };
                _openPositions.Add(newPos);
                _positionMap[report.Ticket] = newPos;
                UpdateDrawdowns();

                _hooks?.OnPositionOpened.InvokeActionChain(
                    newPos,
                    new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                        _adapter.IsConnected, "live.position.opened"));

                _messageBus?.Publish(new OrderExecutedEvent
                {
                    Symbol = report.Symbol,
                    OrderType = report.Type.ToString(),
                    Volume = report.ExecutedVolume,
                    Price = report.ExecutedPrice,
                    IsOpen = true,
                    CorrelationId = Guid.NewGuid(),
                    Timestamp = _marketClock.GetUtcNow()
                });
            }

            _marginUsed = CalculateTotalMarginUsed();
        }
        finally { _stateLock.Release(); }
    }

    private void ApplyStopOut()
    {
        if (_openPositions.Count == 0)
        {
            return;
        }

        int worstIdx = -1;
        double worstProfit = double.MaxValue;
        for (int i = 0; i < _openPositions.Count; i++)
        {
            var p = _openPositions[i];
            if (_liquidationTickets.Contains(p.Ticket))
            {
                continue;
            }

            if (p.Profit < worstProfit) { worstProfit = p.Profit; worstIdx = i; }
        }

        if (worstIdx < 0)
        {
            return; // all positions already being liquidated
        }

        var worstPos = _openPositions[worstIdx];
        _liquidationTickets.Add(worstPos.Ticket);

        _hooks?.OnPositionStopout.InvokeActionChain(
            worstPos,
            new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                _adapter.IsConnected, "live.position.stopout"));

        _ = Task.Factory.StartNew(async () =>
        {
            int attempts = 0;
            const int maxAttempts = 3;
            Exception? lastEx = null;
            while (attempts < maxAttempts)
            {
                try
                {
                    await ClosePositionAsync(worstPos.Ticket).ConfigureAwait(false);
                    return;
                }
                catch (Exception ex)
                {
                    lastEx = ex;
                    attempts++;
                    if (attempts < maxAttempts)
                    {
                        int delay = (int)Math.Pow(2, attempts) * 1000;
                        await Task.Delay(delay, CancellationToken.None).ConfigureAwait(false);
                    }
                }
            }
            _logStopOutRetryFailed(_logger, worstPos.Ticket.ToString(CultureInfo.InvariantCulture), attempts, lastEx);
        }, CancellationToken.None, TaskCreationOptions.DenyChildAttach, TaskScheduler.Default)
        .ContinueWith(t =>
        {
            lock (_liquidationTickets)
            {
                _liquidationTickets.Remove(worstPos.Ticket);
            }
        }, CancellationToken.None, TaskContinuationOptions.ExecuteSynchronously, TaskScheduler.Default);
    }

    private void ProcessHoldingCosts()
    {
        long currentTime = _marketClock.GetTimestamp();
        long holdingInterval = _symbolSpecs.Values
            .Select(s => s.HoldingCostIntervalTicks)
            .DefaultIfEmpty(TimeSpan.TicksPerDay)
            .Min();

        if (_nextHoldingCostTime == 0)
        {
            _nextHoldingCostTime = (currentTime / holdingInterval + 1) * holdingInterval;
            _peakDailyEquity = _equity;
            return;
        }

        while (currentTime >= _nextHoldingCostTime)
        {
            long prevBoundary = _nextHoldingCostTime - holdingInterval;
            for (int i = 0; i < _openPositions.Count; i++)
            {
                var pos = _openPositions[i];
                // Use TryGetValue instead of indexer.
                if (_symbolSpecs.TryGetValue(pos.Symbol, out var spec))
                {
                    double cost = _adapter.Calculator.CalculateHoldingCost(
                        spec, pos.Volume, pos.OpenPrice, pos.Type, prevBoundary, _nextHoldingCostTime);
                    double conv = GetConversionRate(pos.Symbol);
                    if (Math.Abs(cost) > 0)
                    {
                        var updated = pos with { Swap = pos.Swap + cost * conv };
                        _openPositions[i] = updated;
                        _positionMap[pos.Ticket] = updated;
                    }
                }
            }

            DateTime utcCurrent = new DateTime(_nextHoldingCostTime, DateTimeKind.Utc).Date;
            DateTime utcLast = new DateTime(prevBoundary, DateTimeKind.Utc).Date;
            if (utcCurrent != utcLast)
            {
                _peakDailyEquity = _equity;
            }

            _nextHoldingCostTime += holdingInterval;
        }
    }

    private void UpdateDrawdowns()
    {
        if (_equity > _peakEquity)
        {
            _peakEquity = _equity;
        }

        if (_peakEquity > 1e-8)
        {
            double dd = (_peakEquity - _equity) / _peakEquity * 100.0;
            if (dd > MaxDrawdown)
            {
                MaxDrawdown = dd;
            }
        }

        if (_equity > _peakDailyEquity)
        {
            _peakDailyEquity = _equity;
        }

        if (_peakDailyEquity > 1e-8)
        {
            double dailyDd = (_peakDailyEquity - _equity) / _peakDailyEquity * 100.0;
            if (dailyDd > MaxDailyDrawdown)
            {
                MaxDailyDrawdown = dailyDd;
            }
        }
    }

    private void InvokeEquityChangedHook()
    {
        if (_hooks == null)
        {
            return;
        }

        var snapshot = new EquitySnapshot(_equity, _balance, MaxDrawdown, MaxDailyDrawdown);
        _hooks.OnEquityChanged.InvokeActionChain(
            snapshot,
            new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                _adapter.IsConnected, "live.equity.changed"));
    }

    private bool InvokeOrderValidationFilter(AdapterOrderRequest request, out AdapterOrderRequest filtered, out string? reason)
    {
        filtered = request; reason = null;
        if (_hooks == null)
        {
            return true;
        }

        var ctx = new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
            _adapter.IsConnected, "live.order.validation");
        var result = _hooks.OnOrderValidation.InvokeFilterChain(request, ctx);
        filtered = result.Data ?? request;
        reason = result.RejectionReason;
        return result.IsAllowed;
    }

    private bool InvokeOrderBeforeSendFilter(AdapterOrderRequest request, out AdapterOrderRequest filtered, out string? reason)
    {
        filtered = request; reason = null;
        if (_hooks == null)
        {
            return true;
        }

        var ctx = new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
            _adapter.IsConnected, "live.order.before_send");
        var result = _hooks.OnOrderBeforeSend.InvokeFilterChain(request, ctx);
        filtered = result.Data ?? request;
        reason = result.RejectionReason;
        return result.IsAllowed;
    }

    private void InvokeOrderExecutedHook(AdapterOrderRequest request, AdapterOrderResponse response)
    {
        if (_hooks == null)
        {
            return;
        }

        if (response.Success)
        {
            _hooks.OnOrderExecuted.InvokeActionChain(
                new ExecutionReport
                {
                    Ticket = response.Ticket,
                    Symbol = request.Symbol,
                    Type = request.Type,
                    State = ExecutionState.Filled,
                    ExecutedVolume = response.ExecutedVolume,
                    ExecutedPrice = response.ExecutedPrice,
                    Comment = request.Comment,
                    Timestamp = _marketClock.GetTimestamp()
                },
                new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                    _adapter.IsConnected, "live.order.executed"));
        }
        else
        {
            _hooks.OnOrderRejected.InvokeActionChain(
                (request, response.ErrorMessage),
                new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                    _adapter.IsConnected, "live.order.rejected"));
        }
    }

    private void RecordTelemetry(bool success, long latencyMs)
    {
        if (!success)
        {
            _metrics.RecordLiveOrderRejection();
        }

        _metrics.RecordLiveOrderLatency(latencyMs);
    }

    private double GetConversionRate(string symbol)
    {
        if (_currencyConverter == null || string.IsNullOrEmpty(_accountCurrency))
        {
            return 1.0;
        }

        try
        {
            return _currencyConverter.GetConversionRateAsync(symbol, _accountCurrency, CancellationToken.None).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            _logConversionFailed(_logger, symbol, ex);
            return 1.0;
        }
    }

    private double GetState(Func<double> accessor)
    {
        _stateLock.Wait();
        try { return accessor(); }
        finally { _stateLock.Release(); }
    }
}
