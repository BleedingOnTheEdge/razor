// -----------------------------------------------------------------------------
// <copyright file="CloudProtocol.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Protocol;

/// <summary>
/// Constants that fix the Cloud side of the Engine wire protocol (002-020-020 §3.2, §3.3, §3.4, §3.5).
/// Every name here is taken from the Engine's implementation in <c>Engine.Communication</c>, because the
/// Engine is the client and Cloud must interoperate with what it actually sends and expects.
/// </summary>
internal static class CloudProtocol
{
    /// <summary>
    /// The protocol revision Cloud stamps on the envelopes it sends.
    /// </summary>
    /// <remarks>
    /// This is the Engine's own convention, not the <c>"1.0"</c> that 002-020-020 §3.2 shows: the Engine
    /// overwrites <c>Version</c> with <c>AppConstants.EngineVersion</c> (<c>"1.0.0"</c>) on every send, so
    /// Cloud echoes <c>"1.0.0"</c> rather than the documented literal. The Engine does not validate the
    /// inbound <c>Version</c>, and neither does Cloud — a strict check against §3.2 would reject the Engine.
    /// </remarks>
    internal const string Version = "1.0.0";

    /// <summary>Discriminator values for <see cref="CloudMessage.MessageType"/> that Cloud implements.</summary>
    internal static class MessageType
    {
        /// <summary>Engine to Cloud: the initial, unencrypted authentication request (002-020-020 §3.3 step 1).</summary>
        internal const string Auth = "Auth";

        /// <summary>Cloud to Engine: the authentication result and key-exchange parameters (002-020-020 §3.3 step 2).</summary>
        internal const string AuthResponse = "AuthResponse";

        /// <summary>Engine to Cloud: the signed challenge that confirms the derived session key (002-020-020 §3.3 step 4).</summary>
        internal const string AuthConfirm = "AuthConfirm";

        /// <summary>Cloud to Engine: authentication is complete and encrypted traffic may start (002-020-020 §3.3 step 5).</summary>
        internal const string AuthAck = "AuthAck";

        /// <summary>Engine to Cloud: periodic health and liveness report (002-020-020 §3.4).</summary>
        internal const string Heartbeat = "Heartbeat";

        /// <summary>Cloud to Engine: heartbeat answer, command delivery and time synchronisation (002-020-020 §3.4).</summary>
        internal const string HeartbeatResponse = "HeartbeatResponse";

        /// <summary>Cloud to Engine: a command for the Engine to execute (002-020-020 §3.5).</summary>
        internal const string Command = "Command";

        /// <summary>Engine to Cloud: an interim progress report for a command (002-020-020 §3.5).</summary>
        internal const string CommandProgress = "CommandProgress";

        /// <summary>Engine to Cloud: the final outcome of a command (002-020-020 §3.5).</summary>
        internal const string CommandResponse = "CommandResponse";

        /// <summary>Engine to Cloud: the catalogue of extensions the Engine has discovered (002-030-090 §10.3 step 8).</summary>
        internal const string ExtensionManifest = "ExtensionManifest";
    }

    /// <summary>Values for the <c>Status</c> field of a <c>HeartbeatResponse</c> payload (002-020-020 §3.4).</summary>
    internal static class HeartbeatStatus
    {
        /// <summary>The Engine may continue running normally.</summary>
        internal const string Ok = "OK";

        /// <summary>The Engine must stop its user tasks and hold the connection.</summary>
        internal const string Lock = "Lock";

        /// <summary>The Engine must stop its user tasks; the instance is barred from the service.</summary>
        internal const string Ban = "Ban";
    }
}
