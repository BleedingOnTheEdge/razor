// -----------------------------------------------------------------------------
// <copyright file="SubmitCommandEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Engine;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The body of a command submission.
/// </summary>
internal sealed class SubmitCommandRequest
{
    /// <summary>Gets or sets the Cloud-side identifier of the target instance.</summary>
    public Guid InstanceId { get; set; }

    /// <summary>Gets or sets the numeric command identifier from the Engine's registry.</summary>
    public int CommandId { get; set; }

    /// <summary>Gets or sets the command name.</summary>
    public string? CommandType { get; set; }

    /// <summary>Gets or sets the parameters as a JSON object.</summary>
    public string? Parameters { get; set; }

    /// <summary>Gets or sets the Engine-side execution timeout in seconds.</summary>
    public int? TimeoutSeconds { get; set; }
}

/// <summary>
/// The result of a command submission.
/// </summary>
internal sealed class SubmitCommandResponse
{
    /// <summary>Gets or sets the Cloud-side command identifier.</summary>
    public Guid CommandId { get; set; }

    /// <summary>Gets or sets the correlation identifier the Engine echoes on its reports.</summary>
    public string CorrelationId { get; set; } = string.Empty;

    /// <summary>Gets or sets the delivery state.</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether the command was written to a live Engine session.</summary>
    public bool Delivered { get; set; }
}

/// <summary>
/// Queues a command for an Engine instance and delivers it when the instance is connected
/// (002-020-020 §3.5).
/// </summary>
/// <remarks>
/// A command for an instance that is not connected is still accepted. It stays queued and is written on the
/// instance's next authenticated session, which means the caller does not have to retry around connection
/// churn.
/// </remarks>
internal sealed class SubmitCommandEndpoint(CommandService commands, EngineSessionRegistry registry)
    : Endpoint<SubmitCommandRequest, SubmitCommandResponse>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/instances/{instanceId}/commands");
        Summary(summary =>
        {
            summary.Summary = "Submit a command to an Engine instance";
            summary.Description =
                "Queues a command and writes it to the instance's live session when it has one. The command "
                + "is otherwise delivered after the Engine's next successful authentication.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(SubmitCommandRequest request, CancellationToken cancellationToken)
    {
        CommandOutcome outcome = await commands
            .SubmitAsync(
                request.InstanceId,
                request.CommandId,
                request.CommandType,
                request.Parameters,
                request.TimeoutSeconds,
                cancellationToken)
            .ConfigureAwait(false);

        switch (outcome.Status)
        {
            case ServiceStatus.NotFound:
                await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
                return;
            case ServiceStatus.Rejected:
                AddError(outcome.FailureReason ?? "The request was refused.");
                await Send.ErrorsAsync(StatusCodes.Status400BadRequest, cancellationToken).ConfigureAwait(false);
                return;
            default:
                break;
        }

        Data.EngineCommand command = outcome.Command!;
        bool delivered = await registry
            .TryDeliverPendingCommandsAsync(command.EngineInstanceId, cancellationToken)
            .ConfigureAwait(false);

        var response = new SubmitCommandResponse
        {
            CommandId = command.Id,
            CorrelationId = command.CorrelationId,
            Status = command.Status.ToString(),
            Delivered = delivered
        };

        await Send.ResponseAsync(response, StatusCodes.Status201Created, cancellationToken).ConfigureAwait(false);
    }
}
