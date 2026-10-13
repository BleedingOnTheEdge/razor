// -----------------------------------------------------------------------------
// <copyright file="KernelService.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Kernel;

using Engine.Extensions;
using Engine.Management.Tasks;
using global::Kernel.Backtesting;
using global::Kernel.Brokers;
using global::Kernel.Clock;
using global::Kernel.Configuration;
using global::Kernel.Indicators;
using global::Kernel.Messaging;
using global::Kernel.Optimization;
using global::Kernel.Telemetry;
using Sdk.Hooks;
using Sdk.Shared;
using Sdk.Slots.Adapter;
using Sdk.Slots.NeuralNetwork;
using Sdk.Slots.Strategy;
using Shared;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Collections.Immutable;
using ChromosomeKernel = global::Kernel.Optimization.Chromosome;

/// <summary>
/// Real implementation of <see cref="IKernelService"/> using the Kernel components.
/// </summary>
internal sealed partial class KernelService : IKernelService, IDisposable
{
    private readonly IExtensionManager _extensionManager;
    private readonly IHookRegistry _hookRegistry;
    private readonly IMessageBus _messageBus;
    private readonly ICoreMetrics _metrics;
    private readonly ILogger<KernelService> _logger;
    private readonly ILoggerFactory _loggerFactory;
    private readonly ConcurrentDictionary<string, TaskState> _activeTasks = new();
    private readonly SemaphoreSlim _taskLock = new(1, 1);
    private bool _disposed;

    // Logger delegates
    private static readonly Action<ILogger, string, Exception?> _logBacktestStarted =
        LoggerMessage.Define<string>(LogLevel.Information, 0, "Backtest {TaskId} started.");
    private static readonly Action<ILogger, string, Exception?> _logBacktestCompleted =
        LoggerMessage.Define<string>(LogLevel.Information, 1, "Backtest {TaskId} completed.");
    private static readonly Action<ILogger, string, Exception?> _logBacktestFailed =
        LoggerMessage.Define<string>(LogLevel.Error, 2, "Backtest {TaskId} failed.");
    private static readonly Action<ILogger, string, Exception?> _logLiveStarted =
        LoggerMessage.Define<string>(LogLevel.Information, 3, "Live {TaskId} started.");
    private static readonly Action<ILogger, string, Exception?> _logLiveStopped =
        LoggerMessage.Define<string>(LogLevel.Information, 4, "Live {TaskId} stopped.");
    private static readonly Action<ILogger, string, Exception?> _logOptimizationStarted =
        LoggerMessage.Define<string>(LogLevel.Information, 5, "Optimization {TaskId} started.");
    private static readonly Action<ILogger, string, Exception?> _logOptimizationCompleted =
        LoggerMessage.Define<string>(LogLevel.Information, 6, "Optimization {TaskId} completed.");
    private static readonly Action<ILogger, string, Exception?> _logBacktestCancelled =
        LoggerMessage.Define<string>(LogLevel.Information, 7, "Backtest {TaskId} cancelled.");
    private static readonly Action<ILogger, string, Exception?> _logOptimizationCancelled =
        LoggerMessage.Define<string>(LogLevel.Information, 8, "Optimization {TaskId} cancelled.");
    private static readonly Action<ILogger, string, Exception?> _logOptimizationFailed =
        LoggerMessage.Define<string>(LogLevel.Error, 9, "Optimization {TaskId} failed.");
    private static readonly Action<ILogger, Exception?> _logPauseLiveNotImplemented =
        LoggerMessage.Define(LogLevel.Warning, 10, "PauseLive not implemented; ignoring.");
    private static readonly Action<ILogger, Exception?> _logResumeLiveNotImplemented =
        LoggerMessage.Define(LogLevel.Warning, 11, "ResumeLive not implemented; ignoring.");
    private static readonly Action<ILogger, string, string, Exception?> _logBacktestDataFetchFailed =
        LoggerMessage.Define<string, string>(LogLevel.Error, 12, "Failed to fetch historical data for symbol {Symbol} in backtest {TaskId}.");
    private static readonly Action<ILogger, string, Exception?> _logLiveTickHandlerError =
        LoggerMessage.Define<string>(LogLevel.Error, 13, "Error in live tick handler for symbol {Symbol}.");
    private static readonly Action<ILogger, string, string, Exception?> _logOptimizationDataFetchFailed =
        LoggerMessage.Define<string, string>(LogLevel.Error, 14, "Failed to fetch historical data for symbol {Symbol} in optimisation {TaskId}.");
    private static readonly Action<ILogger, string, Exception?> _logUnsubscribeError =
        LoggerMessage.Define<string>(LogLevel.Warning, 15, "Failed to unsubscribe from symbol {Symbol} during live stop.");

    private sealed record TaskState(
        CancellationTokenSource Cts,
        IAdapterCapability? Adapter = null,
        string[]? Symbols = null,
        Action<string, Tick>? TickHandler = null,
        object? Result = null,
        LiveBroker? Broker = null,
        IStrategyCapability? Strategy = null,
        OptimizationRunner? Runner = null,
        IIndicatorRegistry? IndicatorRegistry = null,
        TickWindow? TickWindow = null,
        List<MemoryMappedTickList>? MappedTickLists = null,
        Func<ChromosomeKernel, CancellationToken, Task<double>>? Evaluator = null,
        ManualResetEventSlim? PauseGate = null,
        bool IsSteppable = false)
    {
        public void DisposeCts()
        {
            Cts?.Cancel();
            Cts?.Dispose();
        }

        public void DisposePauseGate() => PauseGate?.Dispose();

        public void DisposeIndicatorRegistry()
        {
            if (IndicatorRegistry == null)
            {
                return;
            }

            if (IndicatorRegistry is IDisposable disposable)
            {
                disposable.Dispose();
                return;
            }

            var method = IndicatorRegistry.GetType().GetMethod("DisposeAll", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
            method?.Invoke(IndicatorRegistry, null);
        }

        public void DisposeTickWindow() => TickWindow?.Dispose();

        public void DisposeMappedTickLists()
        {
            if (MappedTickLists == null)
            {
                return;
            }

            foreach (var mm in MappedTickLists)
            {
                mm?.Dispose();
            }

            MappedTickLists.Clear();
        }
    }

    public KernelService(
        IExtensionManager extensionManager,
        IHookRegistry hookRegistry,
        IMessageBus messageBus,
        ICoreMetrics metrics,
        ILogger<KernelService> logger,
        ILoggerFactory loggerFactory)
    {
        _extensionManager = extensionManager ?? throw new ArgumentNullException(nameof(extensionManager));
        _hookRegistry = hookRegistry ?? throw new ArgumentNullException(nameof(hookRegistry));
        _messageBus = messageBus ?? throw new ArgumentNullException(nameof(messageBus));
        _metrics = metrics ?? throw new ArgumentNullException(nameof(metrics));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _loggerFactory = loggerFactory ?? throw new ArgumentNullException(nameof(loggerFactory));
    }

}
