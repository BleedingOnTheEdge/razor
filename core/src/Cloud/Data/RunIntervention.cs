// -----------------------------------------------------------------------------
// <copyright file="RunIntervention.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// An append-only audit record of an intervention applied to a flow run (003-040).
/// </summary>
internal sealed class RunIntervention
{
    /// <summary>Gets or sets the primary key.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the identifier of the associated flow run.</summary>
    public Guid FlowRunId { get; set; }

    /// <summary>Gets or sets the associated flow run.</summary>
    public FlowRun? FlowRun { get; set; }

    /// <summary>Gets or sets the step or generation index affected by the intervention.</summary>
    public int StepIndex { get; set; }

    /// <summary>Gets or sets the SHA-256 fingerprint before the intervention.</summary>
    public string PreviousFingerprint { get; set; } = string.Empty;

    /// <summary>Gets or sets the SHA-256 fingerprint after the intervention.</summary>
    public string NewFingerprint { get; set; } = string.Empty;

    /// <summary>Gets or sets the identity of the operator or automated service performing the intervention.</summary>
    public string Actor { get; set; } = string.Empty;

    /// <summary>Gets or sets the timestamp when the intervention was recorded.</summary>
    public DateTimeOffset Timestamp { get; set; }

    /// <summary>Gets or sets the mandatory business reason explaining why the intervention occurred.</summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>Gets or sets an optional summary of modifications applied.</summary>
    public string? ModificationsSummary { get; set; }

    /// <summary>Gets or sets the serialized state or parameter payload before modification.</summary>
    public string? BeforePayloadJson { get; set; }

    /// <summary>Gets or sets the serialized state or parameter payload after modification.</summary>
    public string? AfterPayloadJson { get; set; }
}
