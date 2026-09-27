// -----------------------------------------------------------------------------
// <copyright file="InstanceHealthPolicy.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Cloud.Protocol;

/// <summary>
/// Decides the <c>Status</c> Cloud returns in a <c>HeartbeatResponse</c> (002-020-020 §3.4).
/// </summary>
/// <remarks>
/// The status is the only lever Cloud has over a connected Engine: the Engine stops all user tasks when it
/// receives <c>Lock</c> or <c>Ban</c>. The mapping is therefore derived from persisted administrative
/// state and licence validity on every heartbeat rather than cached, so that an administrator's change
/// takes effect on the Engine's next beat.
/// </remarks>
internal static class InstanceHealthPolicy
{
    /// <summary>
    /// Evaluates the heartbeat status for an instance.
    /// </summary>
    /// <param name="instance">The authenticated instance.</param>
    /// <param name="license">The licence the instance is registered against, when it could be loaded.</param>
    /// <param name="now">The current instant, used to test licence expiry.</param>
    /// <returns>One of the <see cref="CloudProtocol.HeartbeatStatus"/> values.</returns>
    /// <exception cref="ArgumentNullException"><paramref name="instance"/> is <see langword="null"/>.</exception>
    internal static string Evaluate(EngineInstance instance, License? license, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(instance);

        return instance.Status switch
        {
            EngineInstanceStatus.Banned => CloudProtocol.HeartbeatStatus.Ban,
            EngineInstanceStatus.Suspended => CloudProtocol.HeartbeatStatus.Lock,
            _ => license is not null && license.IsRunnableAt(now)
                ? CloudProtocol.HeartbeatStatus.Ok
                : CloudProtocol.HeartbeatStatus.Lock
        };
    }
}
