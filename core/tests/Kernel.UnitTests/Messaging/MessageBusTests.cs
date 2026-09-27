using Kernel.Messaging;

namespace Kernel.UnitTests.Messaging;

/// <summary>
/// Covers the in-process message bus contract: typed delivery, subscriber isolation, deduplication
/// and unsubscription. Every other Kernel component publishes through this bus, so these are
/// guarantees others are built on rather than incidental behaviour.
/// </summary>
public sealed class MessageBusTests
{
    private sealed record TestMessage(DateTime Timestamp, Guid? CorrelationId = null, string? EventId = null) : IMessage;

    private sealed record OtherMessage(DateTime Timestamp, Guid? CorrelationId = null, string? EventId = null) : IMessage;

    [Fact]
    public void Publish_Delivers_To_A_Subscriber()
    {
        using var bus = new MessageBus();
        var received = new List<TestMessage>();
        using var subscription = bus.Subscribe<TestMessage>(received.Add);

        var message = new TestMessage(DateTime.UtcNow);
        bus.Publish(message);

        Assert.Single(received);
        Assert.Same(message, received[0]);
    }

    [Fact]
    public void Publish_With_No_Subscribers_Is_A_NoOp()
    {
        using var bus = new MessageBus();

        bus.Publish(new TestMessage(DateTime.UtcNow));
    }

    [Fact]
    public void Publish_Delivers_Only_To_Subscribers_Of_The_Exact_Type()
    {
        using var bus = new MessageBus();
        var typed = new List<TestMessage>();
        var other = new List<OtherMessage>();
        using var typedSubscription = bus.Subscribe<TestMessage>(typed.Add);
        using var otherSubscription = bus.Subscribe<OtherMessage>(other.Add);

        bus.Publish(new TestMessage(DateTime.UtcNow));

        Assert.Single(typed);
        Assert.Empty(other);
    }

    [Fact]
    public void Publish_Delivers_To_Every_Subscriber_In_Subscription_Order()
    {
        using var bus = new MessageBus();
        var order = new List<int>();
        using var first = bus.Subscribe<TestMessage>(_ => order.Add(1));
        using var second = bus.Subscribe<TestMessage>(_ => order.Add(2));
        using var third = bus.Subscribe<TestMessage>(_ => order.Add(3));

        bus.Publish(new TestMessage(DateTime.UtcNow));

        Assert.Equal(3, order.Count);
        Assert.Equal(1, order[0]);
        Assert.Equal(2, order[1]);
        Assert.Equal(3, order[2]);
    }

    [Fact]
    public void A_Throwing_Subscriber_Does_Not_Stop_The_Others()
    {
        using var bus = new MessageBus();
        var delivered = false;
        using var faulty = bus.Subscribe<TestMessage>(_ => throw new InvalidOperationException("subscriber fault"));
        using var healthy = bus.Subscribe<TestMessage>(_ => delivered = true);

        bus.Publish(new TestMessage(DateTime.UtcNow));

        Assert.True(delivered);
    }

    [Fact]
    public void Disposing_The_Subscription_Stops_Delivery()
    {
        using var bus = new MessageBus();
        var received = new List<TestMessage>();
        var subscription = bus.Subscribe<TestMessage>(received.Add);

        bus.Publish(new TestMessage(DateTime.UtcNow));
        subscription.Dispose();
        bus.Publish(new TestMessage(DateTime.UtcNow));

        Assert.Single(received);
    }

    [Fact]
    public void Disposing_The_Subscription_Twice_Is_Safe()
    {
        using var bus = new MessageBus();
        var subscription = bus.Subscribe<TestMessage>(_ => { });

        subscription.Dispose();
        subscription.Dispose();
    }

    [Fact]
    public void Unsubscribing_One_Subscriber_Leaves_The_Others()
    {
        using var bus = new MessageBus();
        var first = new List<TestMessage>();
        var second = new List<TestMessage>();
        var firstSubscription = bus.Subscribe<TestMessage>(first.Add);
        using var secondSubscription = bus.Subscribe<TestMessage>(second.Add);

        firstSubscription.Dispose();
        bus.Publish(new TestMessage(DateTime.UtcNow));

        Assert.Empty(first);
        Assert.Single(second);
    }

    [Fact]
    public void The_Same_EventId_Is_Delivered_Once_Within_The_Deduplication_Window()
    {
        using var bus = new MessageBus(dedupWindowSeconds: 60);
        var received = new List<TestMessage>();
        using var subscription = bus.Subscribe<TestMessage>(received.Add);

        bus.Publish(new TestMessage(DateTime.UtcNow, EventId: "replayed"));
        bus.Publish(new TestMessage(DateTime.UtcNow, EventId: "replayed"));

        Assert.Single(received);
    }

    [Fact]
    public void Different_EventIds_Are_All_Delivered()
    {
        using var bus = new MessageBus();
        var received = new List<TestMessage>();
        using var subscription = bus.Subscribe<TestMessage>(received.Add);

        bus.Publish(new TestMessage(DateTime.UtcNow, EventId: "a"));
        bus.Publish(new TestMessage(DateTime.UtcNow, EventId: "b"));

        Assert.Equal(2, received.Count);
    }

    [Fact]
    public void A_Message_Without_An_EventId_Is_Never_Deduplicated()
    {
        using var bus = new MessageBus();
        var received = new List<TestMessage>();
        using var subscription = bus.Subscribe<TestMessage>(received.Add);

        bus.Publish(new TestMessage(DateTime.UtcNow));
        bus.Publish(new TestMessage(DateTime.UtcNow));

        Assert.Equal(2, received.Count);
    }

    [Fact]
    public void A_Zero_Length_Deduplication_Window_Does_Not_Deduplicate()
    {
        // The window is applied as an exclusive bound, so a zero-second window admits every publish.
        using var bus = new MessageBus(dedupWindowSeconds: 0);
        var received = new List<TestMessage>();
        using var subscription = bus.Subscribe<TestMessage>(received.Add);

        bus.Publish(new TestMessage(DateTime.UtcNow, EventId: "same"));
        bus.Publish(new TestMessage(DateTime.UtcNow, EventId: "same"));

        Assert.Equal(2, received.Count);
    }

    [Fact]
    public void Deduplication_Applies_Across_Message_Types_Sharing_An_EventId()
    {
        // Pinning the observed contract: the seen-EventId set is consulted before the subscriber
        // lookup, so an identifier is suppressed by type as well as by repetition. Worth a test
        // because it means two distinct events that reuse an identifier lose the second one.
        using var bus = new MessageBus();
        var typed = new List<TestMessage>();
        var other = new List<OtherMessage>();
        using var typedSubscription = bus.Subscribe<TestMessage>(typed.Add);
        using var otherSubscription = bus.Subscribe<OtherMessage>(other.Add);

        bus.Publish(new TestMessage(DateTime.UtcNow, EventId: "shared"));
        bus.Publish(new OtherMessage(DateTime.UtcNow, EventId: "shared"));

        Assert.Single(typed);
        Assert.Empty(other);
    }

    [Fact]
    public void Publishing_After_Dispose_Still_Delivers()
    {
        // Dispose releases the cleanup timer only: the subscriptions survive, which is what
        // components rely on during shutdown when they publish their final messages.
        var bus = new MessageBus();
        var received = new List<TestMessage>();
        using var subscription = bus.Subscribe<TestMessage>(received.Add);

        bus.Dispose();
        bus.Publish(new TestMessage(DateTime.UtcNow));

        Assert.Single(received);
    }

    [Fact]
    public void The_Cleanup_Sweep_Runs_Without_Disturbing_Delivery()
    {
        // The sweep is timer-driven, so it is exercised by letting one interval elapse. What is
        // asserted is the observable contract -- a live subscriber keeps receiving -- rather than
        // whether a particular weak reference was collected, which is not deterministic.
        using var bus = new MessageBus(dedupWindowSeconds: 1, cleanupIntervalSeconds: 1);
        var received = new List<TestMessage>();
        using var subscription = bus.Subscribe<TestMessage>(received.Add);

        bus.Publish(new TestMessage(DateTime.UtcNow, EventId: "sweep"));
        Thread.Sleep(1300);
        bus.Publish(new TestMessage(DateTime.UtcNow));

        Assert.Equal(2, received.Count);
    }

    [Fact]
    public void Publish_Rejects_A_Null_Message()
    {
        using var bus = new MessageBus();

        Assert.Throws<ArgumentNullException>(() => bus.Publish<TestMessage>(null!));
    }

    [Fact]
    public void Subscribe_Rejects_A_Null_Handler()
    {
        using var bus = new MessageBus();

        Assert.Throws<ArgumentNullException>(() => bus.Subscribe<TestMessage>(null!));
    }
}
