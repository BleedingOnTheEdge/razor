// -----------------------------------------------------------------------------
// <copyright file="CommunityThread.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// A discussion thread in the Marketplace community hub.
/// </summary>
internal sealed class CommunityThread
{
    /// <summary>Gets or sets the primary key.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the thread title.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Gets or sets the category name (Announcements, Strategies, Additives, Feedback, General).</summary>
    public string Category { get; set; } = "General";

    /// <summary>Gets or sets the author display name.</summary>
    public string AuthorName { get; set; } = string.Empty;

    /// <summary>Gets or sets the author badge (Core Team, Verified Dev, Trader, Community).</summary>
    public string AuthorBadge { get; set; } = "Community";

    /// <summary>Gets or sets the markdown thread content.</summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>Gets or sets the upvote count.</summary>
    public int Upvotes { get; set; }

    /// <summary>Gets or sets the reply count.</summary>
    public int RepliesCount { get; set; }

    /// <summary>Gets or sets the creation timestamp.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Gets or sets the replies to this thread.</summary>
    public ICollection<CommunityReply> Replies { get; set; } = [];
}

/// <summary>
/// A reply in a community discussion thread.
/// </summary>
internal sealed class CommunityReply
{
    /// <summary>Gets or sets the primary key.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the parent thread identifier.</summary>
    public Guid ThreadId { get; set; }

    /// <summary>Gets or sets the parent thread.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public CommunityThread? Thread { get; set; }

    /// <summary>Gets or sets the author display name.</summary>
    public string AuthorName { get; set; } = string.Empty;

    /// <summary>Gets or sets the author badge.</summary>
    public string AuthorBadge { get; set; } = "Community";

    /// <summary>Gets or sets the reply content.</summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>Gets or sets the upvote count.</summary>
    public int Upvotes { get; set; }

    /// <summary>Gets or sets the creation timestamp.</summary>
    public DateTimeOffset CreatedAt { get; set; }
}
