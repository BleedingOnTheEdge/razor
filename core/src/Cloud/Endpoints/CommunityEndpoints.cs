// -----------------------------------------------------------------------------
// <copyright file="CommunityEndpoints.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>Query filters for community forum threads.</summary>
internal sealed class GetCommunityThreadsRequest
{
    /// <summary>Gets or sets the category filter.</summary>
    public string? Category { get; set; }
}

/// <summary>Payload for authoring a new community thread.</summary>
internal sealed class CreateCommunityThreadRequest
{
    /// <summary>Gets or sets the thread title.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Gets or sets the category.</summary>
    public string Category { get; set; } = "General";

    /// <summary>Gets or sets the author name.</summary>
    public string AuthorName { get; set; } = string.Empty;

    /// <summary>Gets or sets the author badge.</summary>
    public string AuthorBadge { get; set; } = "Community";

    /// <summary>Gets or sets the markdown content.</summary>
    public string Content { get; set; } = string.Empty;
}

/// <summary>Payload for posting a reply in a community thread.</summary>
internal sealed class AddCommunityReplyRequest
{
    /// <summary>Gets or sets the thread route identifier.</summary>
    public Guid ThreadId { get; set; }

    /// <summary>Gets or sets the author name.</summary>
    public string AuthorName { get; set; } = string.Empty;

    /// <summary>Gets or sets the author badge.</summary>
    public string AuthorBadge { get; set; } = "Community";

    /// <summary>Gets or sets the markdown reply content.</summary>
    public string Content { get; set; } = string.Empty;
}

/// <summary>Lists community discussion threads.</summary>
internal sealed class GetCommunityThreadsEndpoint(CommunityService community)
    : Endpoint<GetCommunityThreadsRequest, IReadOnlyList<CommunityThread>>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/community/threads");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "List community discussion threads";
            s.Description = "Returns discussion threads with optional category filter, ordered chronologically.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetCommunityThreadsRequest req, CancellationToken ct)
    {
        IReadOnlyList<CommunityThread> threads = await community.GetThreadsAsync(req.Category, ct)
            .ConfigureAwait(false);
        await Send.OkAsync(threads, ct).ConfigureAwait(false);
    }
}

/// <summary>Retrieves a single community thread with replies.</summary>
internal sealed class GetCommunityThreadEndpoint(CommunityService community)
    : EndpointWithoutRequest<CommunityThread>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/community/threads/{threadId}");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Get community discussion thread";
            s.Description = "Returns a single thread and its discussion replies.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CancellationToken ct)
    {
        Guid threadId = Route<Guid>("threadId");
        CommunityThread? thread = await community.GetThreadByIdAsync(threadId, ct).ConfigureAwait(false);

        if (thread is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(thread, ct).ConfigureAwait(false);
    }
}

/// <summary>Creates a new discussion thread in the community hub.</summary>
internal sealed class CreateCommunityThreadEndpoint(CommunityService community)
    : Endpoint<CreateCommunityThreadRequest, CommunityThread>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/community/threads");
        Summary(s =>
        {
            s.Summary = "Create community thread";
            s.Description = "Posts a new discussion thread to the community hub.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CreateCommunityThreadRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Content))
        {
            AddError("Title and Content cannot be empty.");
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, ct).ConfigureAwait(false);
            return;
        }

        CommunityThread thread = await community.CreateThreadAsync(
            req.Title,
            req.Category,
            req.AuthorName,
            req.AuthorBadge,
            req.Content,
            ct).ConfigureAwait(false);

        await Send.CreatedAtAsync<GetCommunityThreadEndpoint>(new { threadId = thread.Id }, thread, cancellation: ct)
            .ConfigureAwait(false);
    }
}

/// <summary>Adds a reply to an existing discussion thread.</summary>
internal sealed class AddCommunityReplyEndpoint(CommunityService community)
    : Endpoint<AddCommunityReplyRequest, CommunityReply>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/community/threads/{threadId}/replies");
        Summary(s =>
        {
            s.Summary = "Reply to community thread";
            s.Description = "Posts a reply message to an existing discussion thread.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(AddCommunityReplyRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Content))
        {
            AddError("Reply content cannot be empty.");
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, ct).ConfigureAwait(false);
            return;
        }

        Guid threadId = Route<Guid>("threadId");
        CommunityReply? reply = await community.AddReplyAsync(
            threadId,
            req.AuthorName,
            req.AuthorBadge,
            req.Content,
            ct).ConfigureAwait(false);

        if (reply is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(reply, ct).ConfigureAwait(false);
    }
}

/// <summary>Upvotes a community thread.</summary>
internal sealed class UpvoteCommunityThreadEndpoint(CommunityService community)
    : EndpointWithoutRequest<object>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/community/threads/{threadId}/upvote");
        Summary(s =>
        {
            s.Summary = "Upvote thread";
            s.Description = "Increments the upvote counter for a community thread.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CancellationToken ct)
    {
        Guid threadId = Route<Guid>("threadId");
        int? newCount = await community.UpvoteThreadAsync(threadId, ct).ConfigureAwait(false);

        if (!newCount.HasValue)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(new { threadId, upvotes = newCount.Value }, ct).ConfigureAwait(false);
    }
}
