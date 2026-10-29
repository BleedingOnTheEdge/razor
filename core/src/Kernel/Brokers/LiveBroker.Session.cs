// -----------------------------------------------------------------------------
// <copyright file="LiveBroker.Session.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Kernel.Brokers;

using Kernel.Clock;
using Kernel.Events;
using Kernel.Hooks;
using Kernel.Messaging;
using Kernel.Telemetry;
using Sdk.Hooks;
using Sdk.Shared;
using Sdk.Slots.Adapter;
using Microsoft.Extensions.Logging;

public sealed partial class LiveBroker
{
    private async Task PeriodicSyncLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromTicks(_syncIntervalTicks), ct).ConfigureAwait(false);
                await SyncStateAsync(CancellationToken.None).ConfigureAwait(false);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                _logSyncFailed(_logger, ex);
            }
        }
    }

    private async Task StartReconnectionLoopAsync(CancellationToken ct)
    {
        if (_reconnectRunning)
        {
            return;
        }

        _reconnectRunning = true;
        try
        {
            while (!ct.IsCancellationRequested)
            {
                if (!_adapter.IsConnected)
                {
                    _reconnectAttempt++;
                    _hooks?.OnReconnectAttempt.InvokeActionChain(
                        _reconnectAttempt,
                        new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                            _adapter.IsConnected, "live.reconnect.attempt"));

                    bool success = await _adapter.ConnectAsync(ct).ConfigureAwait(false);
                    if (success)
                    {
                        _metrics.SetConnectionState(true, _adapter.Name);
                        _messageBus?.Publish(new ConnectionStateEvent(true, _adapter.Name)
                        {
                            Timestamp = _wallClock.GetUtcNow()
                        });
                        _hooks?.OnReconnectSuccess.InvokeActionChain(
                            _reconnectAttempt,
                            new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                                true, "live.reconnect.success"));
                        _reconnectAttempt = 0;
                        await ReconcileAsync(ct).ConfigureAwait(false);
                    }
                    else
                    {
                        double delay = Math.Min(60, _reconnectBaseDelay.TotalSeconds * Math.Pow(1.5, _reconnectAttempt));
                        await Task.Delay(TimeSpan.FromSeconds(delay), ct).ConfigureAwait(false);
                    }
                }
                else
                {
                    _reconnectAttempt = 0;
                    await Task.Delay(TimeSpan.FromSeconds(5), ct).ConfigureAwait(false);
                }
            }
        }
        finally { _reconnectRunning = false; }
    }

    /// <inheritdoc/>
    public async Task SyncStateAsync(CancellationToken cancellationToken)
    {
        if (!await _syncGate.WaitAsync(0, cancellationToken).ConfigureAwait(false))
        {
            return;
        }

        try
        {
            await _stateLock.WaitAsync(cancellationToken).ConfigureAwait(false);
            try
            {
                _hooks?.OnSyncBefore.InvokeActionChain(
                    new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                        _adapter.IsConnected, "live.sync.before"));

                var (balance, equity) = await _adapter.GetAccountInfoAsync(cancellationToken).ConfigureAwait(false);
                _balance = balance;
                _equity = equity;
                if (_peakEquity == 0)
                {
                    _peakEquity = _peakDailyEquity = equity;
                }

                var active = await _adapter.GetActivePositionsAsync().ConfigureAwait(false);
                _openPositions.Clear();
                _positionMap.Clear();
                foreach (var p in active) { _openPositions.Add(p); _positionMap[p.Ticket] = p; }

                var pending = await _adapter.GetPendingOrdersAsync().ConfigureAwait(false);
                _pendingOrders.Clear();
                _pendingOrders.AddRange(pending);

                _marginUsed = CalculateTotalMarginUsed();
                UpdateDrawdowns();
                _lastSyncTime = _marketClock.GetTimestamp();

                _hooks?.OnSyncAfter.InvokeActionChain(
                    new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                        _adapter.IsConnected, "live.sync.after"));
            }
            finally { _stateLock.Release(); }
        }
        finally { _syncGate.Release(); }
    }

    /// <summary>
    /// Performs a full reconciliation of account state with the adapter.
    /// </summary>
    public async Task ReconcileAsync(CancellationToken cancellationToken)
    {
        await _syncGate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await _stateLock.WaitAsync(cancellationToken).ConfigureAwait(false);
            try
            {
                var (balance, equity) = await _adapter.GetAccountInfoAsync(cancellationToken).ConfigureAwait(false);
                _balance = balance;
                _equity = equity;
                _peakEquity = _peakDailyEquity = _equity;

                var adapterPositions = await _adapter.GetActivePositionsAsync().ConfigureAwait(false);
                var adapterPosMap = adapterPositions.ToDictionary(p => p.Ticket);
                for (int i = _openPositions.Count - 1; i >= 0; i--)
                {
                    if (!adapterPosMap.ContainsKey(_openPositions[i].Ticket))
                    {
                        _positionMap.Remove(_openPositions[i].Ticket);
                        _openPositions.RemoveAt(i);
                    }
                }

                foreach (var ap in adapterPositions)
                {
                    if (_positionMap.TryGetValue(ap.Ticket, out var local))
                    {
                        if (Math.Abs(local.Volume - ap.Volume) > 1e-8)
                        {
                            var updated = local with { Volume = ap.Volume };
                            int idx = _openPositions.IndexOf(local);
                            if (idx >= 0) { _openPositions[idx] = updated; _positionMap[ap.Ticket] = updated; }
                        }
                    }
                    else
                    {
                        _openPositions.Add(ap);
                        _positionMap[ap.Ticket] = ap;
                    }
                }

                _pendingOrders.Clear();
                _pendingOrders.AddRange(await _adapter.GetPendingOrdersAsync().ConfigureAwait(false));
                _marginUsed = CalculateTotalMarginUsed();
            }
            finally { _stateLock.Release(); }
        }
        finally { _syncGate.Release(); }
    }

    /// <summary>
    /// Disconnects and notifies hooks.
    /// </summary>
    public async Task DisconnectAndNotifyAsync()
    {
        _hooks?.OnStop.InvokeActionChain(
            new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                _adapter.IsConnected, "live.stop"));
        await _adapter.DisconnectAsync().ConfigureAwait(false);
        _metrics.SetConnectionState(false, _adapter.Name);
        _messageBus?.Publish(new ConnectionStateEvent(false, _adapter.Name)
        {
            Timestamp = _wallClock.GetUtcNow()
        });
    }

    /// <inheritdoc/>
    public async ValueTask DisposeAsync()
    {
#pragma warning disable CA1849 // Call async methods when in an async method - false positive for Cancel() and Dispose() which have no async equivalents.
        // Stop the tick processor.
        _tickProcessorCts.Cancel();
        if (_tickProcessorTask != null)
        {
            try { await _tickProcessorTask.ConfigureAwait(false); } catch { }
        }
        _tickProcessorCts.Dispose();
        _inFlightCleanupTimer.Dispose();

        _hooks?.OnStop.InvokeActionChain(
            new LiveContext(_wallClock, new Tick(), _equity, _balance, MaxDrawdown, this, _adapter.Name,
                _adapter.IsConnected, "live.stop"));
#pragma warning restore CA1849

        await EndSessionAsync().ConfigureAwait(false);

        if (_lifecycleCts != null)
        {
            await _lifecycleCts.CancelAsync().ConfigureAwait(false);
            _lifecycleCts.Dispose();
        }

        await _adapter.DisconnectAsync().ConfigureAwait(false);

#pragma warning disable CA1849 // Call async methods when in an async method - false positive for Dispose().
        _stateLock.Dispose();
        _syncGate.Dispose();
#pragma warning restore CA1849
    }
}
