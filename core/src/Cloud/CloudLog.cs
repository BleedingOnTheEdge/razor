// -----------------------------------------------------------------------------
// <copyright file="CloudLog.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud;

using Microsoft.Extensions.Logging;

/// <summary>
/// The application's log messages.
/// </summary>
/// <remarks>
/// Messages are declared as <see cref="LoggerMessageAttribute"/> partial methods rather than called through
/// <c>ILogger.LogInformation</c>, which keeps the templates as static expressions that the analysers can
/// verify and keeps the message identifiers stable for operators.
/// </remarks>
internal static partial class CloudLog
{
    /// <summary>Logs that an Engine session authenticated successfully.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="instanceId">The Cloud-side instance identifier.</param>
    /// <param name="engineId">The Engine's own identifier.</param>
    [LoggerMessage(EventId = 1000, Level = LogLevel.Information, Message = "Engine authenticated: instance {InstanceId}, engine {EngineId}.")]
    internal static partial void EngineAuthenticated(ILogger logger, Guid instanceId, string engineId);

    /// <summary>Logs that an Engine failed to authenticate.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="reason">The reason reported to the Engine.</param>
    [LoggerMessage(EventId = 1001, Level = LogLevel.Warning, Message = "Engine authentication rejected: {Reason}")]
    internal static partial void AuthenticationRejected(ILogger logger, string reason);

    /// <summary>Logs a message Cloud could not parse.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="exception">The parse failure.</param>
    [LoggerMessage(EventId = 1002, Level = LogLevel.Warning, Message = "Discarded an Engine message that was not valid JSON.")]
    internal static partial void MalformedMessage(ILogger logger, Exception exception);

    /// <summary>Logs a message Cloud could not decrypt.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="exception">The decryption failure.</param>
    [LoggerMessage(EventId = 1003, Level = LogLevel.Warning, Message = "Discarded an Engine message that could not be decrypted; the session will be closed.")]
    internal static partial void DecryptionFailed(ILogger logger, Exception exception);

    /// <summary>Logs a message type Cloud does not handle.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="messageType">The unhandled discriminator.</param>
    [LoggerMessage(EventId = 1004, Level = LogLevel.Debug, Message = "Ignored an Engine message of unhandled type {MessageType}.")]
    internal static partial void UnhandledMessageType(ILogger logger, string messageType);

    /// <summary>Logs a message that arrived out of protocol order.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="messageType">The offending discriminator.</param>
    /// <param name="authenticated">Whether the session had authenticated.</param>
    [LoggerMessage(EventId = 1005, Level = LogLevel.Warning, Message = "Ignored a {MessageType} message that is not valid in the current phase (authenticated: {Authenticated}).")]
    internal static partial void OutOfOrderMessage(ILogger logger, string messageType, bool authenticated);

    /// <summary>Logs an Engine heartbeat.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="engineId">The Engine's own identifier.</param>
    /// <param name="status">The status Cloud answered with.</param>
    [LoggerMessage(EventId = 1006, Level = LogLevel.Debug, Message = "Heartbeat from {EngineId} answered with {Status}.")]
    internal static partial void HeartbeatReceived(ILogger logger, string engineId, string status);

    /// <summary>Logs that Cloud dispatched a command.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="correlationId">The command correlation identifier.</param>
    /// <param name="commandType">The command name.</param>
    [LoggerMessage(EventId = 1007, Level = LogLevel.Information, Message = "Dispatched command {CommandType} ({CorrelationId}).")]
    internal static partial void CommandDispatched(ILogger logger, string correlationId, string commandType);

    /// <summary>Logs that a command reached a final state.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="correlationId">The command correlation identifier.</param>
    /// <param name="status">The final status the Engine reported.</param>
    [LoggerMessage(EventId = 1008, Level = LogLevel.Information, Message = "Command {CorrelationId} finished with status {Status}.")]
    internal static partial void CommandFinished(ILogger logger, string correlationId, string status);

    /// <summary>Logs that a report could not be matched to a live command.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="correlationId">The command correlation identifier.</param>
    /// <param name="messageType">The reporting message type.</param>
    [LoggerMessage(EventId = 1009, Level = LogLevel.Warning, Message = "Dropped a {MessageType} for unknown or already finished command {CorrelationId}.")]
    internal static partial void ReportNotApplied(ILogger logger, string correlationId, string messageType);

    /// <summary>Logs that an Engine reported its extension manifest.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="instanceId">The Cloud-side instance identifier.</param>
    /// <param name="extensionCount">The number of extensions reported.</param>
    [LoggerMessage(EventId = 1010, Level = LogLevel.Information, Message = "Applied a manifest of {ExtensionCount} extensions for instance {InstanceId}.")]
    internal static partial void ManifestApplied(ILogger logger, Guid instanceId, int extensionCount);

    /// <summary>Logs that Cloud closed an Engine session.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="instanceId">The Cloud-side instance identifier, when the session had authenticated.</param>
    [LoggerMessage(EventId = 1011, Level = LogLevel.Information, Message = "Engine session closed for instance {InstanceId}.")]
    internal static partial void SessionClosed(ILogger logger, Guid? instanceId);

    /// <summary>Logs that a queued command expired before it was delivered.</summary>
    /// <param name="logger">The logger.</param>
    /// <param name="correlationId">The command correlation identifier.</param>
    [LoggerMessage(EventId = 1012, Level = LogLevel.Warning, Message = "Queued command {CorrelationId} expired before the Engine collected it.")]
    internal static partial void CommandExpired(ILogger logger, string correlationId);
}
