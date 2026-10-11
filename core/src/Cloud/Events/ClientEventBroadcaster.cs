// -----------------------------------------------------------------------------
// <copyright file="ClientEventBroadcaster.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Events;

using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;

/// <summary>
/// Thread-safe in-memory fan-out broadcaster delivering real-time domain events to connected frontend clients.
/// </summary>
internal sealed class ClientEventBroadcaster : IClientEventBroadcaster
{
    private const int ChannelCapacity = 1000;
    private readonly ConcurrentDictionary<Guid, Subscription> _subscriptions = new();

    /// <summary>
    /// Initialises a new instance of the <see cref="ClientEventBroadcaster"/> class.
    /// </summary>
    public ClientEventBroadcaster()
    {
    }

    /// <summary>
    /// Gets the count of currently active subscriber channels.
    /// </summary>
    public int ActiveSubscriptionsCount => _subscriptions.Count;

    /// <inheritdoc/>
    public Task PublishAsync(ClientEvent clientEvent, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(clientEvent);

        foreach (Subscription sub in _subscriptions.Values)
        {
            if (sub.InstanceFilter is null || sub.InstanceFilter == clientEvent.InstanceId)
            {
                sub.Channel.Writer.TryWrite(clientEvent);
            }
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc/>
    public async IAsyncEnumerable<ClientEvent> SubscribeAsync(
        Guid? instanceId = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var subscriptionId = Guid.NewGuid();
        var channel = Channel.CreateBounded<ClientEvent>(new BoundedChannelOptions(ChannelCapacity)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false
        });

        var subscription = new Subscription(instanceId, channel);
        _subscriptions[subscriptionId] = subscription;

        try
        {
            ChannelReader<ClientEvent> reader = channel.Reader;
            while (await reader.WaitToReadAsync(cancellationToken).ConfigureAwait(false))
            {
                while (reader.TryRead(out ClientEvent? item))
                {
                    yield return item;
                }
            }
        }
        finally
        {
            _subscriptions.TryRemove(subscriptionId, out _);
            channel.Writer.TryComplete();
        }
    }

    private sealed record Subscription(Guid? InstanceFilter, Channel<ClientEvent> Channel);
}
