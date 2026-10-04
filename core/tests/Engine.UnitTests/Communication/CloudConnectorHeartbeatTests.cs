// -----------------------------------------------------------------------------
// <copyright file="CloudConnectorHeartbeatTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.UnitTests.Communication;

using System.Globalization;
using System.Text.Json;
using Engine.Communication;
using Engine.Core;
using Engine.Management.Commands;
using Engine.Management.Tasks;
using Engine.Services.Update;
using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Unit tests verifying protocol conformance of Heartbeat handling in <see cref="CloudConnector"/> (002-020-020 §3.4).
/// Tests cover dynamic heartbeat interval pacing, clock drift synchronization, and auth invalidation.
/// </summary>
public sealed class CloudConnectorHeartbeatTests : IAsyncDisposable
{
    private readonly CloudConnector _connector;
    private readonly FakeTelemetry _telemetry = new();
    private readonly FakeStateManager _stateManager = new();
    private readonly FakeTaskManager _taskManager = new();
    private readonly FakeSecurityManager _securityManager = new();
    private readonly FakeSelfUpdateManager _selfUpdateManager = new();
    private readonly BinaryTransferManager _transferManager = new(NullLogger<BinaryTransferManager>.Instance);

    public CloudConnectorHeartbeatTests()
    {
        _connector = new CloudConnector(
            NullLogger<CloudConnector>.Instance,
            _securityManager,
            _telemetry,
            _stateManager,
            _taskManager,
            _transferManager,
            _selfUpdateManager);
    }

    public async ValueTask DisposeAsync()
    {
        await _connector.DisposeAsync().ConfigureAwait(false);
        _transferManager.Dispose();
    }

    [Fact]
    public async Task HandleHeartbeatResponse_PrimaryPath_UpdatesIntervalAndClockDrift()
    {
        // Arrange
        DateTime serverTime = DateTime.UtcNow.AddSeconds(15);
        var payload = new Dictionary<string, object>
        {
            ["Status"] = "OK",
            ["NextIntervalSeconds"] = 45,
            ["ServerTime"] = serverTime
        };
        var message = new CloudMessage
        {
            MessageType = "HeartbeatResponse",
            Payload = payload
        };

        // Act
        await _connector.HandleHeartbeatResponseAsync(message, CancellationToken.None);

        // Assert
        Assert.Equal(45, _connector.HeartbeatIntervalSeconds);
        Assert.True(_connector.ClockDrift.TotalSeconds >= 13.0 && _connector.ClockDrift.TotalSeconds <= 17.0,
            $"Expected ~15s drift, got {_connector.ClockDrift.TotalSeconds}s");
    }

    [Fact]
    public async Task HandleHeartbeatResponse_PrimaryPath_ParsesIsoStringTimestampAndNumber()
    {
        // Arrange
        var payload = new Dictionary<string, object>
        {
            ["Status"] = "OK",
            ["NextIntervalSeconds"] = "60",
            ["ServerTime"] = DateTimeOffset.UtcNow.AddMinutes(5).ToString("O")
        };
        var message = new CloudMessage
        {
            MessageType = "HeartbeatResponse",
            Payload = payload
        };

        // Act
        await _connector.HandleHeartbeatResponseAsync(message, CancellationToken.None);

        // Assert
        Assert.Equal(60, _connector.HeartbeatIntervalSeconds);
        Assert.True(_connector.ClockDrift.TotalMinutes >= 4.8 && _connector.ClockDrift.TotalMinutes <= 5.2,
            $"Expected ~5min drift, got {_connector.ClockDrift.TotalMinutes}min");
    }

    [Fact]
    public async Task HandleHeartbeatResponse_BoundaryPath_AcceptsMinimumAndLargeIntervals()
    {
        // Boundary: 1 second minimum interval
        var payload1 = new Dictionary<string, object>
        {
            ["NextIntervalSeconds"] = 1
        };
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payload1 }, CancellationToken.None);
        Assert.Equal(1, _connector.HeartbeatIntervalSeconds);

        // Boundary: 3600 seconds (1 hour)
        var payload3600 = new Dictionary<string, object>
        {
            ["NextIntervalSeconds"] = 3600
        };
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payload3600 }, CancellationToken.None);
        Assert.Equal(3600, _connector.HeartbeatIntervalSeconds);
    }

    [Fact]
    public async Task HandleHeartbeatResponse_BoundaryPath_HandlesJsonElementValues()
    {
        // Arrange
        using var doc = JsonDocument.Parse("{\"NextIntervalSeconds\": 25, \"ServerTime\": \"2026-10-03T12:00:00Z\"}");
        var payload = new Dictionary<string, object>
        {
            ["NextIntervalSeconds"] = doc.RootElement.GetProperty("NextIntervalSeconds"),
            ["ServerTime"] = doc.RootElement.GetProperty("ServerTime")
        };
        var message = new CloudMessage
        {
            MessageType = "HeartbeatResponse",
            Payload = payload
        };

        // Act
        await _connector.HandleHeartbeatResponseAsync(message, CancellationToken.None);

        // Assert
        Assert.Equal(25, _connector.HeartbeatIntervalSeconds);
        Assert.NotEqual(TimeSpan.Zero, _connector.ClockDrift);
    }

    [Fact]
    public async Task HandleHeartbeatResponse_BoundaryPath_HandlesLongAndJsonTypes()
    {
        // 1. Long positive
        var payloadLong = new Dictionary<string, object> { ["NextIntervalSeconds"] = 120L };
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadLong }, CancellationToken.None);
        Assert.Equal(120, _connector.HeartbeatIntervalSeconds);

        // 2. Long negative (ignored)
        var payloadLongNeg = new Dictionary<string, object> { ["NextIntervalSeconds"] = -5L };
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadLongNeg }, CancellationToken.None);
        Assert.Equal(120, _connector.HeartbeatIntervalSeconds);

        // 3. Long overflow (ignored)
        var payloadLongOver = new Dictionary<string, object> { ["NextIntervalSeconds"] = (long)int.MaxValue + 100L };
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadLongOver }, CancellationToken.None);
        Assert.Equal(120, _connector.HeartbeatIntervalSeconds);

        // 4. JsonElement string number
        using var doc = JsonDocument.Parse("{\"strInterval\": \"90\", \"negInterval\": -5, \"boolVal\": true}");
        var payloadJsonStr = new Dictionary<string, object> { ["NextIntervalSeconds"] = doc.RootElement.GetProperty("strInterval") };
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadJsonStr }, CancellationToken.None);
        Assert.Equal(90, _connector.HeartbeatIntervalSeconds);

        // 5. JsonElement negative number (ignored)
        var payloadJsonNeg = new Dictionary<string, object> { ["NextIntervalSeconds"] = doc.RootElement.GetProperty("negInterval") };
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadJsonNeg }, CancellationToken.None);
        Assert.Equal(90, _connector.HeartbeatIntervalSeconds);

        // 6. JsonElement boolean (ignored)
        var payloadJsonBool = new Dictionary<string, object> { ["NextIntervalSeconds"] = doc.RootElement.GetProperty("boolVal") };
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadJsonBool }, CancellationToken.None);
        Assert.Equal(90, _connector.HeartbeatIntervalSeconds);

        // 7. Non-numeric string (ignored)
        var payloadInvalidStr = new Dictionary<string, object> { ["NextIntervalSeconds"] = "not-a-number" };
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadInvalidStr }, CancellationToken.None);
        Assert.Equal(90, _connector.HeartbeatIntervalSeconds);
    }

    [Fact]
    public async Task HandleHeartbeatResponse_BoundaryPath_HandlesDateTimeVariants()
    {
        // 1. Direct DateTimeOffset
        DateTimeOffset directDto = DateTimeOffset.UtcNow.AddSeconds(1);
        var payloadDto = new Dictionary<string, object> { ["ServerTime"] = directDto };
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadDto }, CancellationToken.None);
        Assert.True(_connector.ClockDrift.TotalSeconds <= 2.0, "Small drift (<= 2s) branch");

        // 2. Non-UTC DateTime
        DateTime nonUtc = DateTime.SpecifyKind(DateTime.UtcNow.AddSeconds(5), DateTimeKind.Local);
        var payloadNonUtc = new Dictionary<string, object> { ["ServerTime"] = nonUtc };
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadNonUtc }, CancellationToken.None);
        Assert.True(_connector.ClockDrift.TotalSeconds > 2.0, "Drift > 2s triggers warning branch");

        // 3. JsonElement non-string server time (ignored)
        using var doc = JsonDocument.Parse("{\"invalidTime\": 12345}");
        var payloadJsonInvalid = new Dictionary<string, object> { ["ServerTime"] = doc.RootElement.GetProperty("invalidTime") };
        TimeSpan prevDrift = _connector.ClockDrift;
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadJsonInvalid }, CancellationToken.None);
        Assert.Equal(prevDrift, _connector.ClockDrift);

        // 4. Empty/whitespace string server time (ignored)
        var payloadWhitespace = new Dictionary<string, object> { ["ServerTime"] = "   " };
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadWhitespace }, CancellationToken.None);
        Assert.Equal(prevDrift, _connector.ClockDrift);
    }

    [Fact]
    public async Task HandleHeartbeatResponse_NegativePath_IgnoresZeroOrNegativeInterval()
    {
        // Arrange
        int originalInterval = _connector.HeartbeatIntervalSeconds;
        var payloadZero = new Dictionary<string, object> { ["NextIntervalSeconds"] = 0 };
        var payloadNegative = new Dictionary<string, object> { ["NextIntervalSeconds"] = -10 };

        // Act
        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadZero }, CancellationToken.None);
        Assert.Equal(originalInterval, _connector.HeartbeatIntervalSeconds);

        await _connector.HandleHeartbeatResponseAsync(new CloudMessage { MessageType = "HeartbeatResponse", Payload = payloadNegative }, CancellationToken.None);
        Assert.Equal(originalInterval, _connector.HeartbeatIntervalSeconds);
    }

    [Fact]
    public async Task HandleHeartbeatResponse_NegativePath_HandlesMalformedServerTimeGracefully()
    {
        // Arrange
        var payload = new Dictionary<string, object>
        {
            ["NextIntervalSeconds"] = 30,
            ["ServerTime"] = "not-a-valid-date-time"
        };
        var message = new CloudMessage
        {
            MessageType = "HeartbeatResponse",
            Payload = payload
        };

        // Act & Assert - should not throw and should still update interval
        await _connector.HandleHeartbeatResponseAsync(message, CancellationToken.None);
        Assert.Equal(30, _connector.HeartbeatIntervalSeconds);
        Assert.Equal(TimeSpan.Zero, _connector.ClockDrift);
    }

    [Fact]
    public async Task HandleHeartbeatResponse_NegativePath_AuthValidFalseTriggersEmergencyStop()
    {
        // Arrange
        CloudCommand? receivedCommand = null;
        _connector.CommandReceived += cmd =>
        {
            receivedCommand = cmd;
            return Task.CompletedTask;
        };

        var payload = new Dictionary<string, object>
        {
            ["Status"] = "OK",
            ["AuthValid"] = false
        };
        var message = new CloudMessage
        {
            MessageType = "HeartbeatResponse",
            Payload = payload
        };

        // Act
        await _connector.HandleHeartbeatResponseAsync(message, CancellationToken.None);

        // Assert
        Assert.NotNull(receivedCommand);
        Assert.Equal(CommandIds.EmergencyStop, receivedCommand.CommandId);
        Assert.Equal("EmergencyStop", receivedCommand.CommandType);
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
        public object GetMetricsSnapshot() => new();
    }

    private sealed class FakeStateManager : IStateManager
    {
        public string EngineId => "test-engine-id";
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
        public Task<List<CronJob>> LoadCronJobsAsync(CancellationToken cancellationToken) => Task.FromResult(new List<CronJob>());
        public Task SaveScheduleAsync(Schedule schedule, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeleteScheduleAsync(string scheduleId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<List<Schedule>> LoadSchedulesAsync(CancellationToken cancellationToken) => Task.FromResult(new List<Schedule>());
        public Task SaveExtensionManifestAsync(object manifest, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object?> LoadExtensionManifestAsync(CancellationToken cancellationToken) => Task.FromResult<object?>(null);
        public Task SetMetadataAsync(string key, string value, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string?> GetMetadataAsync(string key, CancellationToken cancellationToken) => Task.FromResult<string?>(null);
        public Task EnqueueOutgoingMessageAsync(string messageType, string payloadJson, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<IReadOnlyList<QueuedMessage>> GetPendingOutgoingMessagesAsync(CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<QueuedMessage>>([]);
        public Task DeleteOutgoingMessageAsync(long id, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeTaskManager : ITaskManager
    {
        public IReadOnlyList<EngineTaskBase> RunningTasks => [];
        public IReadOnlyList<EngineTaskBase> AllTasks => [];
        public EngineTaskBase? GetTask(string taskId) => null;
        public DateTime? GetLastLiveTickTimestamp() => null;
        public Task<string> StartLiveTaskAsync(object config, CancellationToken cancellationToken) => Task.FromResult("live-1");
        public Task StopLiveTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string> StartBacktestTaskAsync(object input, CancellationToken cancellationToken) => Task.FromResult("backtest-1");
        public Task CancelBacktestTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string> StartOptimizationTaskAsync(object config, CancellationToken cancellationToken) => Task.FromResult("opt-1");
        public Task CancelOptimizationTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task PauseTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ResumeTaskAsync(string taskId, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> GetTaskStateAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object>(new());
        public Task<object?> GetTaskResultAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object?>(null);
        public Task<object?> GetOptimizationResultAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object?>(null);
        public Task StopAllTasksAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task StopAllUserTasksAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task InjectGenesAsync(string taskId, double[] genes, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<object> GetLiveStateAsync(string taskId, CancellationToken cancellationToken) => Task.FromResult<object>(new());
        public Task StopAllLiveTasksAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<string?> RestoreLiveTaskAsync(LiveState state, CancellationToken cancellationToken) => Task.FromResult<string?>("live-restored");
        public Task<global::Kernel.Optimization.ComputationCheckpoint> StepComputationAsync(string taskId, int generations, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<global::Kernel.Optimization.ComputationCheckpoint> GetCheckpointAsync(string taskId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<global::Kernel.Optimization.ComputationCheckpoint> SetCheckpointAsync(string taskId, global::Kernel.Optimization.ComputationCheckpoint checkpoint, string? reason, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<string?> RestoreOptimizationTaskAsync(OptimizationState state, CancellationToken cancellationToken) => Task.FromResult<string?>("opt-restored");
    }

    private sealed class FakeSecurityManager : ISecurityManager
    {
        public string GetPublicKey() => "public-key";
        public void SetCloudPublicKey(string cloudPublicKey)
        {
        }
        public void SetNonce(string nonce)
        {
        }
        public void DeriveSharedSecret()
        {
        }
        public string EncryptMessage(string plainText) => plainText;
        public string DecryptMessage(string cipherText) => cipherText;
        public string GenerateChallenge(string nonce) => "challenge";
        public bool VerifyIntegrity() => true;
        public bool IsDebuggerAttached() => false;
        public ulong GetNextSequenceNumber() => 1UL;
    }

    private sealed class FakeSelfUpdateManager : ISelfUpdateManager
    {
        public bool IsUpdateAvailable => false;
        public (string Version, Uri DownloadUrl, string Checksum)? PendingUpdate => null;
        public void CheckForUpdate(string version, Uri downloadUrl, string checksum)
        {
        }
        public Task InstallUpdateAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task RollbackAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task FinalizeUpdateAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
