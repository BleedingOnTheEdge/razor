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
public sealed partial class LiveBroker : IBroker, IAsyncDisposable
{
    private readonly IAdapterCapability _adapter;
    private readonly int _magicNumber;
    private readonly double _leverage;
    private readonly IMessageBus? _messageBus;
    private readonly TickClock _marketClock;
    private readonly SystemClock _wallClock;
    private readonly ICoreMetrics _metrics;
    private readonly int _orderGuardTimeoutSeconds;
    private readonly double _stopOutLevel;
    private readonly ILiveHooks? _hooks;
    private readonly long _syncIntervalTicks;
    private readonly ILogger<LiveBroker> _logger;
    private readonly ICurrencyConverter? _currencyConverter;
    private readonly string? _accountCurrency;

    private readonly SemaphoreSlim _stateLock = new(1, 1);
    private readonly SemaphoreSlim _syncGate = new(1, 1);
    private CancellationTokenSource? _lifecycleCts;
    private long _orderSequence;
    private bool _isDisposing;

    private readonly List<Position> _openPositions = new();
    private readonly List<Position> _history = new();
    private readonly List<Order> _pendingOrders = new();
    private readonly Dictionary<long, Position> _positionMap = new();
    private readonly ConcurrentDictionary<string, long> _inFlightOps = new();
    private readonly HashSet<long> _liquidationTickets = new();

    private readonly Dictionary<string, SymbolProperties> _symbolSpecs = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, (double Bid, double Ask)> _lastPrices = new(StringComparer.OrdinalIgnoreCase);

    private double _balance;
    private double _equity;
    private double _marginUsed;
    private double _peakEquity;
    private double _peakDailyEquity;
    private long _lastSyncTime;
    private long _nextHoldingCostTime;

    private readonly TimeSpan _reconnectBaseDelay = TimeSpan.FromSeconds(2);
    private int _reconnectAttempt;
    private bool _reconnectRunning;

    // Threading improvements (THR‑02, THR‑04)
    private readonly ConcurrentQueue<(string Symbol, Tick Tick)> _tickQueue = new();
    private readonly CancellationTokenSource _tickProcessorCts = new();
    private Task? _tickProcessorTask;
    private readonly int _maxHistorySize = 10000;
    private readonly Timer _inFlightCleanupTimer;

    // LoggerMessage delegates
    private static readonly Action<ILogger, string, Exception?> _logCloseFailed =
        LoggerMessage.Define<string>(LogLevel.Error, 1000, "Close failed for ticket {Ticket}");
    private static readonly Action<ILogger, string, Exception?> _logConversionFailed =
        LoggerMessage.Define<string>(LogLevel.Warning, 1001, "Failed to get conversion rate for {Symbol}, using 1.0");
    private static readonly Action<ILogger, Exception?> _logSyncFailed =
        LoggerMessage.Define(LogLevel.Error, 1002, "Periodic sync failed, will retry on next interval");
    private static readonly Action<ILogger, Exception?> _logEndSessionCloseError =
        LoggerMessage.Define(LogLevel.Error, 1003, "EndSessionAsync: One or more close tasks failed");
    private static readonly Action<ILogger, string, int, Exception?> _logStopOutRetryFailed =
        LoggerMessage.Define<string, int>(LogLevel.Error, 1004, "Stop-out close failed for ticket {Ticket} after {Attempts} attempts");

    /// <inheritdoc/>
    public double Balance => GetState(() => _balance);

    /// <inheritdoc/>
    public double Equity => GetState(() => _equity);

    /// <inheritdoc/>
    public double MarginUsed => GetState(() => _marginUsed);

    /// <inheritdoc/>
    public double FreeMargin => GetState(() => _equity - _marginUsed);

    /// <inheritdoc/>
    public double MaxDrawdown { get; private set; }

    /// <inheritdoc/>
    public double MaxDailyDrawdown { get; private set; }

    /// <inheritdoc/>
    public bool IsWarmup => false;

    /// <summary>
    /// Initialises a new instance of the <see cref="LiveBroker"/> class.
    /// </summary>
    /// <param name="adapter">The adapter providing exchange connectivity.</param>
    /// <param name="magicNumber">Unique magic number for order tagging.</param>
    /// <param name="leverage">Account leverage.</param>
    /// <param name="marketClock">Tick‑driven market clock.</param>
    /// <param name="wallClock">System clock for non‑trading timeouts.</param>
    /// <param name="metrics">Telemetry metrics recorder.</param>
    /// <param name="messageBus">Optional message bus for events.</param>
    /// <param name="hooks">Optional live hooks.</param>
    /// <param name="orderGuardTimeoutSeconds">In‑flight order guard timeout in seconds.</param>
    /// <param name="stopOutLevel">Stop‑out margin ratio.</param>
    /// <param name="syncIntervalTicks">Periodic sync interval in ticks.</param>
    /// <param name="logger">Logger instance.</param>
    /// <param name="currencyConverter">Optional currency converter for cross‑currency PnL.</param>
    /// <param name="accountCurrency">Base account currency.</param>
    public LiveBroker(
        IAdapterCapability adapter,
        int magicNumber,
        double leverage,
        TickClock marketClock,
        SystemClock wallClock,
        ICoreMetrics metrics,
        IMessageBus? messageBus = null,
        ILiveHooks? hooks = null,
        int orderGuardTimeoutSeconds = 5,
        double stopOutLevel = 0.50,
        long syncIntervalTicks = TimeSpan.TicksPerMinute,
        ILogger<LiveBroker>? logger = null,  // Now optional
        ICurrencyConverter? currencyConverter = null,
        string? accountCurrency = null)
    {
        _adapter = adapter ?? throw new ArgumentNullException(nameof(adapter));
        _magicNumber = magicNumber;
        _leverage = leverage;
        _stopOutLevel = stopOutLevel;
        _metrics = metrics ?? throw new ArgumentNullException(nameof(metrics));
        _messageBus = messageBus;
        _marketClock = marketClock ?? throw new ArgumentNullException(nameof(marketClock));
        _wallClock = wallClock ?? throw new ArgumentNullException(nameof(wallClock));
        _orderGuardTimeoutSeconds = orderGuardTimeoutSeconds;
        _syncIntervalTicks = syncIntervalTicks;
        _hooks = hooks;
        _logger = logger ?? Microsoft.Extensions.Logging.Abstractions.NullLogger<LiveBroker>.Instance; // IMP-06
        _currencyConverter = currencyConverter;
        _accountCurrency = accountCurrency;

        _adapter.OnExecutionUpdate += report =>
            _ = Task.Factory.StartNew(() => HandleExecutionReportAsync(report),
                                      CancellationToken.None,
                                      TaskCreationOptions.DenyChildAttach,
                                      TaskScheduler.Default)
                .ContinueWith(t => _logCloseFailed(_logger, "HandleExecutionReport", t.Exception),
                              CancellationToken.None,
                              TaskContinuationOptions.OnlyOnFaulted,
                              TaskScheduler.Default);

        // Start periodic cleanup for in‑flight operations (THR‑04).
        _inFlightCleanupTimer = new Timer(_ => CleanupInFlightEntries(), null, TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(1));
    }

    /// <summary>
    /// Sets symbol properties for a given symbol.
    /// </summary>
    /// <param name="symbol">The symbol.</param>
    /// <param name="specs">Symbol properties from the adapter.</param>
    public async Task SetSymbolSpecsAsync(string symbol, SymbolProperties specs)
    {
        await _stateLock.WaitAsync().ConfigureAwait(false);
        try { _symbolSpecs[symbol] = specs; }
        finally { _stateLock.Release(); }
    }

    /// <inheritdoc/>
    public async Task InitializeLiveStateAsync(CancellationToken cancellationToken)
    {
        await ReconcileAsync(cancellationToken).ConfigureAwait(false);
        _lifecycleCts?.Dispose();
        _lifecycleCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _ = Task.Factory.StartNew(() => PeriodicSyncLoopAsync(_lifecycleCts.Token),
                                  CancellationToken.None,
                                  TaskCreationOptions.DenyChildAttach,
                                  TaskScheduler.Default);
        _ = Task.Factory.StartNew(() => StartReconnectionLoopAsync(_lifecycleCts.Token),
                                  CancellationToken.None,
                                  TaskCreationOptions.DenyChildAttach,
                                  TaskScheduler.Default);

        // Start the dedicated tick processor thread (THR‑02).
        StartTickProcessor();
    }

    private void StartTickProcessor()
    {
        _tickProcessorTask = Task.Run(async () =>
        {
            while (!_tickProcessorCts.Token.IsCancellationRequested)
            {
                if (_tickQueue.TryDequeue(out var item))
                {
                    await ProcessTickAsync(item.Symbol, item.Tick).ConfigureAwait(false);
                }
                else
                {
                    await Task.Delay(1, _tickProcessorCts.Token).ConfigureAwait(false);
                }
            }
        }, _tickProcessorCts.Token);
    }

    /// <summary>
    /// Enqueues a tick for serialised processing. Called from the adapter's event handler.
    /// </summary>
    /// <param name="symbol">Symbol of the tick.</param>
    /// <param name="tick">The tick data.</param>
    public void OnTickReceived(string symbol, Tick tick) => _tickQueue.Enqueue((symbol, tick));

    private async Task ProcessTickAsync(string symbol, Tick tick)
    {
        _marketClock.SetTickTime(tick.Time);
        long now = _marketClock.GetTimestamp();

        if (_hooks != null)
        {
            var ctx = new LiveContext(_wallClock, tick, _equity, _balance, MaxDrawdown, this, _adapter.Name,
                _adapter.IsConnected, "live.tick.received");
            var filterResult = _hooks.OnTickReceived.InvokeFilterChain(tick, ctx);
            if (!filterResult.IsAllowed)
            {
                return;
            }

            tick = filterResult.IsAllowed ? filterResult.Data : tick;
        }

        long latencyTicks = _wallClock.GetUtcNow().Ticks - now;
        _metrics.RecordLiveTickLatency(latencyTicks);

        // Check if sync is due – release lock before syncing to avoid deadlock.
        if (_syncIntervalTicks > 0 && (now - _lastSyncTime) >= _syncIntervalTicks)
        {
            await SyncStateAsync(CancellationToken.None).ConfigureAwait(false);
        }

        List<long> ticketsToClose = new();
        await _stateLock.WaitAsync().ConfigureAwait(false);
        try
        {
            _lastPrices[symbol] = (tick.Bid, tick.Ask);
            ProcessHoldingCosts();

            double floatPl = 0;
            for (int i = _openPositions.Count - 1; i >= 0; i--)
            {
                var p = _openPositions[i];
                // DAT‑09: Use TryGetValue instead of indexer.
                if (!_symbolSpecs.TryGetValue(p.Symbol, out var spec))
                {
                    continue;
                }

                if (!_lastPrices.TryGetValue(p.Symbol, out var px))
                {
                    px = (tick.Bid, tick.Ask);
                }

                double currentPx = p.Type == OrderType.Buy ? px.Bid : px.Ask;
                double rawPnl = _adapter.Calculator.CalculatePnL(spec, p.OpenPrice, currentPx, p.Volume, p.Type);
                double conversionRate = GetConversionRate(p.Symbol);
                double pnlInAccount = rawPnl * conversionRate;
                var updated = p with { Profit = pnlInAccount - p.Commission + p.Swap };
                _openPositions[i] = updated;
                _positionMap[p.Ticket] = updated;
                floatPl += updated.Profit;

                if (p.Symbol == symbol)
                {
                    bool close = false;
                    if (p.Type == OrderType.Buy)
                    {
                        if (p.TP > 0 && px.Bid >= p.TP)
                        {
                            close = true;
                        }
                        else if (p.SL > 0 && px.Bid <= p.SL)
                        {
                            close = true;
                        }
                    }
                    else
                    {
                        if (p.TP > 0 && px.Ask <= p.TP)
                        {
                            close = true;
                        }
                        else if (p.SL > 0 && px.Ask >= p.SL)
                        {
                            close = true;
                        }
                    }
                    if (close)
                    {
                        ticketsToClose.Add(p.Ticket);
                    }
                }
            }

            _equity = _balance + floatPl;
            UpdateDrawdowns();

            double totalMargin = CalculateActiveMarginUsed();
            if (totalMargin > 0 && _stopOutLevel > 0 && (_equity / totalMargin) <= _stopOutLevel)
            {
                ApplyStopOut();
            }

            InvokeEquityChangedHook();
        }
        finally
        {
            _stateLock.Release();
        }

        foreach (var tck in ticketsToClose)
        {
            try { await ClosePositionAsync(tck).ConfigureAwait(false); }
            catch (Exception ex) { _logCloseFailed(_logger, tck.ToString(CultureInfo.InvariantCulture), ex); }
        }

        _hooks?.OnTickProcessed.InvokeActionChain(
            tick,
            new LiveContext(_wallClock, tick, _equity, _balance, MaxDrawdown, this, _adapter.Name, _adapter.IsConnected,
                "live.tick.processed"));
    }
}
