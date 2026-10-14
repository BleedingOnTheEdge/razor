// -----------------------------------------------------------------------------
// <copyright file="EngineServiceCollectionExtensions.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine;

using Core;
using Communication;
using Extensions;
using Kernel;
using Management.Commands;
using Management.Scheduling;
using Management.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Serilog;
using Services.Update;
using global::Kernel.Hooks;
using global::Kernel.Messaging;
using global::Kernel.Telemetry;
using Sdk.Hooks;
using Sdk.Shared;

/// <summary>
/// Service collection extension methods for registering Razor Engine subsystems.
/// </summary>
internal static class EngineServiceCollectionExtensions
{
    /// <summary>
    /// Registers all core and infrastructure services required by the Razor Engine.
    /// </summary>
    public static IServiceCollection AddEngineServices(this IServiceCollection services)
    {
        // Core
        services.AddSingleton<ISecurityManager, SecurityManager>();
        services.AddSingleton<IStateManager, StateManager>();
        services.AddSingleton<IEngineTelemetry, EngineTelemetry>();
        services.AddSingleton<BinaryTransferManager>();
        services.AddSingleton<ILoggingService, LoggingService>();
        services.AddSingleton<ConfigStore>();

        // Communication
        services.AddSingleton<ICloudConnector, CloudConnector>();
        services.AddSingleton<Lazy<ICloudConnector>>(sp =>
            new Lazy<ICloudConnector>(() => sp.GetRequiredService<ICloudConnector>()));

        // Management
        services.AddSingleton<ICommandDispatcher, CommandDispatcher>();
        services.AddSingleton<Lazy<ICommandDispatcher>>(sp =>
            new Lazy<ICommandDispatcher>(() => sp.GetRequiredService<ICommandDispatcher>()));
        services.AddSingleton<ICronJobManager, CronJobManager>();
        services.AddSingleton<ITaskManager, TaskManager>();

        // Extensions
        services.AddSingleton<IExtensionManager, ExtensionManager>();

        // Kernel
        services.AddSingleton<IMessageBus, MessageBus>();
        services.AddSingleton<ICoreMetrics>(_ => new CoreMetrics("engine"));
        services.AddSingleton<IKernelService, KernelService>();

        // Services
        services.AddSingleton<IBehaviorRecorder, Services.BehaviorRecorder.BehaviorRecorder>();
        services.AddSingleton<ISelfUpdateManager, SelfUpdateManager>();

        // Hooks
        services.AddSingleton<IHookRegistry, HookRegistry>();

        // Logging
        services.AddLogging(builder =>
        {
            builder.AddConsole();
            builder.AddSerilog(dispose: true);
        });

        // Hosted service
        services.AddHostedService<EngineHostedService>();

        return services;
    }
}
