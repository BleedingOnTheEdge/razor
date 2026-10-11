// -----------------------------------------------------------------------------
// <copyright file="StreamClientEventsEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using System.Text.Json;
using Cloud.Events;
using FastEndpoints;
using Microsoft.AspNetCore.Http;

/// <summary>
/// The query parameters for subscribing to real-time client events.
/// </summary>
internal sealed class StreamClientEventsRequest
{
    /// <summary>Gets or sets the optional instance identifier filter.</summary>
    public Guid? InstanceId { get; set; }
}

/// <summary>
/// Streams real-time client events (heartbeats, progress reports, telemetry, run state transitions)
/// to frontend dashboard clients via Server-Sent Events (SSE).
/// </summary>
internal sealed class StreamClientEventsEndpoint(IClientEventBroadcaster broadcaster)
    : Endpoint<StreamClientEventsRequest>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/events/stream");
        Summary(summary =>
        {
            summary.Summary = "Stream real-time events via SSE";
            summary.Description = "Connects a Server-Sent Events (SSE) feed for live engine telemetry, equity ticks, and command progress.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(StreamClientEventsRequest request, CancellationToken cancellationToken)
    {
        HttpContext.Response.Headers.ContentType = "text/event-stream";
        HttpContext.Response.Headers.CacheControl = "no-cache";
        HttpContext.Response.Headers.Connection = "keep-alive";
        await HttpContext.Response.WriteAsync(": connected\n\n", cancellationToken).ConfigureAwait(false);
        await HttpContext.Response.Body.FlushAsync(cancellationToken).ConfigureAwait(false);

        await foreach (ClientEvent ev in broadcaster
            .SubscribeAsync(request.InstanceId, cancellationToken)
            .ConfigureAwait(false))
        {
            string payloadJson = JsonSerializer.Serialize(ev, JsonOptions);
            await HttpContext.Response
                .WriteAsync($"event: {ev.EventType}\ndata: {payloadJson}\n\n", cancellationToken)
                .ConfigureAwait(false);
            await HttpContext.Response.Body
                .FlushAsync(cancellationToken)
                .ConfigureAwait(false);
        }
    }
}
