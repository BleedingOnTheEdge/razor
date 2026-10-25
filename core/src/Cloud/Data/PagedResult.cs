// -----------------------------------------------------------------------------
// <copyright file="PagedResult.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Data;

/// <summary>
/// Represents a paginated query result envelope for lists and grids.
/// </summary>
/// <typeparam name="T">The item type.</typeparam>
internal sealed class PagedResult<T>
{
    /// <summary>Gets or sets the current page items.</summary>
    public required IReadOnlyList<T> Items { get; init; }

    /// <summary>Gets or sets the total count across all pages.</summary>
    public required int TotalCount { get; init; }

    /// <summary>Gets or sets the current 1-based page number.</summary>
    public required int Page { get; init; }

    /// <summary>Gets or sets the page size.</summary>
    public required int PageSize { get; init; }

    /// <summary>Gets or sets the total number of pages.</summary>
    public required int TotalPages { get; init; }
}

/// <summary>
/// Factory helpers for paged results.
/// </summary>
internal static class PagedResult
{
    /// <summary>Creates a paged result envelope from an enumerable list.</summary>
    public static PagedResult<T> Create<T>(IReadOnlyList<T> source, int? page, int? pageSize)
    {
        ArgumentNullException.ThrowIfNull(source);

        int p = Math.Max(1, page ?? 1);
        int ps = Math.Clamp(pageSize ?? 25, 1, 100);
        int total = source.Count;
        int totalPages = total > 0 ? (int)Math.Ceiling(total / (double)ps) : 1;
        var items = source.Skip((p - 1) * ps).Take(ps).ToList().AsReadOnly();

        return new PagedResult<T>
        {
            Items = items,
            TotalCount = total,
            Page = p,
            PageSize = ps,
            TotalPages = totalPages
        };
    }
}
