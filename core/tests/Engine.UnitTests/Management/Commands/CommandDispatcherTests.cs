// -----------------------------------------------------------------------------
// <copyright file="CommandDispatcherTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.UnitTests.Management.Commands;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Engine.Communication;
using Engine.Core;
using Engine.Extensions;
using Engine.Management.Commands;
using Engine.Management.Scheduling;
using Engine.Management.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Sdk.Hooks;
using Xunit;

public sealed class CommandDispatcherTests
{
    private readonly FakeCloudConnector _connector = new();
    private readonly FakeTaskManager _taskManager = new();
    private readonly FakeExtensionManager _extensionManager = new();
    private readonly FakeTelemetry _telemetry = new();
    private readonly FakeCronJobManager _cronManager = new();
    private readonly FakeStateManager _stateManager = new();
    private readonly FakeBehaviorRecorder _behaviorRecorder = new();
    private readonly ConfigStore _configStore = new();
    private readonly ILoggerFactory _loggerFactory = NullLoggerFactory.Instance;

    private CommandDispatcher CreateDispatcher() =>
        new(
            _connector,
            NullLogger<CommandDispatcher>.Instance,
            _taskManager,
            _extensionManager,
            _telemetry,
            _cronManager,
            _stateManager,
            _behaviorRecorder,
            _loggerFactory,
            _configStore);

    [Fact]
    public async Task DispatchAsync_RoutesToRegisteredHandler()
    {
        var dispatcher = CreateDispatcher();
        var handler = new RecordingHandler();
        dispatcher.RegisterHandler(5555, handler);

        var command = new CloudCommand
        {
            CommandId = 5555,
            CommandType = "CustomTest",
            CorrelationId = "corr-123",
            Parameters = new Dictionary<string, object> { ["Arg"] = "Value" },
            TimeoutSeconds = 15
        };

        await dispatcher.DispatchAsync(command, CancellationToken.None);

        Assert.Single(handler.HandledCommands);
        Assert.Equal(5555, handler.HandledCommands[0].CommandId);
        Assert.Equal("corr-123", handler.HandledCommands[0].CorrelationId);
    }

    [Fact]
    public async Task DispatchAsync_SendsErrorResponse_WhenHandlerNotFound()
    {
        var dispatcher = CreateDispatcher();
        var command = new CloudCommand
        {
            CommandId = 99999, // Unregistered
            CorrelationId = "corr-unknown"
        };

        await dispatcher.DispatchAsync(command, CancellationToken.None);

        Assert.Single(_connector.SentMessages);
        var msg = _connector.SentMessages[0];
        Assert.Equal("CommandResponse", msg.MessageType);
        Assert.Equal("corr-unknown", msg.CorrelationId);
        Assert.True(msg.Encrypted);

        var payload = msg.Payload;
        Assert.NotNull(payload);
    }

    [Fact]
    public async Task DispatchAsync_CatchesHandlerException_AndSendsErrorResponse()
    {
        var dispatcher = CreateDispatcher();
        var throwingHandler = new ThrowingHandler("Deliberate failure in handler execution.");
        dispatcher.RegisterHandler(6666, throwingHandler);

        var command = new CloudCommand
        {
            CommandId = 6666,
            CorrelationId = "corr-err"
        };

        await dispatcher.DispatchAsync(command, CancellationToken.None);

        Assert.Single(_connector.SentMessages);
        var msg = _connector.SentMessages[0];
        Assert.Equal("corr-err", msg.CorrelationId);
    }

    [Fact]
    public async Task SendResponseAsync_WhenOffline_DoesNotThrowAndDoesNotSend()
    {
        _connector.IsConnected = false;
        var dispatcher = CreateDispatcher();

        await dispatcher.SendResponseAsync(1001, "corr-offline", new
        {
            Status = "Ok"
        });

        Assert.Empty(_connector.SentMessages);
    }

    [Fact]
    public async Task SendResponseAsync_WhenConnected_BuildsEncryptedCommandResponseMessage()
    {
        _connector.IsConnected = true;
        var dispatcher = CreateDispatcher();

        await dispatcher.SendResponseAsync(1001, "corr-success", new
        {
            Key = "Val"
        }, error: null);

        Assert.Single(_connector.SentMessages);
        var msg = _connector.SentMessages[0];
        Assert.Equal("CommandResponse", msg.MessageType);
        Assert.Equal("corr-success", msg.CorrelationId);
        Assert.True(msg.Encrypted);
    }

    [Fact]
    public async Task StopUserTasksAsync_ForwardsCallToTaskManager()
    {
        var dispatcher = CreateDispatcher();

        await dispatcher.StopUserTasksAsync(CancellationToken.None);

        Assert.True(_taskManager.StopAllUserTasksCalled);
    }

    // ─── Test Doubles ────────────────────────────────────────────────────────────

    private sealed class RecordingHandler : ICommandHandler
    {
        public int CommandId => 5555;
        public List<CloudCommand> HandledCommands { get; } = [];

        public Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
        {
            HandledCommands.Add(command);
            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingHandler : ICommandHandler
    {
        private readonly string _message;
        public int CommandId => 6666;

        public ThrowingHandler(string message)
        {
            _message = message;
        }

        public Task HandleAsync(CloudCommand command, CancellationToken cancellationToken)
        {
            throw new InvalidOperationException(_message);
        }
    }

    private sealed class FakeCloudConnector : ICloudConnector
    {
        public bool IsConnected { get; set; } = true;
        public string? SessionId => "session-1";
        public int HeartbeatIntervalSeconds => 10;
        public TimeSpan ClockDrift => TimeSpan.Zero;
        public List<CloudMessage> SentMessages { get; } = [];

        public Task RunAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DisconnectAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task SendAsync(CloudMessage message, CancellationToken cancellationToken)
        {
            SentMessages.Add(message);
            return Task.CompletedTask;
        }
        public Task SendBinaryAsync(string filePath, string contentType, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task SendExtensionManifestAsync(object manifest, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeTaskManager : ITaskManager
    {
        public bool StopAllUserTasksCalled
        {
            get; private set;
        }

        public IReadOnlyList<EngineTaskBase> RunningTasks => [];
        public IReadOnlyList<EngineTaskBase> AllTasks => [];

        public EngineTaskBase? GetTask(string taskId) => null;
        public Task<string> StartLiveTaskAsync(object config, CancellationToken cancellationToken) => Task.FromResult("live");
        public Task StopLiveTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string> StartBacktestTaskAsync(object input, CancellationToken cancellationToken) => Task.FromResult("bt");
        public Task CancelBacktestTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string> StartOptimizationTaskAsync(object config, CancellationToken cancellationToken) => Task.FromResult("opt");
        public Task CancelOptimizationTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<global::Kernel.Optimization.ComputationCheckpoint> StepComputationAsync(string taskId, int generations, CancellationToken cancellationToken) =>
            throw new NotImplementedException();
        public Task<global::Kernel.Optimization.ComputationCheckpoint> GetCheckpointAsync(string taskId, CancellationToken cancellationToken) =>
            throw new NotImplementedException();
        public Task<global::Kernel.Optimization.ComputationCheckpoint> SetCheckpointAsync(string taskId, global::Kernel.Optimization.ComputationCheckpoint checkpoint, string? reason, CancellationToken cancellationToken) =>
            throw new NotImplementedException();
        public Task<string?> RestoreOptimizationTaskAsync(OptimizationState state, CancellationToken cancellationToken) => Task.FromResult<string?>("opt");
        public Task PauseTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ResumeTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> GetTaskStateAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object>(new object());
        public Task<object?> GetTaskResultAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object?>(null);
        public Task<object?> GetOptimizationResultAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object?>(null);
        public Task StopAllTasksAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task StopAllUserTasksAsync(CancellationToken cancellationToken)
        {
            StopAllUserTasksCalled = true;
            return Task.CompletedTask;
        }
        public Task InjectGenesAsync(string taskId, double[] genes, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> GetLiveStateAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object>(new object());
        public Task StopAllLiveTasksAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public DateTime? GetLastLiveTickTimestamp() => null;
        public Task<string?> RestoreLiveTaskAsync(LiveState state, CancellationToken cancellationToken) => Task.FromResult<string?>("live");
    }

    private sealed class FakeExtensionManager : IExtensionManager
    {
        public Sdk.Slots.Adapter.IAdapterCapability? ActiveAdapter => null;
        public Sdk.Slots.Strategy.IStrategyCapability? ActiveStrategy => null;
        public Sdk.Slots.NeuralNetwork.INeuralNetworkModel? ActiveNeuralNetwork => null;
        public IHookRegistry HookRegistry { get; } = new global::Kernel.Hooks.HookRegistry();

        public Task DiscoverExtensionsAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ReloadExtensionsAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ActivateExtensionsAsync(string adapterName, string strategyName, string? nnModelName, string[] hookPluginNames, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeployExtensionAsync(string name, byte[] packageBytes, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task RemoveExtensionAsync(string name, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> GetManifestAsync(CancellationToken cancellationToken) => Task.FromResult<object>(new object());
        public Sdk.Slots.Strategy.IStrategyCapability? CreateTransientStrategy(string strategyName) => null;
        public Sdk.Slots.Adapter.IAdapterCapability? CreateTransientAdapter(string adapterName) => null;
        public void EnableBehaviorLoggingOnStrategy(string sessionId, int snapshotIntervalSeconds = 10)
        {
        }
        public void DisableBehaviorLoggingOnStrategy()
        {
        }
        public void RecordSnapshotOnStrategy()
        {
        }
    }

    private sealed class FakeCronJobManager : ICronJobManager
    {
        public Task SetCronJobAsync(string jobId, string cronExpression, string command, bool enabled, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeleteCronJobAsync(string jobId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> ListCronJobsAsync(CancellationToken cancellationToken) => Task.FromResult<object>(Array.Empty<object>());
        public Task SetScheduleAsync(string scheduleId, DateTime scheduledTimeUtc, string command, bool repeat, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeleteScheduleAsync(string scheduleId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> ListSchedulesAsync(CancellationToken cancellationToken) => Task.FromResult<object>(Array.Empty<object>());
    }

    private sealed class FakeTelemetry : IEngineTelemetry
    {
        public void SetConnectionState(bool isConnected)
        {
        }
        public void RecordStartup()
        {
        }
        public void RecordCommandExecution(int commandId, long durationMs)
        {
        }
        public void RecordTaskStart(string taskType)
        {
        }
        public void RecordTaskCompletion(string taskType, bool success)
        {
        }
        public void RecordLiveTickAge(long ageTicks)
        {
        }
        public object GetMetricsSnapshot() => new object();
    }

    private sealed class FakeStateManager : IStateManager
    {
        public string EngineId { get; private set; } = "engine-1";
        public void SetEngineId(string engineId) => this.EngineId = engineId;
        public Task DeleteLiveStateAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task SetSessionIdAsync(string sessionId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task LoadStateAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task SaveStateAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task SaveLiveStateAsync(LiveState liveState, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<LiveState?> LoadLiveStateAsync(CancellationToken cancellationToken) => Task.FromResult<LiveState?>(null);
        public Task SaveOptimizationStateAsync(string optimizationId, OptimizationState state, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<OptimizationState?> LoadOptimizationStateAsync(string optimizationId, CancellationToken cancellationToken) => Task.FromResult<OptimizationState?>(null);
        public Task SaveCronJobAsync(CronJob job, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeleteCronJobAsync(string jobId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<List<CronJob>> LoadCronJobsAsync(CancellationToken cancellationToken) => Task.FromResult<List<CronJob>>([]);
        public Task SaveScheduleAsync(Schedule schedule, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeleteScheduleAsync(string scheduleId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<List<Schedule>> LoadSchedulesAsync(CancellationToken cancellationToken) => Task.FromResult<List<Schedule>>([]);
        public Task SaveExtensionManifestAsync(object manifest, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object?> LoadExtensionManifestAsync(CancellationToken cancellationToken) => Task.FromResult<object?>(new object());
        public Task SetMetadataAsync(string key, string value, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string?> GetMetadataAsync(string key, CancellationToken cancellationToken) => Task.FromResult<string?>(null);
        public Task EnqueueOutgoingMessageAsync(string messageType, string payloadJson, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<IReadOnlyList<QueuedMessage>> GetPendingOutgoingMessagesAsync(CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<QueuedMessage>>([]);
        public Task DeleteOutgoingMessageAsync(long id, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeBehaviorRecorder : Sdk.Shared.IBehaviorRecorder
    {
        public bool IsEnabled => false;
        public void Record(Sdk.Shared.BehaviorRecord record)
        {
        }
    }
}
