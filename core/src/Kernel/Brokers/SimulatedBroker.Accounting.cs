// -----------------------------------------------------------------------------
// <copyright file="SimulatedBroker.Accounting.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.Brokers;

using Kernel.Clock;
using Kernel.Events;
using Kernel.Hooks;
using Kernel.Messaging;
using Sdk.Hooks;
using Sdk.Shared;
using Microsoft.Extensions.Logging;

public sealed partial class SimulatedBroker
{
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
