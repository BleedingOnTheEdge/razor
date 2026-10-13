// -----------------------------------------------------------------------------
// <copyright file="SimulatedBroker.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------
using Kernel.Clock;
using Kernel.Events;
using Kernel.Hooks;
using Kernel.Messaging;
using Sdk.Hooks;
using Sdk.Shared;
using Microsoft.Extensions.Logging;
namespace Kernel.Brokers;

/// <summary>
/// Deterministic simulated broker for backtesting and optimization.
/// Uses the adapter's <see cref="IMarketCalculator"/> for all financial math,
/// including slippage, commission, and cross‑currency conversion.
/// </summary>
public sealed partial class SimulatedBroker
{
    // ── Private helpers ──────────────────────────────────────────────

    private AdapterOrderResponse ExecuteInstantly(string symbol, OrderType type, double volume, double sl, double tp, string comment)
    {
        if (!_marketPrices.TryGetValue(symbol, out _))
        {
            return new AdapterOrderResponse { Success = false, ErrorMessage = "Price not available" };
        }

        var px = _marketPrices[symbol];
        var spec = _symbolSpecs[symbol];
        double refPrice = type == OrderType.Buy ? px.Ask : px.Bid;
        double slippage = _calculator.CalculateSlippage(spec, type, volume, refPrice);
        double execPrice = type == OrderType.Buy ? refPrice + slippage : refPrice - slippage;
        execPrice = _calculator.NormalizePrice(spec, execPrice);

        double requiredMargin = _calculator.CalculateRequiredMargin(spec, execPrice, volume, _leverage);
        if (FreeMargin < requiredMargin - 1e-8)
        {
            return new AdapterOrderResponse { Success = false, ErrorMessage = "Insufficient margin" };
        }

        double commission = _calculator.CalculateCommission(spec, execPrice, volume);
        long ticket = _ticketCounter++;

        var position = new MutablePosition
        {
            Ticket = ticket,
            Symbol = symbol,
            Type = type,
            Volume = volume,
            OpenPrice = execPrice,
            OpenTime = _clock.GetTimestamp(),
            SL = sl,
            TP = tp,
            Comment = comment,
            Commission = commission,
            Leverage = _leverage,
            AccountEquityAtOpen = _equity
        };

        _positions.Add(position);
        _marginUsed += requiredMargin;
        UpdateDrawdowns();

        _messageBus?.Publish(new OrderExecutedEvent
        {
            Symbol = symbol,
            OrderType = type.ToString(),
            Volume = volume,
            Price = execPrice,
            IsOpen = true,
            EventId = $"sim-{Interlocked.Increment(ref _eventCounter)}",
            Timestamp = _clock.GetUtcNow()
        });

        var posImm = ToImmutable(position);
        _hooks?.OnPositionOpened.InvokeActionChain(
            posImm,
            new BacktestContext(_clock, new Tick(), 0, 0, _equity, _balance, 0, this, null!, new List<Position>(),
                "backtest.position.opened"));

        return new AdapterOrderResponse { Success = true, Ticket = ticket, ExecutedPrice = execPrice, ExecutedVolume = volume };
    }

    private void ProcessExecutionQueue()
    {
        while (_executionQueue.TryPeek(out var q) && _clock.GetTimestamp() >= q.ExecutionTime)
        {
            _executionQueue.Dequeue();
            ExecuteInstantly(q.Symbol, q.Type, q.Volume, q.SL, q.TP, q.Comment);
        }
    }

    private void CheckPendingOrders(string symbol, double bid, double ask)
    {
        if (IsWarmup)
        {
            return;
        }

        for (int i = _pendingOrders.Count - 1; i >= 0; i--)
        {
            var o = _pendingOrders[i];
            if (o.Symbol != symbol)
            {
                continue;
            }

            if (_calculator.IsPendingOrderTriggered(_symbolSpecs[symbol], o.Type, bid, ask, o.Price))
            {
                if (_symbolSpecs.TryGetValue(o.Symbol, out var spec))
                {
                    double pendingMargin = _calculator.CalculateRequiredMargin(spec, o.Price, o.Volume, _leverage);
                    _marginUsed = Math.Max(0, _marginUsed - pendingMargin);
                }
                ConvertPendingToPosition(o, o.Price);
                _pendingOrders.RemoveAt(i);
            }
        }
    }

    private void UpdatePositions(string symbol, double bid, double ask)
    {
        double totalFloatPl = 0, totalUsedMargin = 0;
        for (int i = _positions.Count - 1; i >= 0; i--)
        {
            var p = _positions[i];
            double currentBid = bid, currentAsk = ask;
            if (p.Symbol != symbol && _marketPrices.TryGetValue(p.Symbol, out var px))
            {
                (currentBid, currentAsk) = px;
            }

            var spec = _symbolSpecs[p.Symbol];
            double currentPrice = p.Type == OrderType.Buy ? currentBid : currentAsk;
            double rawPnl = _calculator.CalculatePnL(spec, p.OpenPrice, currentPrice, p.Volume, p.Type);

            // Convert PnL to account currency if converter is provided
            double conversionRate = GetConversionRate(p.Symbol);
            double pnlInAccountCurrency = rawPnl * conversionRate;
            p.Profit = pnlInAccountCurrency - p.Commission + p.Swap;

            bool closed = false;
            if (p.Symbol == symbol)
            {
                if (p.Type == OrderType.Buy)
                {
                    if (p.TP > 0 && currentBid >= p.TP || p.SL > 0 && currentBid <= p.SL)
                    {
                        closed = true;
                    }
                }
                else
                {
                    if (p.TP > 0 && currentAsk <= p.TP || p.SL > 0 && currentAsk >= p.SL)
                    {
                        closed = true;
                    }
                }
            }

            if (closed)
            {
                ClosePositionInternal(i, p.Type == OrderType.Buy ? currentBid : currentAsk, _clock.GetTimestamp(), p.Volume);
            }
            else
            {
                totalFloatPl += p.Profit;
                double margin = _calculator.CalculateRequiredMargin(spec, p.OpenPrice, p.Volume, _leverage);
                totalUsedMargin += margin * conversionRate; // Convert margin to account currency
            }
        }

        _marginUsed = totalUsedMargin;
        _equity = _balance + totalFloatPl;

        if (_marginUsed > 0 && (_equity / _marginUsed) <= _stopOutLevel)
        {
            ApplyStopOut(bid, ask);
        }

        UpdateDrawdowns();
    }

    private double GetConversionRate(string symbol)
    {
        if (_currencyConverter == null || string.IsNullOrEmpty(_accountCurrency))
        {
            return 1.0;
        }

        try
        {
            // For simplicity in simulated mode, we use a synchronous call.
            // In real implementation, we might cache rates.
            return _currencyConverter.GetConversionRateAsync(symbol, _accountCurrency, CancellationToken.None).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            _logConversionFailed(_logger!, symbol, ex);
            return 1.0;
        }
    }

    private void ClosePositionInternal(int index, double price, long time, double closeVolume)
    {
        var p = _positions[index];
        var spec = _symbolSpecs[p.Symbol];
        closeVolume = Math.Min(closeVolume, p.Volume);
        bool isPartial = Math.Abs(p.Volume - closeVolume) > 1e-8;

        double rawSlippage = _calculator.CalculateSlippage(spec,
            p.Type == OrderType.Buy ? OrderType.Sell : OrderType.Buy, closeVolume, price);
        double closePx = p.Type == OrderType.Buy ? price - rawSlippage : price + rawSlippage;
        closePx = _calculator.NormalizePrice(spec, closePx);

        double closeComm = _calculator.CalculateCommission(spec, closePx, closeVolume);
        double closedRawPnl = _calculator.CalculatePnL(spec, p.OpenPrice, closePx, closeVolume, p.Type);
        double conversionRate = GetConversionRate(p.Symbol);
        double closedSwap = p.Swap * (closeVolume / p.Volume);
        double realizedProfit = (closedRawPnl - closeComm) * conversionRate + closedSwap;

        _balance += realizedProfit;
        MutablePosition historyRecord;

        if (isPartial)
        {
            historyRecord = new MutablePosition
            {
                Ticket = p.Ticket,
                Symbol = p.Symbol,
                Type = p.Type,
                Volume = closeVolume,
                OpenPrice = p.OpenPrice,
                OpenTime = p.OpenTime,
                ClosePrice = closePx,
                CloseTime = time,
                Commission = closeComm,
                Swap = closedSwap,
                Profit = realizedProfit,
                SL = p.SL,
                TP = p.TP,
                Comment = p.Comment,
                AccountEquityAtOpen = p.AccountEquityAtOpen
            };
            double remainingVolume = p.Volume - closeVolume;
            if (_symbolSpecs.TryGetValue(p.Symbol, out var specForNormalize))
            {
                remainingVolume = _calculator.NormalizeVolume(specForNormalize, remainingVolume);
            }

            p.Volume = remainingVolume;
            p.Commission -= closeComm;
            p.Swap -= closedSwap;
        }
        else
        {
            p.ClosePrice = closePx;
            p.CloseTime = time;
            p.Commission += closeComm;
            p.Profit = realizedProfit;
            historyRecord = p;
            _positions.RemoveAt(index);
        }

        double marginReq = _calculator.CalculateRequiredMargin(spec, historyRecord.OpenPrice, historyRecord.Volume, _leverage);
        historyRecord.ReturnPct = marginReq > 0 ? historyRecord.Profit / marginReq : 0;
        _history.Add(historyRecord);

        double releasedMargin = marginReq * conversionRate;
        _marginUsed = Math.Max(0, _marginUsed - releasedMargin);
        if (_positions.Count == 0)
        {
            _marginUsed = 0;
            _equity = _balance;
        }
        else
        {
            _equity = _balance + _positions.Sum(pos => pos.Profit);
        }

        _messageBus?.Publish(new OrderExecutedEvent
        {
            Symbol = historyRecord.Symbol,
            OrderType = historyRecord.Type.ToString(),
            Volume = closeVolume,
            Price = closePx,
            IsOpen = false,
            CorrelationId = Guid.NewGuid(),
            Timestamp = _clock.GetUtcNow()
        });

        var posImm = ToImmutable(historyRecord);
        _hooks?.OnPositionClosed.InvokeActionChain(
            posImm,
            new BacktestContext(_clock, new Tick(), 0, 0, _equity, _balance, 0, this, null!, new List<Position>(),
                "backtest.position.closed"));
    }

    private void ConvertPendingToPosition(Order o, double price)
    {
        var spec = _symbolSpecs[o.Symbol];
        OrderType execDir = (o.Type == OrderType.BuyLimit || o.Type == OrderType.BuyStop) ? OrderType.Buy : OrderType.Sell;
        double reqMargin = _calculator.CalculateRequiredMargin(spec, price, o.Volume, _leverage);
        if (FreeMargin < reqMargin - 1e-8)
        {
            return;
        }

        double slippage = _calculator.CalculateSlippage(spec, execDir, o.Volume, price);
        double execPx = execDir == OrderType.Buy ? price + slippage : price - slippage;
        execPx = _calculator.NormalizePrice(spec, execPx);
        double comm = _calculator.CalculateCommission(spec, execPx, o.Volume);
        double conversionRate = GetConversionRate(o.Symbol);
        double marginInAccountCurrency = reqMargin * conversionRate;

        var newPos = new MutablePosition
        {
            Ticket = _ticketCounter++,
            Symbol = o.Symbol,
            Type = execDir,
            Volume = o.Volume,
            OpenPrice = execPx,
            OpenTime = _clock.GetTimestamp(),
            SL = o.SL,
            TP = o.TP,
            Comment = o.Comment,
            Commission = comm,
            Leverage = _leverage,
            AccountEquityAtOpen = _equity
        };
        _positions.Add(newPos);
        _marginUsed += marginInAccountCurrency;
        UpdateDrawdowns();

        _messageBus?.Publish(new OrderExecutedEvent
        {
            Symbol = o.Symbol,
            OrderType = execDir.ToString(),
            Volume = o.Volume,
            Price = execPx,
            IsOpen = true,
            CorrelationId = Guid.NewGuid(),
            Timestamp = _clock.GetUtcNow()
        });

        _hooks?.OnPositionOpened.InvokeActionChain(
            ToImmutable(newPos),
            new BacktestContext(_clock, new Tick(), 0, 0, _equity, _balance, 0, this, null!, new List<Position>(),
                "backtest.position.opened"));
    }

    private void ApplyStopOut(double bid, double ask)
    {
        _pendingOrders.Clear();
        int worstIdx = 0;
        double worstPl = _positions[0].Profit;
        for (int i = 1; i < _positions.Count; i++)
        {
            if (_positions[i].Profit < worstPl)
            {
                worstPl = _positions[i].Profit;
                worstIdx = i;
            }
        }

        var worstPos = _positions[worstIdx];
        if (!_marketPrices.TryGetValue(worstPos.Symbol, out _))
        {
            return;
        }

        var px = _marketPrices[worstPos.Symbol];
        double closePx = worstPos.Type == OrderType.Buy ? px.Bid : px.Ask;
        ClosePositionInternal(worstIdx, closePx, _clock.GetTimestamp(), worstPos.Volume);

        double floatPl = 0, usedMargin = 0;
        foreach (var p in _positions)
        {
            floatPl += p.Profit;
            var spec = _symbolSpecs[p.Symbol];
            double conv = GetConversionRate(p.Symbol);
            usedMargin += _calculator.CalculateRequiredMargin(spec, p.OpenPrice, p.Volume, _leverage) * conv;
        }
        _marginUsed = usedMargin;
        _equity = _balance + floatPl;

        var posImm = ToImmutable(worstPos);
        _hooks?.OnPositionStopout.InvokeActionChain(
            posImm,
            new BacktestContext(_clock, new Tick(), 0, 0, _equity, _balance, 0, this, null!, new List<Position>(),
                "backtest.position.stopout"));
    }

    private void ProcessHoldingCosts()
    {
        long currentTime = _clock.GetTimestamp();
        long interval = _symbolSpecs.Values
            .Select(s => s.HoldingCostIntervalTicks)
            .DefaultIfEmpty(TimeSpan.TicksPerDay)
            .Min();

        if (_nextHoldingCostTime == 0)
        {
            _nextHoldingCostTime = (currentTime / interval + 1) * interval;
            _peakDailyEquity = _equity;
            return;
        }

        while (currentTime >= _nextHoldingCostTime)
        {
            long prevBoundary = _nextHoldingCostTime - interval;
            foreach (var p in _positions)
            {
                if (_symbolSpecs.TryGetValue(p.Symbol, out var spec))
                {
                    double cost = _calculator.CalculateHoldingCost(
                        spec, p.Volume, p.OpenPrice, p.Type, prevBoundary, _nextHoldingCostTime);
                    double conv = GetConversionRate(p.Symbol);
                    p.Swap += cost * conv;
                }
            }

            DateTime utcCurrent = new DateTime(_nextHoldingCostTime, DateTimeKind.Utc).Date;
            DateTime utcLast = new DateTime(prevBoundary, DateTimeKind.Utc).Date;
            if (utcCurrent != utcLast)
            {
                _peakDailyEquity = _equity;
            }

            _nextHoldingCostTime += interval;
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

    private void InvokeEquityUpdatedHook()
    {
        var snapshot = new EquitySnapshot(_equity, _balance, MaxDrawdown, MaxDailyDrawdown);
        _hooks?.OnEquityUpdated.InvokeActionChain(
            snapshot,
            new BacktestContext(_clock, new Tick(), 0, 0, _equity, _balance, 0, this, null!, new List<Position>(),
                "backtest.equity.updated"));
    }

    private bool InvokeOrderValidationFilter(AdapterOrderRequest request, out AdapterOrderRequest filtered, out string? reason)
    {
        if (_hooks?.OnOrderValidation == null)
        {
            filtered = request;
            reason = null;
            return true;
        }

        var entries = ((FilterRegistration<AdapterOrderRequest>)_hooks.OnOrderValidation).Entries;
        var ctx = new BacktestContext(_clock, new Tick(), 0, 0, _equity, _balance, 0, this, null!, new List<Position>(),
            "backtest.order.validation");
        var result = HookInvoker.InvokeFilterChain(entries, request, ctx);
        filtered = result.Data ?? request;
        reason = result.RejectionReason;
        return result.IsAllowed;
    }

    private bool InvokeOrderBeforeExecuteFilter(AdapterOrderRequest request, out AdapterOrderRequest filtered, out string? reason)
    {
        if (_hooks?.OnOrderBeforeExecute == null)
        {
            filtered = request;
            reason = null;
            return true;
        }

        var entries = ((FilterRegistration<AdapterOrderRequest>)_hooks.OnOrderBeforeExecute).Entries;
        var ctx = new BacktestContext(_clock, new Tick(), 0, 0, _equity, _balance, 0, this, null!, new List<Position>(),
            "backtest.order.before_execute");
        var result = HookInvoker.InvokeFilterChain(entries, request, ctx);
        filtered = result.Data ?? request;
        reason = result.RejectionReason;
        return result.IsAllowed;
    }

    private void InvokeOrderAfterExecuteHook(AdapterOrderRequest request, AdapterOrderResponse response)
    {
        if (_hooks?.OnOrderAfterExecute == null)
        {
            return;
        }

        var entries = ((ActionRegistration<(AdapterOrderRequest, AdapterOrderResponse)>)_hooks.OnOrderAfterExecute).Entries;
        var ctx = new BacktestContext(_clock, new Tick(), 0, 0, _equity, _balance, 0, this, null!, new List<Position>(),
            "backtest.order.after_execute");
        HookInvoker.InvokeActionChain(entries, (request, response), ctx);
    }

    private static Position ToImmutable(MutablePosition mp) => new()
    {
        Ticket = mp.Ticket,
        Symbol = mp.Symbol,
        Type = mp.Type,
        Volume = mp.Volume,
        OpenPrice = mp.OpenPrice,
        OpenTime = mp.OpenTime,
        ClosePrice = mp.ClosePrice,
        CloseTime = mp.CloseTime,
        SL = mp.SL,
        TP = mp.TP,
        Commission = mp.Commission,
        Swap = mp.Swap,
        Profit = mp.Profit,
        ReturnPct = mp.ReturnPct,
        Comment = mp.Comment,
        Leverage = mp.Leverage,
        IsMargin = mp.Leverage > 0,
        AccountEquityAtOpen = mp.AccountEquityAtOpen
    };

    private sealed class MutablePosition
    {
        public long Ticket;
        public string Symbol = string.Empty;
        public OrderType Type;
        public double Volume, OpenPrice, ClosePrice, SL, TP, Commission, Swap, Profit, ReturnPct;
        public long OpenTime, CloseTime;
        public string Comment = string.Empty;
        public double Leverage;
        public double AccountEquityAtOpen;
    }

    private sealed class QueuedMarketOrder
    {
        public long ExecutionTime;
        public string Symbol = string.Empty;
        public OrderType Type;
        public double Volume, SL, TP;
        public string Comment = string.Empty;
    }
}
#pragma warning restore CS1591
