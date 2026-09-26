// -----------------------------------------------------------------------------
// <copyright file="TestTimeProvider.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests.TestSupport;

/// <summary>
/// A clock the tests control, so that expiry, timeout and last-seen assertions are deterministic rather
/// than dependent on how long the test happened to take.
/// </summary>
internal sealed class TestTimeProvider : TimeProvider
{
    private DateTimeOffset _utcNow;

    /// <summary>Initialises a new instance of the <see cref="TestTimeProvider"/> class.</summary>
    /// <param name="start">The instant to start from.</param>
    internal TestTimeProvider(DateTimeOffset start)
    {
        _utcNow = start;
    }

    /// <inheritdoc/>
    public override DateTimeOffset GetUtcNow() => _utcNow;

    /// <summary>Moves the clock forward.</summary>
    /// <param name="delta">How far to advance.</param>
    internal void Advance(TimeSpan delta)
    {
        _utcNow += delta;
    }
}
