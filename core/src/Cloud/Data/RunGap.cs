// -----------------------------------------------------------------------------
// <copyright file="RunGap.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// A recorded gap in execution or coverage for a flow run (003-040).
/// </summary>
internal sealed class RunGap
{
    /// <summary>Gets or sets the primary key.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the identifier of the associated flow run.</summary>
    public Guid FlowRunId { get; set; }

    /// <summary>Gets or sets the associated flow run.</summary>
    public FlowRun? FlowRun { get; set; }

    /// <summary>Gets or sets the beginning step, generation, or timestamp index of the gap.</summary>
    public int StartStep { get; set; }

    /// <summary>Gets or sets the ending step, generation, or timestamp index of the gap.</summary>
    public int EndStep { get; set; }

    /// <summary>Gets or sets the mandatory reason describing the gap.</summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>Gets or sets the timestamp when the gap was identified or recorded.</summary>
    public DateTimeOffset RecordedAt { get; set; }
}
