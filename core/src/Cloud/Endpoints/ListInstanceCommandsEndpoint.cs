// -----------------------------------------------------------------------------
// <copyright file="ListInstanceCommandsEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for listing commands for an instance.
/// </summary>
internal sealed class ListInstanceCommandsRequest
{
    /// <summary>Gets or sets the instance identifier.</summary>
    public Guid InstanceId { get; set; }

    /// <summary>Gets or sets the optional command status filter.</summary>
    public CommandStatus? Status { get; set; }
}

/// <summary>
/// Summary view of a command queued or executed for an instance.
/// </summary>
internal sealed class CommandListItemView
{
    /// <summary>Gets or sets the Cloud command identifier.</summary>
    public Guid CommandId { get; set; }

    /// <summary>Gets or sets the target instance identifier.</summary>
    public Guid InstanceId { get; set; }

    /// <summary>Gets or sets the numeric command identifier.</summary>
    public int NumericCommandId { get; set; }

    /// <summary>Gets or sets the command type name.</summary>
    public string CommandType { get; set; } = string.Empty;

    /// <summary>Gets or sets the correlation identifier.</summary>
    public string CorrelationId { get; set; } = string.Empty;

    /// <summary>Gets or sets the command status.</summary>
    public CommandStatus Status { get; set; }

    /// <summary>Gets or sets when the command was submitted.</summary>
    public DateTimeOffset SubmittedAt { get; set; }

    /// <summary>Gets or sets when the command was dispatched.</summary>
    public DateTimeOffset? DispatchedAt { get; set; }

    /// <summary>Gets or sets when the command completed.</summary>
    public DateTimeOffset? CompletedAt { get; set; }

    /// <summary>Gets or sets the error message, if failed.</summary>
    public string? ErrorMessage { get; set; }

    /// <summary>Gets or sets the command parameters JSON.</summary>
    public string? ParametersJson { get; set; }

    /// <summary>Gets or sets the engine response result payload JSON.</summary>
    public string? ResultPayloadJson { get; set; }
}

/// <summary>
/// Lists commands submitted to an Engine instance.
/// </summary>
internal sealed class ListInstanceCommandsEndpoint(CommandService commands)
    : Endpoint<ListInstanceCommandsRequest, IReadOnlyList<CommandListItemView>>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/instances/{instanceId}/commands");
        Summary(summary =>
        {
            summary.Summary = "List commands for an Engine instance";
            summary.Description = "Returns the command history and current delivery states for the target instance.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(ListInstanceCommandsRequest request, CancellationToken cancellationToken)
    {
        IReadOnlyList<EngineCommand> list = await commands
            .ListForInstanceAsync(request.InstanceId, status: request.Status, cancellationToken)
            .ConfigureAwait(false);

        List<CommandListItemView> items = [.. list.Select(c => new CommandListItemView
        {
            CommandId = c.Id,
            InstanceId = c.EngineInstanceId,
            NumericCommandId = c.NumericCommandId,
            CommandType = c.CommandType,
            CorrelationId = c.CorrelationId,
            Status = c.Status,
            SubmittedAt = c.SubmittedAt,
            DispatchedAt = c.DispatchedAt,
            CompletedAt = c.CompletedAt,
            ErrorMessage = c.ErrorMessage,
            ParametersJson = c.ParametersJson,
            ResultPayloadJson = c.ResultPayloadJson
        })];

        await Send.OkAsync(items, cancellationToken).ConfigureAwait(false);
    }
}
