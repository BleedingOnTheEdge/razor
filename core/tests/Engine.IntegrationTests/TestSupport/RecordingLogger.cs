// -----------------------------------------------------------------------------
// <copyright file="RecordingLogger.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.IntegrationTests.TestSupport;

using Microsoft.Extensions.Logging;

/// <summary>
/// Collects the log entries the Engine writes, so a failing socket test can report what the Engine thought
/// was happening rather than only that nothing arrived.
/// </summary>
/// <remarks>
/// The Engine reports its own failures — a message it could not decrypt, a handler that threw, a connection
/// that ended — through its log and not by throwing at the caller, so a test without this can only observe a
/// timeout. The level and the category are kept because they identify which loop or branch reported it.
/// </remarks>
internal sealed class LogSink
{
    private readonly List<string> _entries = [];

    /// <summary>Gets the entries collected so far, oldest first.</summary>
    internal IReadOnlyList<string> Entries
    {
        get
        {
            lock (_entries)
            {
                return _entries.ToArray();
            }
        }
    }

    /// <summary>Records one entry.</summary>
    /// <param name="entry">The rendered entry.</param>
    internal void Add(string entry)
    {
        lock (_entries)
        {
            _entries.Add(entry);
        }
    }

    /// <summary>Renders every entry on its own line, for a failure message.</summary>
    /// <returns>The rendered log.</returns>
    internal string Render() => string.Join(Environment.NewLine, this.Entries);
}

/// <summary>An <see cref="ILogger{T}"/> that writes to a <see cref="LogSink"/>.</summary>
/// <typeparam name="T">The category.</typeparam>
internal sealed class RecordingLogger<T> : ILogger<T>
{
    private readonly LogSink _sink;

    /// <summary>Initialises a new instance of the <see cref="RecordingLogger{T}"/> class.</summary>
    /// <param name="sink">The sink to write to.</param>
    internal RecordingLogger(LogSink sink)
    {
        _sink = sink;
    }

    /// <inheritdoc/>
    public IDisposable? BeginScope<TState>(TState state)
        where TState : notnull => null;

    /// <inheritdoc/>
    public bool IsEnabled(LogLevel logLevel) => true;

    /// <inheritdoc/>
    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        ArgumentNullException.ThrowIfNull(formatter);

        string message = formatter(state, exception);
        _sink.Add(exception is null
            ? $"{typeof(T).Name} [{logLevel}] {message}"
            : $"{typeof(T).Name} [{logLevel}] {message} ({exception.GetType().Name}: {exception.Message})");
    }
}
