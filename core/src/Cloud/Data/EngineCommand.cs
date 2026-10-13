// -----------------------------------------------------------------------------
// <copyright file="EngineCommand.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// A command Cloud submitted to an Engine and, on completion, its result
/// (002-020-020 §3.5; 002-030-160 §17.1 "sends commands, receives progress/results, stores all data").
/// </summary>
internal sealed class EngineCommand
{
    /// <summary>Gets or sets the Cloud-side command identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the target instance identifier.</summary>
    public Guid EngineInstanceId { get; set; }

    /// <summary>Gets or sets the target instance.</summary>
    public EngineInstance? EngineInstance { get; set; }

    /// <summary>Gets or sets the numeric command identifier from the Engine's command registry.</summary>
    public int NumericCommandId { get; set; }

    /// <summary>Gets or sets the command name, carried for readability and routing.</summary>
    public string CommandType { get; set; } = string.Empty;

    /// <summary>Gets or sets the JSON parameters object, or <see langword="null"/> when the command takes none.</summary>
    public string? ParametersJson { get; set; }

    /// <summary>Gets or sets the Engine-side execution timeout in seconds.</summary>
    public int? TimeoutSeconds { get; set; }

    /// <summary>
    /// Gets or sets the identifier the Engine echoes on its progress and response messages.
    /// </summary>
    public string CorrelationId { get; set; } = string.Empty;

    /// <summary>Gets or sets the delivery state.</summary>
    public CommandStatus Status { get; set; }

    /// <summary>Gets or sets the submission timestamp.</summary>
    public DateTimeOffset SubmittedAt { get; set; }

    /// <summary>Gets or sets the timestamp at which the command was written to the instance.</summary>
    public DateTimeOffset? DispatchedAt { get; set; }

    /// <summary>Gets or sets the timestamp at which the final response arrived.</summary>
    public DateTimeOffset? CompletedAt { get; set; }

    /// <summary>Gets or sets the JSON result payload the Engine returned on success.</summary>
    public string? ResultPayloadJson { get; set; }

    /// <summary>Gets or sets the error the Engine returned on failure.</summary>
    public string? ErrorMessage { get; set; }

    /// <summary>Gets the interim progress reports received for the command.</summary>
    public ICollection<CommandProgressReport> ProgressReports { get; } = [];
}

/// <summary>
/// An interim progress report an Engine sent for a command (002-020-020 §3.5).
/// </summary>
internal sealed class CommandProgressReport
{
    /// <summary>Gets or sets the report identifier.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the reported command identifier.</summary>
    public Guid EngineCommandId { get; set; }

    /// <summary>Gets or sets the reported command.</summary>
    public EngineCommand? EngineCommand { get; set; }

    /// <summary>Gets or sets the raw JSON payload of the progress event.</summary>
    public string PayloadJson { get; set; } = string.Empty;

    /// <summary>Gets or sets the timestamp at which Cloud received the report.</summary>
    public DateTimeOffset ReportedAt { get; set; }
}
