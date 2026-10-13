// -----------------------------------------------------------------------------
// <copyright file="GetCommandEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using System.Text.Json;
using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for one command's stored state.
/// </summary>
internal sealed class GetCommandRequest
{
    /// <summary>Gets or sets the Cloud-side command identifier.</summary>
    public Guid CommandId { get; set; }
}

/// <summary>
/// One progress report the Engine sent.
/// </summary>
internal sealed class ProgressReportView
{
    /// <summary>Gets or sets the reported payload.</summary>
    public JsonElement? Payload { get; set; }

    /// <summary>Gets or sets when Cloud received the report.</summary>
    public DateTimeOffset ReportedAt { get; set; }
}

/// <summary>
/// The stored state of a command.
/// </summary>
internal sealed class GetCommandResponse
{
    /// <summary>Gets or sets the Cloud-side command identifier.</summary>
    public Guid CommandId { get; set; }

    /// <summary>Gets or sets the target instance identifier.</summary>
    public Guid InstanceId { get; set; }

    /// <summary>Gets or sets the numeric command identifier.</summary>
    public int NumericCommandId { get; set; }

    /// <summary>Gets or sets the command name.</summary>
    public string CommandType { get; set; } = string.Empty;

    /// <summary>Gets or sets the correlation identifier the Engine echoes.</summary>
    public string CorrelationId { get; set; } = string.Empty;

    /// <summary>Gets or sets the delivery state.</summary>
    public CommandStatus Status { get; set; }

    /// <summary>Gets or sets the submission timestamp.</summary>
    public DateTimeOffset SubmittedAt { get; set; }

    /// <summary>Gets or sets when the command was written to the instance.</summary>
    public DateTimeOffset? DispatchedAt { get; set; }

    /// <summary>Gets or sets when the final answer arrived.</summary>
    public DateTimeOffset? CompletedAt { get; set; }

    /// <summary>Gets or sets the result the Engine returned on success.</summary>
    public JsonElement? Result { get; set; }

    /// <summary>Gets or sets the failure Cloud recorded.</summary>
    public string? ErrorMessage { get; set; }

    /// <summary>Gets or sets the interim progress reports.</summary>
    public IReadOnlyList<ProgressReportView> Progress { get; set; } = [];
}

/// <summary>
/// Returns a command with the progress and result the Engine reported
/// (002-030-160 §17.1 "receives progress/results, stores all data").
/// </summary>
internal sealed class GetCommandEndpoint(CommandService commands)
    : Endpoint<GetCommandRequest, GetCommandResponse>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/commands/{commandId}");
        Summary(summary =>
        {
            summary.Summary = "Get a command's stored state";
            summary.Description =
                "Returns the command's delivery state together with every interim progress report and the "
                + "final result or error the Engine reported.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetCommandRequest request, CancellationToken cancellationToken)
    {
        EngineCommand? command = await commands
            .GetAsync(request.CommandId, cancellationToken)
            .ConfigureAwait(false);

        if (command is null)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        var response = new GetCommandResponse
        {
            CommandId = command.Id,
            InstanceId = command.EngineInstanceId,
            NumericCommandId = command.NumericCommandId,
            CommandType = command.CommandType,
            CorrelationId = command.CorrelationId,
            Status = command.Status,
            SubmittedAt = command.SubmittedAt,
            DispatchedAt = command.DispatchedAt,
            CompletedAt = command.CompletedAt,
            Result = ParseJson(command.ResultPayloadJson),
            ErrorMessage = command.ErrorMessage,
            Progress = [.. command.ProgressReports
                .OrderBy(report => report.ReportedAt)
                .Select(report => new ProgressReportView
                {
                    Payload = ParseJson(report.PayloadJson),
                    ReportedAt = report.ReportedAt
                })]
        };

        await Send.OkAsync(response, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Parses a stored payload for the response, keeping it as JSON rather than a string.
    /// </summary>
    /// <param name="json">The stored JSON, which may be <see langword="null"/> or empty.</param>
    /// <returns>The parsed element, or <see langword="null"/> when there is nothing to parse.</returns>
    private static JsonElement? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<JsonElement>(json);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
