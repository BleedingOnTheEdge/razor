// -----------------------------------------------------------------------------
// <copyright file="StateManager.Messaging.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

using System.Globalization;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace Engine.Core;

internal sealed partial class StateManager
{
    /// <inheritdoc/>
    public async Task EnqueueOutgoingMessageAsync(string messageType, string payloadJson, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
            using var cmd = new SqliteCommand(
                "INSERT INTO QueuedMessages (MessageType, PayloadJson, CreatedAtUtc, Sent) VALUES (@Type, @Json, @Created, 0)",
                connection);
            cmd.Parameters.AddWithValue("@Type", messageType);
            cmd.Parameters.AddWithValue("@Json", payloadJson);
            cmd.Parameters.AddWithValue("@Created", DateTime.UtcNow.ToString("O"));
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<QueuedMessage>> GetPendingOutgoingMessagesAsync(CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
            using var cmd = new SqliteCommand(
                "SELECT Id, MessageType, PayloadJson, CreatedAtUtc FROM QueuedMessages WHERE Sent = 0 ORDER BY Id ASC",
                connection);
            using var reader = await cmd.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
            var list = new List<QueuedMessage>();
            while (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
            {
                list.Add(new QueuedMessage(
                    reader.GetInt64(0),
                    reader.GetString(1),
                    reader.GetString(2),
                    DateTime.Parse(reader.GetString(3), CultureInfo.InvariantCulture)
                ));
            }
            return list;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task DeleteOutgoingMessageAsync(long id, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
            using var cmd = new SqliteCommand("DELETE FROM QueuedMessages WHERE Id = @Id", connection);
            cmd.Parameters.AddWithValue("@Id", id);
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task SaveExtensionManifestAsync(object manifest, CancellationToken cancellationToken)
    {
        string json = JsonSerializer.Serialize(manifest, _jsonOptions);
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("INSERT OR REPLACE INTO ExtensionManifest (ManifestType, ManifestJson) VALUES ('Default', @Json)", connection);
            cmd.Parameters.AddWithValue("@Json", json);
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task<object?> LoadExtensionManifestAsync(CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("SELECT ManifestJson FROM ExtensionManifest WHERE ManifestType = 'Default'", connection);
            object? result = await cmd.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
            if (result is string json)
            {
                return JsonSerializer.Deserialize<object>(json, _jsonOptions);
            }
            return null;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task SetMetadataAsync(string key, string value, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("INSERT OR REPLACE INTO Metadata (Key, Value) VALUES (@Key, @Value)", connection);
            cmd.Parameters.AddWithValue("@Key", key);
            cmd.Parameters.AddWithValue("@Value", value);
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc/>
    public async Task<string?> GetMetadataAsync(string key, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            using var connection = new SqliteConnection($"Data Source={_databasePath}");
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            using var cmd = new SqliteCommand("SELECT Value FROM Metadata WHERE Key = @Key", connection);
            cmd.Parameters.AddWithValue("@Key", key);
            return await cmd.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false) as string;
        }
        finally
        {
            _lock.Release();
        }
    }
}
