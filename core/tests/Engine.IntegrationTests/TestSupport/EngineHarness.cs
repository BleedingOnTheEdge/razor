// -----------------------------------------------------------------------------
// <copyright file="EngineHarness.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.IntegrationTests.TestSupport;

using Engine.Communication;
using Engine.Core;
using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// A real <see cref="CloudConnector"/> talking to a <see cref="SimulatedCloudServer"/> over a real socket,
/// with its collaborators stubbed so a test can assert on what the Engine did with what it received.
/// </summary>
/// <remarks>
/// The connector is started through its own <see cref="CloudConnector.RunAsync"/> loop rather than by calling
/// its message handling directly, because the path under test starts at a socket frame: the envelope, the
/// decryption, the dispatch and the reconnect loop are all part of what has to work.
/// </remarks>
internal sealed class EngineHarness : IAsyncDisposable
{
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(30);

    private readonly CancellationTokenSource _cancellation = new();
    private readonly List<CloudCommand> _commands = [];
    private readonly LogSink _logs = new();
    private readonly BinaryTransferManager _transferManager;
    private readonly string? _previousPrimaryEndpoint;
    private Task _connectionLoop = Task.CompletedTask;
    private bool _disposed;

    /// <summary>
    /// Builds the connector and the peer it talks to, so that each one is owned by this instance from the
    /// moment it exists.
    /// </summary>
    /// <param name="previousPrimaryEndpoint">The endpoint the environment held before the test, to be put
    /// back on disposal.</param>
    private EngineHarness(string? previousPrimaryEndpoint)
    {
        _previousPrimaryEndpoint = previousPrimaryEndpoint;

        Cloud = SimulatedCloudServer.Start();

        State = new StubStateManager();
        Telemetry = new StubTelemetry();
        Tasks = new StubTaskManager();
        SelfUpdate = new StubSelfUpdateManager();
        _transferManager = new BinaryTransferManager(new RecordingLogger<BinaryTransferManager>(_logs));

        Connector = new CloudConnector(
            new RecordingLogger<CloudConnector>(_logs),
            new SecurityManager(),
            Telemetry,
            State,
            Tasks,
            _transferManager,
            SelfUpdate);

        Connector.CommandReceived += this.RecordCommandAsync;
    }

    /// <summary>Gets the peer on the other end of the socket.</summary>
    internal SimulatedCloudServer Cloud
    {
        get;
    }

    /// <summary>Gets the connector under test.</summary>
    internal CloudConnector Connector
    {
        get;
    }

    /// <summary>Gets the state store the connector persists to.</summary>
    internal StubStateManager State
    {
        get;
    }

    /// <summary>Gets the telemetry sink the connector reports to.</summary>
    internal StubTelemetry Telemetry
    {
        get;
    }

    /// <summary>Gets the task manager the connector reads heartbeat facts from.</summary>
    internal StubTaskManager Tasks
    {
        get;
    }

    /// <summary>Gets the self-update manager the connector offers updates to.</summary>
    internal StubSelfUpdateManager SelfUpdate
    {
        get;
    }

    /// <summary>Gets what the Engine logged, which is where it reports a failure it does not throw.</summary>
    internal LogSink Logs => _logs;

    /// <summary>Gets every command the connector dispatched, in the order it dispatched them.</summary>
    internal IReadOnlyList<CloudCommand> Commands
    {
        get
        {
            lock (_commands)
            {
                return _commands.ToArray();
            }
        }
    }

    /// <summary>
    /// Starts a peer, points the Engine at it, and runs the connector's own connection loop.
    /// </summary>
    /// <returns>The running harness.</returns>
    internal static EngineHarness Start()
    {
        // RunAsync prompts on the console when no credentials are set, and a test host cannot answer a prompt.
        Credentials.SetCredentials("operator", "secret", "instance-api-key");

        string? previous = Environment.GetEnvironmentVariable("Razor_PRIMARY_ENDPOINT");
        var harness = new EngineHarness(previous);

        // The Engine reads its endpoint from the environment so a build can be pointed at a staging Cloud
        // without a rebuild; here it is what lets the connector reach the peer instead of the internet.
        Environment.SetEnvironmentVariable("Razor_PRIMARY_ENDPOINT", harness.Cloud.Endpoint);

        harness._connectionLoop = Task.Run(() => harness.Connector.RunAsync(harness._cancellation.Token));
        return harness;
    }

    /// <summary>Waits for a dispatched command that matches a condition.</summary>
    /// <param name="match">The condition, e.g. the command identifier the Cloud sent.</param>
    /// <param name="timeout">How long to wait.</param>
    /// <returns>The command.</returns>
    /// <exception cref="TimeoutException">No matching command was dispatched.</exception>
    internal async Task<CloudCommand> WaitForCommandAsync(Func<CloudCommand, bool> match, TimeSpan? timeout = null)
    {
        DateTime deadline = DateTime.UtcNow + (timeout ?? DefaultTimeout);

        while (DateTime.UtcNow < deadline)
        {
            lock (_commands)
            {
                CloudCommand? command = _commands.FirstOrDefault(match);
                if (command is not null)
                {
                    return command;
                }
            }

            await Task.Delay(25).ConfigureAwait(false);
        }

        throw new TimeoutException(
            $"No command matched within the timeout; the dispatched identifiers were [{string.Join(", ", this.Commands.Select(command => command.CommandId))}]."
            + Environment.NewLine
            + _logs.Render());
    }

    /// <summary>Waits for a condition the tests cannot be notified about directly.</summary>
    /// <param name="condition">The condition to poll.</param>
    /// <param name="timeout">How long to wait.</param>
    /// <returns><see langword="true"/> when the condition held; otherwise <see langword="false"/>.</returns>
    internal async Task<bool> WaitForAsync(Func<bool> condition, TimeSpan? timeout = null)
    {
        DateTime deadline = DateTime.UtcNow + (timeout ?? DefaultTimeout);

        while (DateTime.UtcNow < deadline)
        {
            if (condition())
            {
                return true;
            }

            await Task.Delay(25).ConfigureAwait(false);
        }

        return false;
    }

    /// <inheritdoc/>
    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        this.Connector.CommandReceived -= this.RecordCommandAsync;

        await _cancellation.CancelAsync().ConfigureAwait(false);
        try
        {
            await _connectionLoop.WaitAsync(TimeSpan.FromSeconds(15)).ConfigureAwait(false);
        }
        catch (Exception)
        {
            // A connection loop that will not stop must not replace the test's own outcome with a teardown
            // failure; the socket is closed underneath it either way.
        }

        // Disposing the connector releases the transfer manager it was handed as well; its Dispose is
        // idempotent, and disposing it here too keeps the harness from holding a resource it never releases.
        await this.Connector.DisposeAsync().ConfigureAwait(false);
        _transferManager.Dispose();
        await this.Cloud.DisposeAsync().ConfigureAwait(false);

        Environment.SetEnvironmentVariable("Razor_PRIMARY_ENDPOINT", _previousPrimaryEndpoint);
        _cancellation.Dispose();
    }

    private Task RecordCommandAsync(CloudCommand command)
    {
        lock (_commands)
        {
            _commands.Add(command);
        }

        return Task.CompletedTask;
    }
}
