// -----------------------------------------------------------------------------
// <copyright file="TicketEndpoints.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>Query filters for tickets.</summary>
internal sealed class GetTicketsRequest
{
    /// <summary>Gets or sets the routing target.</summary>
    public TicketTargetType? TargetType { get; set; }

    /// <summary>Gets or sets the status filter.</summary>
    public TicketStatus? Status { get; set; }

    /// <summary>Gets or sets the associated additive identifier.</summary>
    public Guid? TargetItemId { get; set; }

    /// <summary>Gets or sets the submitting account identifier.</summary>
    public Guid? AccountId { get; set; }

    /// <summary>Gets or sets the search query.</summary>
    public string? Search { get; set; }

    /// <summary>Gets or sets the priority filter.</summary>
    public TicketPriority? Priority { get; set; }

    /// <summary>Gets or sets the category filter.</summary>
    public TicketCategory? Category { get; set; }

    /// <summary>Gets or sets the 1-based page number.</summary>
    public int? Page { get; set; }

    /// <summary>Gets or sets the page size.</summary>
    public int? PageSize { get; set; }
}

/// <summary>Payload for opening a new support ticket.</summary>
internal sealed class CreateTicketRequest
{
    /// <summary>Gets or sets the submitting account identifier.</summary>
    public Guid AccountId { get; set; }

    /// <summary>Gets or sets the submitting user identifier.</summary>
    public Guid UserId { get; set; }

    /// <summary>Gets or sets the author name.</summary>
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
}

/// <summary>Payload for replying to a ticket.</summary>
internal sealed class AddTicketMessageRequest
{
    /// <summary>Gets or sets the ticket route identifier.</summary>
    public Guid TicketId { get; set; }

    /// <summary>Gets or sets the author name.</summary>
    public string AuthorName { get; set; } = string.Empty;

    /// <summary>Gets or sets the author role badge.</summary>
    public string AuthorRole { get; set; } = "Operator";

    /// <summary>Gets or sets the message text.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Gets or sets an optional status change.</summary>
    public TicketStatus? NewStatus { get; set; }
}

/// <summary>Payload for transitioning a ticket's status.</summary>
internal sealed class UpdateTicketStatusRequest
{
    /// <summary>Gets or sets the ticket route identifier.</summary>
    public Guid TicketId { get; set; }

    /// <summary>Gets or sets the new status.</summary>
    public TicketStatus Status { get; set; }
}

/// <summary>Lists support tickets across system operations and additive developers.</summary>
internal sealed class GetTicketsEndpoint(TicketService tickets) : Endpoint<GetTicketsRequest, object>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/tickets");
        Summary(s =>
        {
            s.Summary = "List support tickets";
            s.Description = "Returns tickets filtered by target routing, status, priority, category, search, and server-side pagination.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetTicketsRequest req, CancellationToken ct)
    {
        IReadOnlyList<Ticket> list = await tickets.GetTicketsAsync(
            req.TargetType,
            req.Status,
            req.TargetItemId,
            req.AccountId,
            req.Search,
            req.Priority,
            req.Category,
            ct).ConfigureAwait(false);

        if (req.Page.HasValue || req.PageSize.HasValue)
        {
            var paged = PagedResult.Create(list, req.Page, req.PageSize);
            await Send.OkAsync(paged, ct).ConfigureAwait(false);
        }
        else
        {
            await Send.OkAsync(list, ct).ConfigureAwait(false);
        }
    }
}

/// <summary>Opens a new support ticket.</summary>
internal sealed class CreateTicketEndpoint(TicketService tickets) : Endpoint<CreateTicketRequest, Ticket>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/tickets");
        Summary(s =>
        {
            s.Summary = "Create support ticket";
            s.Description = "Opens a support ticket routed to an additive author or system management.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CreateTicketRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Description))
        {
            AddError("Title and Description cannot be empty.");
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, ct).ConfigureAwait(false);
            return;
        }

        Ticket ticket = await tickets.CreateTicketAsync(
            req.AccountId == Guid.Empty ? Guid.NewGuid() : req.AccountId,
            req.UserId == Guid.Empty ? Guid.NewGuid() : req.UserId,
            req.AuthorName,
            req.TargetType,
            req.Title,
            req.Description,
            req.Category,
            req.Priority,
            req.TargetItemId,
            req.TargetItemName,
            ct).ConfigureAwait(false);

        await Send.CreatedAtAsync<GetTicketByIdEndpoint>(new { ticketId = ticket.Id }, ticket, cancellation: ct)
            .ConfigureAwait(false);
    }
}

/// <summary>Retrieves a single ticket by identifier.</summary>
internal sealed class GetTicketByIdEndpoint(TicketService tickets) : EndpointWithoutRequest<Ticket>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/tickets/{ticketId}");
        Summary(s =>
        {
            s.Summary = "Get ticket details";
            s.Description = "Returns the ticket along with all discussion messages in the thread.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CancellationToken ct)
    {
        Guid ticketId = Route<Guid>("ticketId");
        Ticket? ticket = await tickets.GetTicketByIdAsync(ticketId, ct).ConfigureAwait(false);

        if (ticket is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(ticket, ct).ConfigureAwait(false);
    }
}

/// <summary>Adds a reply message to a support ticket.</summary>
internal sealed class AddTicketMessageEndpoint(TicketService tickets) : Endpoint<AddTicketMessageRequest, TicketMessage>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/tickets/{ticketId}/messages");
        Summary(s =>
        {
            s.Summary = "Add message to ticket";
            s.Description = "Posts a response to a support ticket thread and optionally transitions its status.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(AddTicketMessageRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Message))
        {
            AddError("Ticket message cannot be empty.");
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, ct).ConfigureAwait(false);
            return;
        }

        Guid ticketId = Route<Guid>("ticketId");
        TicketMessage? msg = await tickets.AddMessageAsync(
            ticketId,
            req.AuthorName,
            req.AuthorRole,
            req.Message,
            req.NewStatus,
            ct).ConfigureAwait(false);

        if (msg is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(msg, ct).ConfigureAwait(false);
    }
}

/// <summary>Updates the status of a support ticket.</summary>
internal sealed class UpdateTicketStatusEndpoint(TicketService tickets) : Endpoint<UpdateTicketStatusRequest>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Patch("/api/tickets/{ticketId}/status");
        Summary(s =>
        {
            s.Summary = "Update ticket status";
            s.Description = "Transitions a ticket's status between Open, InProgress, Resolved, and Closed.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(UpdateTicketStatusRequest req, CancellationToken ct)
    {
        Guid ticketId = Route<Guid>("ticketId");
        bool updated = await tickets.UpdateStatusAsync(ticketId, req.Status, ct).ConfigureAwait(false);

        if (!updated)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.NoContentAsync(ct).ConfigureAwait(false);
    }
}
