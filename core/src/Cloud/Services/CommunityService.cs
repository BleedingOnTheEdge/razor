// -----------------------------------------------------------------------------
// <copyright file="CommunityService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Cloud.Events;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Manages community discussions, alpha sharing, and extension feedback forums.
/// </summary>
internal sealed class CommunityService(
    IDbContextFactory<CloudDbContext> contextFactory,
    TimeProvider timeProvider,
    IClientEventBroadcaster? eventBroadcaster = null)
{
    /// <summary>Lists community threads, seeding default discussion topics if none exist.</summary>
    public async Task<IReadOnlyList<CommunityThread>> GetThreadsAsync(
        string? category = null,
        CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        if (!await db.CommunityThreads.AnyAsync(cancellationToken).ConfigureAwait(false))
        {
            await SeedDefaultThreadsAsync(db, cancellationToken).ConfigureAwait(false);
        }

        IQueryable<CommunityThread> q = db.CommunityThreads.Include(t => t.Replies);

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            q = q.Where(t => t.Category == category.Trim());
        }

        List<CommunityThread> list = await q.ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return [.. list.OrderByDescending(t => t.CreatedAt)];
    }

    /// <summary>Retrieves a single thread with all replies.</summary>
    public async Task<CommunityThread?> GetThreadByIdAsync(Guid threadId, CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        return await db.CommunityThreads
            .Include(t => t.Replies)
            .FirstOrDefaultAsync(t => t.Id == threadId, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>Publishes a new community discussion thread.</summary>
    public async Task<CommunityThread> CreateThreadAsync(
        string title,
        string category,
        string authorName,
        string authorBadge,
        string content,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(authorName);
        ArgumentException.ThrowIfNullOrWhiteSpace(content);

        using CloudDbContext db = contextFactory.CreateDbContext();
        DateTimeOffset now = timeProvider.GetUtcNow();

        var thread = new CommunityThread
        {
            Id = Guid.NewGuid(),
            Title = title.Trim(),
            Category = string.IsNullOrWhiteSpace(category) ? "General" : category.Trim(),
            AuthorName = authorName.Trim(),
            AuthorBadge = string.IsNullOrWhiteSpace(authorBadge) ? "Community" : authorBadge.Trim(),
            Content = content.Trim(),
            Upvotes = 1,
            RepliesCount = 0,
            CreatedAt = now
        };

        db.CommunityThreads.Add(thread);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        if (eventBroadcaster is not null)
        {
            await eventBroadcaster.PublishAsync(
                new ClientEvent("community_thread_created", null, null, null, now, new { thread.Id, thread.Title, thread.Category }),
                cancellationToken).ConfigureAwait(false);
        }

        return thread;
    }

    /// <summary>Adds a reply to an existing discussion thread.</summary>
    public async Task<CommunityReply?> AddReplyAsync(
        Guid threadId,
        string authorName,
        string authorBadge,
        string content,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(authorName);
        ArgumentException.ThrowIfNullOrWhiteSpace(content);

        using CloudDbContext db = contextFactory.CreateDbContext();

        CommunityThread? thread = await db.CommunityThreads.FirstOrDefaultAsync(t => t.Id == threadId, cancellationToken)
            .ConfigureAwait(false);

        if (thread is null)
        {
            return null;
        }

        DateTimeOffset now = timeProvider.GetUtcNow();

        var reply = new CommunityReply
        {
            Id = Guid.NewGuid(),
            ThreadId = threadId,
            AuthorName = authorName.Trim(),
            AuthorBadge = string.IsNullOrWhiteSpace(authorBadge) ? "Community" : authorBadge.Trim(),
            Content = content.Trim(),
            Upvotes = 0,
            CreatedAt = now
        };

        db.CommunityReplies.Add(reply);
        thread.RepliesCount++;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return reply;
    }

    /// <summary>Upvotes a thread.</summary>
    public async Task<int?> UpvoteThreadAsync(Guid threadId, CancellationToken cancellationToken = default)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        CommunityThread? thread = await db.CommunityThreads.FirstOrDefaultAsync(t => t.Id == threadId, cancellationToken)
            .ConfigureAwait(false);

        if (thread is null)
        {
            return null;
        }

        thread.Upvotes++;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return thread.Upvotes;
    }

    private async Task SeedDefaultThreadsAsync(CloudDbContext db, CancellationToken cancellationToken)
    {
        DateTimeOffset now = timeProvider.GetUtcNow();

        var thread1 = new CommunityThread
        {
            Id = Guid.NewGuid(),
            Title = "Welcome to Razor Additives Hub & Developer Community",
            Category = "Announcements",
            AuthorName = "Razor Core Team",
            AuthorBadge = "Core Team",
            Content = "Welcome quantitative researchers and algorithmic traders! This hub is the central space for discovering, testing, and distributing high-performance Razor slot extensions: Strategies, Adapters, Indicators, Neural Networks, and Hook Plugins. Try out our free MockPaperTradingAdapter for local zero-broker algorithm verification.",
            Upvotes = 42,
            RepliesCount = 1,
            CreatedAt = now.AddDays(-2)
        };

        thread1.Replies.Add(new CommunityReply
        {
            Id = Guid.NewGuid(),
            ThreadId = thread1.Id,
            AuthorName = "MacroQuantDesk",
            AuthorBadge = "Verified Dev",
            Content = "The sub-microsecond memory-mapped tick architecture is incredible. Looking forward to publishing our Kalman trend model here.",
            Upvotes = 12,
            CreatedAt = now.AddDays(-1)
        });

        var thread2 = new CommunityThread
        {
            Id = Guid.NewGuid(),
            Title = "Guide: Zero-Allocation Hook Plugins for Sub-Microsecond Interception",
            Category = "Additives",
            AuthorName = "LowLatencyEngineer",
            AuthorBadge = "Verified Dev",
            Content = "When authoring IHookCapability extensions, ensure your interceptors avoid heap allocations on the hot path. Use value types and direct memory pointers. Check the Sdk documentation on BorrowedTickData for zero-copy patterns.",
            Upvotes = 28,
            RepliesCount = 0,
            CreatedAt = now.AddHours(-18)
        };

        db.CommunityThreads.AddRange(thread1, thread2);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
