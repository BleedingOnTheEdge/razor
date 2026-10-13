// -----------------------------------------------------------------------------
// <copyright file="TicketService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Cloud.Events;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Manages support tickets spanning additive developers in Marketplace and system operators in Cloud Dashboard.
/// </summary>
internal sealed class TicketService(
    IDbContextFactory<CloudDbContext> contextFactory,
    TimeProvider timeProvider,
    IClientEventBroadcaster? eventBroadcaster = null)
{
    /// <summary>Lists tickets with optional filters for target routing, status, and associated extension.</summary>
    public async Task<IReadOnlyList<Ticket>> GetTicketsAsync(
        TicketTargetType? targetType = null,
        TicketStatus? status = null,
        Guid? targetItemId = null,
        Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        IQueryable<Ticket> q = db.Tickets.Include(t => t.Messages);

        if (targetType.HasValue)
        {
            q = q.Where(t => t.TargetType == targetType.Value);
        }

        if (status.HasValue)
        {
            q = q.Where(t => t.Status == status.Value);
        }

        if (targetItemId.HasValue)
        {
            q = q.Where(t => t.TargetItemId == targetItemId.Value);
        }

        if (accountId.HasValue)
        {
            q = q.Where(t => t.AccountId == accountId.Value);
        }

        List<Ticket> list = await q.ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return [.. list.OrderByDescending(t => t.UpdatedAt)];
    }

    /// <summary>Retrieves a ticket by identifier including its full message thread.</summary>
    public async Task<Ticket?> GetTicketByIdAsync(Guid ticketId, CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        return await db.Tickets
            .Include(t => t.Messages)
            .FirstOrDefaultAsync(t => t.Id == ticketId, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>Submits a new support ticket.</summary>
    public async Task<Ticket> CreateTicketAsync(
        Guid accountId,
        Guid userId,
        string authorName,
        TicketTargetType targetType,
        string title,
        string description,
        TicketCategory category,
        TicketPriority priority,
        Guid? targetItemId = null,
        string? targetItemName = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(authorName);
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(description);

        using CloudDbContext db = contextFactory.CreateDbContext();
        DateTimeOffset now = timeProvider.GetUtcNow();

        var ticket = new Ticket
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            UserId = userId,
            AuthorName = authorName.Trim(),
            TargetType = targetType,
            TargetItemId = targetItemId,
            TargetItemName = targetItemName?.Trim(),
            Title = title.Trim(),
            Description = description.Trim(),
            Category = category,
            Priority = priority,
            Status = TicketStatus.Open,
            CreatedAt = now,
            UpdatedAt = now
        };

        var initialMsg = new TicketMessage
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            AuthorName = authorName.Trim(),
            AuthorRole = targetType == TicketTargetType.SystemManager ? "Operator / Dev" : "User / Trader",
            Message = description.Trim(),
            CreatedAt = now
        };

        ticket.Messages.Add(initialMsg);
        db.Tickets.Add(ticket);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        if (eventBroadcaster is not null)
        {
            await eventBroadcaster.PublishAsync(
                new ClientEvent("ticket_created", null, null, null, now, new { ticket.Id, ticket.Title, ticket.TargetType, ticket.Priority }),
                cancellationToken).ConfigureAwait(false);
        }

        return ticket;
    }

    /// <summary>Adds a reply message to an existing ticket.</summary>
    public async Task<TicketMessage?> AddMessageAsync(
        Guid ticketId,
        string authorName,
        string authorRole,
        string message,
        TicketStatus? newStatus = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(authorName);
        ArgumentException.ThrowIfNullOrWhiteSpace(message);

        using CloudDbContext db = contextFactory.CreateDbContext();

        Ticket? ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == ticketId, cancellationToken)
            .ConfigureAwait(false);

        if (ticket is null)
        {
            return null;
        }

        DateTimeOffset now = timeProvider.GetUtcNow();

        var msg = new TicketMessage
        {
            Id = Guid.NewGuid(),
            TicketId = ticketId,
            AuthorName = authorName.Trim(),
            AuthorRole = authorRole.Trim(),
            Message = message.Trim(),
            CreatedAt = now
        };

        db.TicketMessages.Add(msg);
        ticket.UpdatedAt = now;
        if (newStatus.HasValue)
        {
            ticket.Status = newStatus.Value;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        if (eventBroadcaster is not null)
        {
            await eventBroadcaster.PublishAsync(
                new ClientEvent("ticket_updated", null, null, null, now, new { ticket.Id, ticket.Status, MessageId = msg.Id }),
                cancellationToken).ConfigureAwait(false);
        }

        return msg;
    }

    /// <summary>Updates the status of a ticket.</summary>
    public async Task<bool> UpdateStatusAsync(
        Guid ticketId,
        TicketStatus status,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        Ticket? ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == ticketId, cancellationToken)
            .ConfigureAwait(false);

        if (ticket is null)
        {
            return false;
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        ticket.Status = status;
        ticket.UpdatedAt = now;

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        if (eventBroadcaster is not null)
        {
            await eventBroadcaster.PublishAsync(
                new ClientEvent("ticket_status_changed", null, null, null, now, new { ticket.Id, ticket.Status }),
                cancellationToken).ConfigureAwait(false);
        }

        return true;
    }
}
