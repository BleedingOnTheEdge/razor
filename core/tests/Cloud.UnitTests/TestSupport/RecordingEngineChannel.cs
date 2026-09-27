// -----------------------------------------------------------------------------
// <copyright file="RecordingEngineChannel.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests.TestSupport;

using System.Text.Json;
using Cloud.Engine;
using Cloud.Protocol;

/// <summary>
/// An <see cref="IEngineChannel"/> that keeps every envelope Cloud wrote, so a test can assert what
/// actually went on the wire instead of trusting a return value.
/// </summary>
internal sealed class RecordingEngineChannel : IEngineChannel
{
    private readonly List<string> _sent = [];

    /// <summary>Gets the envelopes Cloud has written, in order.</summary>
    internal IReadOnlyList<string> Sent => _sent;

    /// <inheritdoc/>
    public Task SendAsync(string json, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(json);

        _sent.Add(json);
        return Task.CompletedTask;
    }

    /// <summary>Parses the envelopes Cloud has written.</summary>
    /// <returns>The envelopes as messages.</returns>
    internal IReadOnlyList<CloudMessage> ParseSent()
    {
        return [.. _sent.Select(json => JsonSerializer.Deserialize<CloudMessage>(json)!)];
    }

    /// <summary>Finds the last envelope of a given type.</summary>
    /// <param name="messageType">The discriminator to look for.</param>
    /// <returns>The message, or <see langword="null"/> when Cloud never wrote one.</returns>
    internal CloudMessage? LastOfType(string messageType)
    {
        return ParseSent().LastOrDefault(message => message.MessageType == messageType);
    }

    /// <summary>Reads the payload of the last envelope of a given type as JSON text.</summary>
    /// <param name="messageType">The discriminator to look for.</param>
    /// <returns>The payload text, or <see langword="null"/> when there is no such message.</returns>
    internal string? LastPayloadJson(string messageType)
    {
        CloudMessage? message = LastOfType(messageType);
        return message?.Payload?.GetRawText();
    }
}
