// -----------------------------------------------------------------------------
// <copyright file="Ticket.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>The recipient / routing target of a support ticket.</summary>
internal enum TicketTargetType
{
    /// <summary>Routed to platform operators and system managers in Cloud Dashboard.</summary>
    SystemManager,

    /// <summary>Routed to an extension / additive developer in Marketplace.</summary>
    AdditiveDeveloper
}

/// <summary>The classification category of a support ticket.</summary>
internal enum TicketCategory
{
    /// <summary>Defect or unexpected execution error.</summary>
    Bug,

    /// <summary>Enhancement or capability request.</summary>
    FeatureRequest,

    /// <summary>Account, licensing or billing enquiry.</summary>
    Billing,

    /// <summary>Critical operational production outage.</summary>
    Incident,

    /// <summary>General enquiry or documentation question.</summary>
    General
}

/// <summary>Urgency priority of a support ticket.</summary>
internal enum TicketPriority
{
    /// <summary>Low urgency; routine query.</summary>
    Low,

    /// <summary>Medium urgency; normal workflow impact.</summary>
    Medium,

    /// <summary>High urgency; significant operational disruption.</summary>
    High,

    /// <summary>Critical urgency; trading execution halt or security breach.</summary>
    Critical
}

/// <summary>Lifecycle state of a support ticket.</summary>
internal enum TicketStatus
{
    /// <summary>Newly opened and awaiting triage.</summary>
    Open,

    /// <summary>Under investigation or actively worked on.</summary>
    InProgress,

    /// <summary>Resolution provided.</summary>
    Resolved,

    /// <summary>Concluded and closed.</summary>
    Closed
}

/// <summary>
/// A unified support ticket spanning Marketplace additive developers and Cloud system managers.
/// </summary>
internal sealed class Ticket
{
    /// <summary>Gets or sets the primary key.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the submitting account identifier.</summary>
    public Guid AccountId { get; set; }

    /// <summary>Gets or sets the submitting user identifier.</summary>
    public Guid UserId { get; set; }

    /// <summary>Gets or sets the submitter display name.</summary>
    public string AuthorName { get; set; } = string.Empty;

    /// <summary>Gets or sets the routing target.</summary>
    public TicketTargetType TargetType { get; set; } = TicketTargetType.SystemManager;

    /// <summary>Gets or sets the optional marketplace additive identifier.</summary>
    public Guid? TargetItemId { get; set; }

    /// <summary>Gets or sets the optional marketplace additive name.</summary>
    public string? TargetItemName { get; set; }

    /// <summary>Gets or sets the ticket title.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Gets or sets the ticket description.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Gets or sets the category.</summary>
    public TicketCategory Category { get; set; } = TicketCategory.General;

    /// <summary>Gets or sets the priority.</summary>
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;

    /// <summary>Gets or sets the status.</summary>
    public TicketStatus Status { get; set; } = TicketStatus.Open;

    /// <summary>Gets or sets the creation timestamp.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets or sets the last update timestamp.</summary>
    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Gets or sets the discussion messages on this ticket.</summary>
    public ICollection<TicketMessage> Messages { get; set; } = [];
}

/// <summary>
/// A message / response in a support ticket thread.
/// </summary>
internal sealed class TicketMessage
{
    /// <summary>Gets or sets the primary key.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the parent ticket identifier.</summary>
    public Guid TicketId { get; set; }

    /// <summary>Gets or sets the parent ticket.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public Ticket? Ticket { get; set; }

    /// <summary>Gets or sets the author display name.</summary>
    public string AuthorName { get; set; } = string.Empty;

    /// <summary>Gets or sets the author role badge (Operator, Dev, Trader).</summary>
    public string AuthorRole { get; set; } = string.Empty;

    /// <summary>Gets or sets the message body text.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Gets or sets the message timestamp.</summary>
    public DateTimeOffset CreatedAt { get; set; }
}
