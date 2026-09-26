// -----------------------------------------------------------------------------
// <copyright file="StubEngineServices.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.IntegrationTests.TestSupport;

using Engine.Core;
using Engine.Management.Tasks;
using Engine.Services.Update;

/// <summary>
/// Records the connection state the connector reports instead of exporting a metric.
/// </summary>
internal sealed class StubTelemetry : IEngineTelemetry
{
    /// <summary>Gets the last connection state reported, or <see langword="null"/> if none was.</summary>
    internal bool? ConnectionState { get; private set; }

    /// <inheritdoc/>
    public void SetConnectionState(bool isConnected) => this.ConnectionState = isConnected;

    /// <inheritdoc/>
    public void RecordStartup()
    {
    }

    /// <inheritdoc/>
    public void RecordCommandExecution(int commandId, long durationMs)
    {
    }

    /// <inheritdoc/>
    public void RecordTaskStart(string taskType)
    {
    }

    /// <inheritdoc/>
    public void RecordTaskCompletion(string taskType, bool success)
    {
    }

    /// <inheritdoc/>
    public void RecordLiveTickAge(long ageTicks)
    {
    }

    /// <inheritdoc/>
    public object GetMetricsSnapshot() => new();
}

/// <summary>
/// Keeps the session identifier the connector persists, and nothing else: the tests that need it assert on
/// what the Engine stored, so this is the one member that has to remember anything.
/// </summary>
internal sealed class StubStateManager : IStateManager
{
    /// <summary>Gets the session identifier the connector persisted.</summary>
    internal string? SessionId { get; private set; }

    /// <inheritdoc/>
    public string EngineId => "engine-under-test";

    /// <inheritdoc/>
    public Task SetSessionIdAsync(string sessionId, CancellationToken cancellationToken)
    {
        this.SessionId = sessionId;
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public Task<IReadOnlyList<QueuedMessage>> GetPendingOutgoingMessagesAsync(CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<QueuedMessage>>([]);

    /// <inheritdoc/>
    public Task DeleteOutgoingMessageAsync(long id, CancellationToken cancellationToken) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task EnqueueOutgoingMessageAsync(string messageType, string payloadJson, CancellationToken cancellationToken) =>
        Task.CompletedTask;

    /// <inheritdoc/>
    public Task DeleteLiveStateAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(DeleteLiveStateAsync));

    /// <inheritdoc/>
    public Task LoadStateAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(LoadStateAsync));

    /// <inheritdoc/>
    public Task SaveStateAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(SaveStateAsync));

    /// <inheritdoc/>
    public Task SaveLiveStateAsync(LiveState liveState, CancellationToken cancellationToken) => throw NotUsed(nameof(SaveLiveStateAsync));

    /// <inheritdoc/>
    public Task<LiveState?> LoadLiveStateAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(LoadLiveStateAsync));

    /// <inheritdoc/>
    public Task SaveOptimizationStateAsync(string optimizationId, OptimizationState state, CancellationToken cancellationToken) =>
        throw NotUsed(nameof(SaveOptimizationStateAsync));

    /// <inheritdoc/>
    public Task<OptimizationState?> LoadOptimizationStateAsync(string optimizationId, CancellationToken cancellationToken) =>
        throw NotUsed(nameof(LoadOptimizationStateAsync));

    /// <inheritdoc/>
    public Task SaveCronJobAsync(CronJob job, CancellationToken cancellationToken) => throw NotUsed(nameof(SaveCronJobAsync));

    /// <inheritdoc/>
    public Task DeleteCronJobAsync(string jobId, CancellationToken cancellationToken) => throw NotUsed(nameof(DeleteCronJobAsync));

    /// <inheritdoc/>
    public Task<List<CronJob>> LoadCronJobsAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(LoadCronJobsAsync));

    /// <inheritdoc/>
    public Task SaveScheduleAsync(Schedule schedule, CancellationToken cancellationToken) => throw NotUsed(nameof(SaveScheduleAsync));

    /// <inheritdoc/>
    public Task DeleteScheduleAsync(string scheduleId, CancellationToken cancellationToken) => throw NotUsed(nameof(DeleteScheduleAsync));

    /// <inheritdoc/>
    public Task<List<Schedule>> LoadSchedulesAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(LoadSchedulesAsync));

    /// <inheritdoc/>
    public Task SaveExtensionManifestAsync(object manifest, CancellationToken cancellationToken) => throw NotUsed(nameof(SaveExtensionManifestAsync));

    /// <inheritdoc/>
    public Task<object?> LoadExtensionManifestAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(LoadExtensionManifestAsync));

    /// <inheritdoc/>
    public Task SetMetadataAsync(string key, string value, CancellationToken cancellationToken) => throw NotUsed(nameof(SetMetadataAsync));

    /// <inheritdoc/>
    public Task<string?> GetMetadataAsync(string key, CancellationToken cancellationToken) => throw NotUsed(nameof(GetMetadataAsync));

    /// <summary>Builds the failure for a member the connector's inbound path never reaches.</summary>
    /// <param name="member">The member name.</param>
    /// <returns>The exception to throw.</returns>
    private static NotSupportedException NotUsed(string member) =>
        new NotSupportedException($"StubStateManager.{member} is not part of the connector's inbound path.");
}

/// <summary>
/// Reports the two task facts a heartbeat reads, and fails loudly for anything else.
/// </summary>
internal sealed class StubTaskManager : ITaskManager
{
    /// <inheritdoc/>
    public IReadOnlyList<EngineTaskBase> RunningTasks => [];

    /// <inheritdoc/>
    public IReadOnlyList<EngineTaskBase> AllTasks => [];

    /// <inheritdoc/>
    public EngineTaskBase? GetTask(string taskId) => null;

    /// <inheritdoc/>
    public DateTime? GetLastLiveTickTimestamp() => null;

    /// <inheritdoc/>
    public Task<string> StartLiveTaskAsync(object config, CancellationToken cancellationToken) => throw NotUsed(nameof(StartLiveTaskAsync));

    /// <inheritdoc/>
    public Task StopLiveTaskAsync(string taskId, CancellationToken cancellationToken) => throw NotUsed(nameof(StopLiveTaskAsync));

    /// <inheritdoc/>
    public Task<string> StartBacktestTaskAsync(object input, CancellationToken cancellationToken) => throw NotUsed(nameof(StartBacktestTaskAsync));

    /// <inheritdoc/>
    public Task CancelBacktestTaskAsync(string taskId, CancellationToken cancellationToken) => throw NotUsed(nameof(CancelBacktestTaskAsync));

    /// <inheritdoc/>
    public Task<string> StartOptimizationTaskAsync(object config, CancellationToken cancellationToken) => throw NotUsed(nameof(StartOptimizationTaskAsync));

    /// <inheritdoc/>
    public Task CancelOptimizationTaskAsync(string taskId, CancellationToken cancellationToken) => throw NotUsed(nameof(CancelOptimizationTaskAsync));

    /// <inheritdoc/>
    public Task PauseTaskAsync(string taskId, CancellationToken cancellationToken) => throw NotUsed(nameof(PauseTaskAsync));

    /// <inheritdoc/>
    public Task ResumeTaskAsync(string taskId, CancellationToken cancellationToken) => throw NotUsed(nameof(ResumeTaskAsync));

    /// <inheritdoc/>
    public Task<object> GetTaskStateAsync(string taskId, CancellationToken cancellationToken) => throw NotUsed(nameof(GetTaskStateAsync));

    /// <inheritdoc/>
    public Task<object> GetOptimizationResultAsync(string taskId, CancellationToken cancellationToken) => throw NotUsed(nameof(GetOptimizationResultAsync));

    /// <inheritdoc/>
    public Task StopAllTasksAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(StopAllTasksAsync));

    /// <inheritdoc/>
    public Task StopAllUserTasksAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(StopAllUserTasksAsync));

    /// <inheritdoc/>
    public Task InjectGenesAsync(string taskId, double[] genes, CancellationToken cancellationToken) => throw NotUsed(nameof(InjectGenesAsync));

    /// <inheritdoc/>
    public Task<object> GetLiveStateAsync(string taskId, CancellationToken cancellationToken) => throw NotUsed(nameof(GetLiveStateAsync));

    /// <inheritdoc/>
    public Task StopAllLiveTasksAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(StopAllLiveTasksAsync));

    /// <inheritdoc/>
    public Task<string?> RestoreLiveTaskAsync(LiveState state, CancellationToken cancellationToken) => throw NotUsed(nameof(RestoreLiveTaskAsync));

    /// <summary>Builds the failure for a member the connector's inbound path never reaches.</summary>
    /// <param name="member">The member name.</param>
    /// <returns>The exception to throw.</returns>
    private static NotSupportedException NotUsed(string member) =>
        new NotSupportedException($"StubTaskManager.{member} is not part of the connector's inbound path.");
}

/// <summary>
/// Records an update the Cloud offers in a heartbeat response, and never reports one as installable so that
/// nothing tries to replace the engine binary from a unit test.
/// </summary>
internal sealed class StubSelfUpdateManager : ISelfUpdateManager
{
    /// <summary>Gets the update the connector offered, if it offered one.</summary>
    internal (string Version, Uri DownloadUrl, string Checksum)? Offered { get; private set; }

    /// <inheritdoc/>
    public bool IsUpdateAvailable => false;

    /// <inheritdoc/>
    public (string Version, Uri DownloadUrl, string Checksum)? PendingUpdate => this.Offered;

    /// <inheritdoc/>
    public void CheckForUpdate(string version, Uri downloadUrl, string checksum) =>
        this.Offered = (version, downloadUrl, checksum);

    /// <inheritdoc/>
    public Task InstallUpdateAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(InstallUpdateAsync));

    /// <inheritdoc/>
    public Task RollbackAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(RollbackAsync));

    /// <inheritdoc/>
    public Task FinalizeUpdateAsync(CancellationToken cancellationToken) => throw NotUsed(nameof(FinalizeUpdateAsync));

    /// <summary>Builds the failure for reaching an installation an update must never trigger.</summary>
    /// <param name="member">The member name.</param>
    /// <returns>The exception to throw.</returns>
    private static NotSupportedException NotUsed(string member) =>
        new NotSupportedException($"StubSelfUpdateManager.{member} must not be reached by a test.");
}
