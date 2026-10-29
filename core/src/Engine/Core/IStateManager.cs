// -----------------------------------------------------------------------------
// <copyright file="IStateManager.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.Core;

/// <summary>Represents a cron job.</summary>
internal sealed record CronJob(string JobId, string CronExpression, string Command, bool Enabled);

/// <summary>Represents a one‑off schedule.</summary>
internal sealed record Schedule(string ScheduleId, DateTime ScheduledTimeUtc, string Command, bool Repeat);

/// <summary>Represents an outgoing transactional outbox message.</summary>
internal sealed record QueuedMessage(long Id, string MessageType, string PayloadJson, DateTime CreatedAtUtc);

/// <summary>Manages persistence of engine state using SQLite.</summary>
internal interface IStateManager
{
    /// <summary>Gets the engine's unique ID.</summary>
    string EngineId { get; }

    /// <summary>Sets the engine's unique ID.</summary>
    void SetEngineId(string engineId);

    /// <summary>Deletes the live trading state.</summary>
    Task DeleteLiveStateAsync(CancellationToken cancellationToken);

    /// <summary>Sets the current session ID.</summary>
    Task SetSessionIdAsync(string sessionId, CancellationToken cancellationToken);

    /// <summary>Loads all state from the database.</summary>
    Task LoadStateAsync(CancellationToken cancellationToken);

    /// <summary>Persists all current state to the database.</summary>
    Task SaveStateAsync(CancellationToken cancellationToken);

    /// <summary>Saves live trading state.</summary>
    Task SaveLiveStateAsync(LiveState liveState, CancellationToken cancellationToken);

    /// <summary>Loads live trading state.</summary>
    Task<LiveState?> LoadLiveStateAsync(CancellationToken cancellationToken);

    /// <summary>Saves an optimization state snapshot.</summary>
    Task SaveOptimizationStateAsync(string optimizationId, OptimizationState state, CancellationToken cancellationToken);

    /// <summary>Loads an optimization state snapshot.</summary>
    Task<OptimizationState?> LoadOptimizationStateAsync(string optimizationId, CancellationToken cancellationToken);

    /// <summary>Saves a cron job.</summary>
    Task SaveCronJobAsync(CronJob job, CancellationToken cancellationToken);

    /// <summary>Deletes a cron job.</summary>
    Task DeleteCronJobAsync(string jobId, CancellationToken cancellationToken);

    /// <summary>Loads all cron jobs.</summary>
    Task<List<CronJob>> LoadCronJobsAsync(CancellationToken cancellationToken);

    /// <summary>Saves a one‑off schedule.</summary>
    Task SaveScheduleAsync(Schedule schedule, CancellationToken cancellationToken);

    /// <summary>Deletes a schedule.</summary>
    Task DeleteScheduleAsync(string scheduleId, CancellationToken cancellationToken);

    /// <summary>Loads all schedules.</summary>
    Task<List<Schedule>> LoadSchedulesAsync(CancellationToken cancellationToken);

    /// <summary>Saves the extension manifest.</summary>
    Task SaveExtensionManifestAsync(object manifest, CancellationToken cancellationToken);

    /// <summary>Loads the extension manifest.</summary>
    Task<object?> LoadExtensionManifestAsync(CancellationToken cancellationToken);

    /// <summary>Sets an arbitrary metadata key-value pair (e.g. Admin Configs).</summary>
    Task SetMetadataAsync(string key, string value, CancellationToken cancellationToken);

    /// <summary>Gets an arbitrary metadata value.</summary>
    Task<string?> GetMetadataAsync(string key, CancellationToken cancellationToken);

    /// <summary>Enqueues an outgoing message to be sent later.</summary>
    Task EnqueueOutgoingMessageAsync(string messageType, string payloadJson, CancellationToken cancellationToken);

    /// <summary>Gets all pending outgoing messages.</summary>
    Task<IReadOnlyList<QueuedMessage>> GetPendingOutgoingMessagesAsync(CancellationToken cancellationToken);

    /// <summary>Deletes a queued message by ID.</summary>
    Task DeleteOutgoingMessageAsync(long id, CancellationToken cancellationToken);
}
