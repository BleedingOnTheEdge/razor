// -----------------------------------------------------------------------------
// <copyright file="StateManagerTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.UnitTests.Core;

using System;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Engine.Core;
using global::Kernel.Optimization;
using Xunit;

public sealed class StateManagerTests : IDisposable
{
    private readonly string _tempDbPath;

    public StateManagerTests()
    {
        _tempDbPath = Path.Combine(Path.GetTempPath(), $"engine_state_test_{Guid.NewGuid():N}.db");
    }

    public void Dispose()
    {
        if (File.Exists(_tempDbPath))
        {
            try
            {
                File.Delete(_tempDbPath);
            }
            catch
            {
                // Ignore cleanup lock issues on temporary test files
            }
        }
    }

    [Fact]
    public void Constructor_InitializesDatabaseAndGeneratesEngineId()
    {
        using var manager = new StateManager(_tempDbPath);

        Assert.True(File.Exists(_tempDbPath));
        Assert.False(string.IsNullOrWhiteSpace(manager.EngineId));
        Assert.StartsWith("eng_", manager.EngineId, StringComparison.Ordinal);
    }

    [Fact]
    public void Constructor_LoadsExistingEngineId_WhenDatabaseExists()
    {
        string engineId1;
        using (var manager1 = new StateManager(_tempDbPath))
        {
            engineId1 = manager1.EngineId;
        }

        using (var manager2 = new StateManager(_tempDbPath))
        {
            Assert.Equal(engineId1, manager2.EngineId);
        }
    }

    [Fact]
    public async Task Metadata_SetAndGet_PersistsKeyValuePairs()
    {
        using var manager = new StateManager(_tempDbPath);

        await manager.SetMetadataAsync("CustomConfig", "Value123", CancellationToken.None);
        var retrieved = await manager.GetMetadataAsync("CustomConfig", CancellationToken.None);

        Assert.Equal("Value123", retrieved);

        var nonexistent = await manager.GetMetadataAsync("NotFoundKey", CancellationToken.None);
        Assert.Null(nonexistent);
    }

    [Fact]
    public async Task SessionId_SetAndGet_PersistsThroughMetadata()
    {
        using var manager = new StateManager(_tempDbPath);

        await manager.SetSessionIdAsync("session_xyz_789", CancellationToken.None);
        var retrieved = await manager.GetMetadataAsync("SessionId", CancellationToken.None);

        Assert.Equal("session_xyz_789", retrieved);
    }

    [Fact]
    public async Task LiveState_SaveLoadAndDelete_RoundTripsSuccessfully()
    {
        using var manager = new StateManager(_tempDbPath);

        var state = new LiveState
        {
            TaskId = "live_task_1",
            AdapterName = "MT5",
            StrategyName = "TrendFollower",
            Config = new { Param = "Value" },
            MagicNumber = 12345,
            Leverage = 50,
            InitialBalance = 10000,
            Symbols = ["EURUSD", "GBPUSD"],
            OrderGuardTimeoutSeconds = 5,
            StopOutLevel = 0.5,
            MaxOpenPositions = 10,
            Genes = [1.5, 2.5],
            StartTime = DateTime.UtcNow
        };

        // Save
        await manager.SaveLiveStateAsync(state, CancellationToken.None);

        // Load
        var loaded = await manager.LoadLiveStateAsync(CancellationToken.None);
        Assert.NotNull(loaded);
        Assert.Equal("live_task_1", loaded.TaskId);
        Assert.Equal("MT5", loaded.AdapterName);
        Assert.Equal("TrendFollower", loaded.StrategyName);
        Assert.Equal(12345, loaded.MagicNumber);
        Assert.Equal(50, loaded.Leverage);
        Assert.Equal(10000, loaded.InitialBalance);
        Assert.Equal(["EURUSD", "GBPUSD"], loaded.Symbols);
        Assert.Equal([1.5, 2.5], loaded.Genes);

        // Delete
        await manager.DeleteLiveStateAsync(CancellationToken.None);
        var afterDelete = await manager.LoadLiveStateAsync(CancellationToken.None);
        Assert.Null(afterDelete);
    }

    [Fact]
    public async Task OptimizationState_SaveAndLoad_RoundTripsState()
    {
        using var manager = new StateManager(_tempDbPath);

        var optState = new OptimizationState
        {
            TaskId = "opt_task_42",
            Config = new { Generations = 10 },
            CurrentGeneration = 5,
            BestFitness = 123.45,
            StartTime = DateTime.UtcNow,
            CheckpointFingerprint = "fingerprint_abc",
            Diverged = false,
            Interventions = Array.Empty<InterventionRecord>()
        };

        await manager.SaveOptimizationStateAsync("opt_task_42", optState, CancellationToken.None);

        var loaded = await manager.LoadOptimizationStateAsync("opt_task_42", CancellationToken.None);
        Assert.NotNull(loaded);
        Assert.Equal("opt_task_42", loaded.TaskId);
        Assert.Equal(5, loaded.CurrentGeneration);
        Assert.Equal(123.45, loaded.BestFitness);
        Assert.Equal("fingerprint_abc", loaded.CheckpointFingerprint);

        var missing = await manager.LoadOptimizationStateAsync("missing_task", CancellationToken.None);
        Assert.Null(missing);
    }

    [Fact]
    public async Task CronJobs_SaveLoadAndDelete_ManagesScheduledJobs()
    {
        using var manager = new StateManager(_tempDbPath);

        var job1 = new CronJob("job_1", "0 * * * *", "RunHealthCheck", true);
        var job2 = new CronJob("job_2", "*/5 * * * *", "SyncBalances", false);

        await manager.SaveCronJobAsync(job1, CancellationToken.None);
        await manager.SaveCronJobAsync(job2, CancellationToken.None);

        var jobs = await manager.LoadCronJobsAsync(CancellationToken.None);
        Assert.Equal(2, jobs.Count);
        Assert.Contains(jobs, j => j.JobId == "job_1" && j.Enabled && j.CronExpression == "0 * * * *");
        Assert.Contains(jobs, j => j.JobId == "job_2" && !j.Enabled && j.Command == "SyncBalances");

        // Delete job 1
        await manager.DeleteCronJobAsync("job_1", CancellationToken.None);
        var remaining = await manager.LoadCronJobsAsync(CancellationToken.None);
        Assert.Single(remaining);
        Assert.Equal("job_2", remaining[0].JobId);
    }

    [Fact]
    public async Task Schedules_SaveLoadAndDelete_ManagesOneOffSchedules()
    {
        using var manager = new StateManager(_tempDbPath);

        var schedTime = DateTime.UtcNow.AddHours(2);
        var sched1 = new Schedule("sched_1", schedTime, "CloseAllAtMarket", false);

        await manager.SaveScheduleAsync(sched1, CancellationToken.None);

        var schedules = await manager.LoadSchedulesAsync(CancellationToken.None);
        Assert.Single(schedules);
        Assert.Equal("sched_1", schedules[0].ScheduleId);
        Assert.Equal("CloseAllAtMarket", schedules[0].Command);
        Assert.False(schedules[0].Repeat);

        await manager.DeleteScheduleAsync("sched_1", CancellationToken.None);
        var empty = await manager.LoadSchedulesAsync(CancellationToken.None);
        Assert.Empty(empty);
    }

    [Fact]
    public async Task ExtensionManifest_SaveAndLoad_RoundTripsJsonManifest()
    {
        using var manager = new StateManager(_tempDbPath);

        var manifestData = new
        {
            Version = "1.0.0",
            Plugins = new[] { "PluginA", "PluginB" }
        };

        await manager.SaveExtensionManifestAsync(manifestData, CancellationToken.None);
        var loaded = await manager.LoadExtensionManifestAsync(CancellationToken.None);

        Assert.NotNull(loaded);
        string json = JsonSerializer.Serialize(loaded);
        Assert.Contains("PluginA", json, StringComparison.Ordinal);
        Assert.Contains("PluginB", json, StringComparison.Ordinal);
    }

    [Fact]
    public async Task QueuedMessages_OutboxPattern_EnqueueRetrieveAndDelete()
    {
        using var manager = new StateManager(_tempDbPath);

        await manager.EnqueueOutgoingMessageAsync("TelemetryReport", "{\"cpu\": 25.0}", CancellationToken.None);
        await manager.EnqueueOutgoingMessageAsync("OrderNotification", "{\"ticket\": 101}", CancellationToken.None);

        var pending = await manager.GetPendingOutgoingMessagesAsync(CancellationToken.None);
        Assert.Equal(2, pending.Count);

        Assert.Equal("TelemetryReport", pending[0].MessageType);
        Assert.Equal("{\"cpu\": 25.0}", pending[0].PayloadJson);
        Assert.Equal("OrderNotification", pending[1].MessageType);
        Assert.Equal("{\"ticket\": 101}", pending[1].PayloadJson);

        // Delete first queued message
        await manager.DeleteOutgoingMessageAsync(pending[0].Id, CancellationToken.None);

        var remaining = await manager.GetPendingOutgoingMessagesAsync(CancellationToken.None);
        Assert.Single(remaining);
        Assert.Equal(pending[1].Id, remaining[0].Id);
    }
}
