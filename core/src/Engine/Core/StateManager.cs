// -----------------------------------------------------------------------------
// <copyright file="StateManager.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

using Microsoft.Data.Sqlite;
using System.Globalization;
using System.Text.Json;

namespace Engine.Core;


internal sealed partial class StateManager : IStateManager, IDisposable
{
    private readonly string _databasePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowNamedFloatingPointLiterals
    };
    private string _engineId = string.Empty;

    /// <inheritdoc/>
    public string EngineId => _engineId;

    /// <inheritdoc/>
    public void SetEngineId(string engineId)
    {
        if (string.IsNullOrWhiteSpace(engineId))
        {
            return;
        }

        _engineId = engineId.Trim();
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            connection.Open();
            using var cmd = new SqliteCommand("INSERT OR REPLACE INTO Metadata (Key, Value) VALUES ('EngineId', @Value)", connection);
            cmd.Parameters.AddWithValue("@Value", _engineId);
            cmd.ExecuteNonQuery();
        }
        catch
        {
            // Database may not be initialized yet; _engineId is already stored in memory.
        }
    }

    /// <summary>Initializes a new instance of the <see cref="StateManager"/> class.</summary>
    /// <param name="databasePath">Optional custom path for the SQLite database file (e.g. for testing).</param>
    public StateManager(string? databasePath = null)
    {
        if (!string.IsNullOrWhiteSpace(databasePath))
        {
            var dir = Path.GetDirectoryName(databasePath);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }
            _databasePath = databasePath;
        }
        else
        {
            var baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
            var stateDir = Path.Combine(baseDirectory, "state");
            Directory.CreateDirectory(stateDir);
            _databasePath = Path.Combine(stateDir, "engine_state.db");
        }

        if (!File.Exists(_databasePath))
        {
            InitializeDatabase();
        }
        else
        {
            _engineId = LoadEngineId();
        }
    }

    /// <summary>Initialises the SQLite database with required tables.</summary>
    private void InitializeDatabase()
    {
        using var connection = new SqliteConnection($"Data Source={_databasePath}");
        connection.Open();

        string createTablesSql = @"
            CREATE TABLE IF NOT EXISTS Metadata (Key TEXT PRIMARY KEY, Value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS Tasks (TaskId TEXT PRIMARY KEY, TaskType TEXT NOT NULL, State TEXT NOT NULL, Config TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS LiveState (TaskId TEXT PRIMARY KEY, StateJson TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS OptimizationStates (OptimizationId TEXT PRIMARY KEY, StateJson TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS CronJobs (JobId TEXT PRIMARY KEY, CronExpression TEXT NOT NULL, Command TEXT NOT NULL, Enabled INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS Schedules (ScheduleId TEXT PRIMARY KEY, ScheduledTimeUtc TEXT NOT NULL, Command TEXT NOT NULL, Repeat INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS ExtensionManifest (ManifestType TEXT PRIMARY KEY, ManifestJson TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS QueuedMessages (Id INTEGER PRIMARY KEY AUTOINCREMENT, MessageType TEXT NOT NULL, PayloadJson TEXT NOT NULL, CreatedAtUtc TEXT NOT NULL, Sent INTEGER NOT NULL DEFAULT 0);
        ";

        using var command = new SqliteCommand(createTablesSql, connection);
        command.ExecuteNonQuery();

        string newId = $"eng_{Guid.NewGuid():N}";
        using var insertCmd = new SqliteCommand("INSERT INTO Metadata (Key, Value) VALUES ('EngineId', @Value)", connection);
        insertCmd.Parameters.AddWithValue("@Value", newId);
        insertCmd.ExecuteNonQuery();

        _engineId = newId;
    }

    /// <inheritdoc/>
    public async Task DeleteLiveStateAsync(CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("DELETE FROM LiveState WHERE TaskId = 'current'", connection);
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <summary>Loads the engine ID from the database.</summary>
    private string LoadEngineId()
    {
        using var connection = new SqliteConnection($"Data Source={_databasePath}");
        connection.Open();

        using var selectCmd = new SqliteCommand("SELECT Value FROM Metadata WHERE Key = 'EngineId'", connection);
        string? result = selectCmd.ExecuteScalar() as string;

        if (string.IsNullOrEmpty(result))
        {
            result = $"eng_{Guid.NewGuid():N}";
            using var insertCmd = new SqliteCommand("INSERT OR REPLACE INTO Metadata (Key, Value) VALUES ('EngineId', @Value)", connection);
            insertCmd.Parameters.AddWithValue("@Value", result);
            insertCmd.ExecuteNonQuery();
        }

        return result;
    }

    /// <inheritdoc/>
    public async Task SetSessionIdAsync(string sessionId, CancellationToken cancellationToken)
    {
        await SetMetadataAsync("SessionId", sessionId, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public Task LoadStateAsync(CancellationToken cancellationToken)
    {
        // For now, nothing more to load – live/optimization states are loaded on demand.
        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async Task SaveStateAsync(CancellationToken cancellationToken)
    {
        // Save all active tasks – we rely on individual save methods for live/optimization.
        // This method can be used as a global checkpoint.
        await Task.CompletedTask.ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public async Task SaveLiveStateAsync(LiveState liveState, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(liveState);

        string json = JsonSerializer.Serialize(liveState, _jsonOptions);
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("INSERT OR REPLACE INTO LiveState (TaskId, StateJson) VALUES ('current', @Json)", connection);
            cmd.Parameters.AddWithValue("@Json", json);
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task<LiveState?> LoadLiveStateAsync(CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("SELECT StateJson FROM LiveState WHERE TaskId = 'current'", connection);
            object? result = await cmd.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
            if (result is string json)
            {
                return JsonSerializer.Deserialize<LiveState>(json, _jsonOptions);
            }
            return null;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task SaveOptimizationStateAsync(string optimizationId, OptimizationState state, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(optimizationId);
        ArgumentNullException.ThrowIfNull(state);

        string json = JsonSerializer.Serialize(state, _jsonOptions);
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("INSERT OR REPLACE INTO OptimizationStates (OptimizationId, StateJson) VALUES (@Id, @Json)", connection);
            cmd.Parameters.AddWithValue("@Id", optimizationId);
            cmd.Parameters.AddWithValue("@Json", json);
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task<OptimizationState?> LoadOptimizationStateAsync(string optimizationId, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("SELECT StateJson FROM OptimizationStates WHERE OptimizationId = @Id", connection);
            cmd.Parameters.AddWithValue("@Id", optimizationId);
            object? result = await cmd.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
            if (result is string json)
            {
                return JsonSerializer.Deserialize<OptimizationState>(json, _jsonOptions);
            }
            return null;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task SaveCronJobAsync(CronJob job, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(job);

        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("INSERT OR REPLACE INTO CronJobs (JobId, CronExpression, Command, Enabled) VALUES (@Id, @Cron, @Cmd, @Enabled)", connection);
            cmd.Parameters.AddWithValue("@Id", job.JobId);
            cmd.Parameters.AddWithValue("@Cron", job.CronExpression);
            cmd.Parameters.AddWithValue("@Cmd", job.Command);
            cmd.Parameters.AddWithValue("@Enabled", job.Enabled ? 1 : 0);
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task DeleteCronJobAsync(string jobId, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("DELETE FROM CronJobs WHERE JobId = @Id", connection);
            cmd.Parameters.AddWithValue("@Id", jobId);
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task<List<CronJob>> LoadCronJobsAsync(CancellationToken cancellationToken)
    {
        List<CronJob> jobs = new List<CronJob>();
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("SELECT JobId, CronExpression, Command, Enabled FROM CronJobs", connection);
            using var reader = await cmd.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
            while (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
            {
                jobs.Add(new CronJob(
                    reader.GetString(0),
                    reader.GetString(1),
                    reader.GetString(2),
                    reader.GetInt32(3) == 1
                ));
            }
            return jobs;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task SaveScheduleAsync(Schedule schedule, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(schedule);

        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("INSERT OR REPLACE INTO Schedules (ScheduleId, ScheduledTimeUtc, Command, Repeat) VALUES (@Id, @Time, @Cmd, @Repeat)", connection);
            cmd.Parameters.AddWithValue("@Id", schedule.ScheduleId);
            cmd.Parameters.AddWithValue("@Time", schedule.ScheduledTimeUtc.ToString("o"));
            cmd.Parameters.AddWithValue("@Cmd", schedule.Command);
            cmd.Parameters.AddWithValue("@Repeat", schedule.Repeat ? 1 : 0);
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task DeleteScheduleAsync(string scheduleId, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("DELETE FROM Schedules WHERE ScheduleId = @Id", connection);
            cmd.Parameters.AddWithValue("@Id", scheduleId);
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task<List<Schedule>> LoadSchedulesAsync(CancellationToken cancellationToken)
    {
        List<Schedule> schedules = new List<Schedule>();
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("SELECT ScheduleId, ScheduledTimeUtc, Command, Repeat FROM Schedules", connection);
            using var reader = await cmd.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
            while (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
            {
                schedules.Add(new Schedule(
                    reader.GetString(0),
                    DateTime.Parse(reader.GetString(1), CultureInfo.InvariantCulture),
                    reader.GetString(2),
                    reader.GetInt32(3) == 1
                ));
            }
            return schedules;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public void Dispose()
    {
        _lock.Dispose();
    }
}
