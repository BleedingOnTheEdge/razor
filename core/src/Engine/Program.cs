// -----------------------------------------------------------------------------
// <copyright file="Program.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine;

using System.Diagnostics.CodeAnalysis;
using Core;
using Core.Exceptions;
using Communication;
using Extensions;
using Management.Commands;
using Management.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Serilog;
using Services.BehaviorRecorder;
using Services.Update;
using Sdk.Shared;
using ILogger = Microsoft.Extensions.Logging.ILogger;

/// <summary>
/// Main entry point for the Razor Engine.
/// </summary>
[SuppressMessage("Globalization", "CA1303:Do not pass literals as localized parameters",
    Justification = "Console output for CLI; no localization required.")]
internal sealed class Program
{
    private static IServiceProvider? _serviceProvider;
    private static CancellationTokenSource? _shutdownCts;
    private static string? _configuredEngineId;

    // LoggerMessage delegates for shutdown.
    private static readonly Action<ILogger, Exception?> _logShutdownTasksError =
        LoggerMessage.Define(LogLevel.Error, 0, "Error stopping tasks during shutdown.");
    private static readonly Action<ILogger, Exception?> _logShutdownCloudError =
        LoggerMessage.Define(LogLevel.Error, 1, "Error disconnecting from cloud.");
    private static readonly Action<ILogger, Exception?> _logShutdownStateError =
        LoggerMessage.Define(LogLevel.Error, 2, "Error saving state during shutdown.");
    private static readonly Action<ILogger, Exception?> _logShutdownBehaviorError =
        LoggerMessage.Define(LogLevel.Error, 3, "Error flushing behavior records during shutdown.");

    /// <summary>
    /// The main entry point.
    /// </summary>
    [SuppressMessage("Performance", "CA1849:Call async methods when in an async method",
        Justification = "Main is async.")]
    public static async Task Main(string[] args)
    {
        var options = EngineCliOptions.Parse(args);
        if (options is null)
        {
            return;
        }

        _configuredEngineId = options.EngineId;

        if (options.IsRestart)
        {
            Log.Information("Engine restarting after update.");
        }

        _shutdownCts = new CancellationTokenSource();
        Console.CancelKeyPress += OnCancelKeyPress;
        AppDomain.CurrentDomain.UnhandledException += OnUnhandledException;

        int exitCode = 0;
        try
        {
            _serviceProvider = BuildServiceProvider();

            if (options.IsRestart)
            {
                var selfUpdate = _serviceProvider.GetRequiredService<ISelfUpdateManager>();
                await selfUpdate.FinalizeUpdateAsync(_shutdownCts.Token).ConfigureAwait(false);
            }

            if (options.IsService)
            {
                await RunAsServiceAsync(_serviceProvider, _shutdownCts.Token).ConfigureAwait(false);
            }
            else
            {
                await RunConsoleAsync(_serviceProvider, _shutdownCts.Token).ConfigureAwait(false);
            }
        }
        catch (OperationCanceledException)
        {
            Log.Information("Engine shutdown requested.");
            Console.WriteLine("Engine shutdown requested.");
        }
        catch (Exception ex)
        {
            Log.Fatal(ex, "Unhandled exception in Main.");
            Console.WriteLine($"[FATAL] Unhandled exception in Main: {ex}");
            exitCode = 1;
        }
        finally
        {
            await ShutdownEngineAsync().ConfigureAwait(false);
            await Log.CloseAndFlushAsync().ConfigureAwait(false);
        }

        Environment.ExitCode = exitCode;
    }

    private static ServiceProvider BuildServiceProvider()
    {
        var services = new ServiceCollection();
        services.AddEngineServices();
        return services.BuildServiceProvider();
    }

    private static async Task RunConsoleAsync(IServiceProvider serviceProvider, CancellationToken cancellationToken)
    {
        Console.WriteLine("=== Razor Engine v1.0.0 LTS ===");
        Console.WriteLine($"Runtime: {Environment.Version}");

        var loggingService = serviceProvider.GetRequiredService<ILoggingService>();
        await loggingService.InitializeAsync(cancellationToken).ConfigureAwait(false);

        var telemetry = serviceProvider.GetRequiredService<IEngineTelemetry>();
        telemetry.RecordStartup();

        var stateManager = serviceProvider.GetRequiredService<IStateManager>();
        await stateManager.LoadStateAsync(cancellationToken).ConfigureAwait(false);

        if (!string.IsNullOrWhiteSpace(_configuredEngineId))
        {
            stateManager.SetEngineId(_configuredEngineId);
        }

        var liveState = await stateManager.LoadLiveStateAsync(cancellationToken).ConfigureAwait(false);
        if (liveState != null)
        {
            if (serviceProvider.GetRequiredService<ITaskManager>() is TaskManager taskManager)
            {
                string? restoredId = await taskManager.RestoreLiveTaskAsync(liveState, cancellationToken).ConfigureAwait(false);
                if (restoredId != null)
                {
                    Log.Information("Resumed live task {TaskId} from persisted state.", restoredId);
                }
            }
        }

        var extensionManager = serviceProvider.GetRequiredService<IExtensionManager>();
        await extensionManager.DiscoverExtensionsAsync(cancellationToken).ConfigureAwait(false);

        var manifest = await extensionManager.GetManifestAsync(cancellationToken).ConfigureAwait(false);
        var cloudConnector = serviceProvider.GetRequiredService<ICloudConnector>();
        await cloudConnector.SendExtensionManifestAsync(manifest, cancellationToken).ConfigureAwait(false);

        var securityManager = serviceProvider.GetRequiredService<ISecurityManager>();
        if (securityManager.IsDebuggerAttached())
        {
            Console.WriteLine("⚠️ Debugger detected. Some security features may be limited.");
        }

        if (!securityManager.VerifyIntegrity())
        {
            throw new EngineException("Binary integrity check failed.");
        }

        if (!Credentials.IsAvailable)
        {
            Credentials.PromptForCredentials();
        }

        if (serviceProvider.GetRequiredService<ICommandDispatcher>() is CommandDispatcher dispatcher)
        {
            dispatcher.Initialize();
        }

        await cloudConnector.RunAsync(cancellationToken).ConfigureAwait(false);
    }

    private static async Task RunAsServiceAsync(IServiceProvider serviceProvider, CancellationToken cancellationToken)
    {
        using var host2 = Host.CreateDefaultBuilder()
            .UseWindowsService(options => options.ServiceName = "Razor Engine")
            .UseSystemd()
            .ConfigureServices((_, services) => services.AddEngineServices())
            .Build();

        await host2.RunAsync(cancellationToken).ConfigureAwait(false);
    }

    private static async Task ShutdownEngineAsync()
    {
        Console.WriteLine("Engine shutting down...");
        var logger = _serviceProvider?.GetService<ILogger<Program>>();

        try
        {
            var taskManager = _serviceProvider?.GetService<ITaskManager>();
            if (taskManager != null)
            {
                await taskManager.StopAllTasksAsync(CancellationToken.None).ConfigureAwait(false);
            }
        }
        catch (Exception ex)
        {
            if (logger != null)
            {
                _logShutdownTasksError(logger, ex);
            }
            else
            {
                Log.Error(ex, "Error stopping tasks during shutdown.");
            }
        }

        try
        {
            var cloudConnector = _serviceProvider?.GetService<ICloudConnector>();
            if (cloudConnector != null)
            {
                await cloudConnector.DisconnectAsync(CancellationToken.None).ConfigureAwait(false);
            }
        }
        catch (Exception ex)
        {
            if (logger != null)
            {
                _logShutdownCloudError(logger, ex);
            }
            else
            {
                Log.Error(ex, "Error disconnecting from cloud.");
            }
        }

        try
        {
            var stateManager = _serviceProvider?.GetService<IStateManager>();
            if (stateManager != null)
            {
                await stateManager.SaveStateAsync(CancellationToken.None).ConfigureAwait(false);
            }
        }
        catch (Exception ex)
        {
            if (logger != null)
            {
                _logShutdownStateError(logger, ex);
            }
            else
            {
                Log.Error(ex, "Error saving state during shutdown.");
            }
        }

        try
        {
            var behaviorRecorder = _serviceProvider?.GetService<IBehaviorRecorder>();
            if (behaviorRecorder is Services.BehaviorRecorder.BehaviorRecorder concrete)
            {
                concrete.Disable();
                await concrete.FlushAsync(CancellationToken.None).ConfigureAwait(false);
            }
        }
        catch (Exception ex)
        {
            if (logger != null)
            {
                _logShutdownBehaviorError(logger, ex);
            }
            else
            {
                Log.Error(ex, "Error flushing behavior records during shutdown.");
            }
        }

        Console.WriteLine("Engine shutdown complete.");
        _shutdownCts?.Dispose();
        _shutdownCts = null;
    }

    private static void OnCancelKeyPress(object? sender, ConsoleCancelEventArgs e)
    {
        e.Cancel = true;
        Log.Information("Cancel key pressed. Shutting down...");
        _shutdownCts?.Cancel();
    }

    private static void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
    {
        var ex = e.ExceptionObject as Exception;
        Log.Fatal(ex!, "Unhandled exception. The engine is shutting down.");
        _shutdownCts?.Cancel();
    }
}
