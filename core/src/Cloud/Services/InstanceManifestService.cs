// -----------------------------------------------------------------------------
// <copyright file="InstanceManifestService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Stores the extension catalogue an Engine reports, and reconciles the instance's profile against it
/// (002-030-090 §10.3 steps 8 to 10).
/// </summary>
/// <remarks>
/// The reported manifest is authoritative for what exists on an instance, so it replaces the stored
/// catalogue rather than merging into it: an extension that disappears from the report is no longer
/// installable, and a selection that points at it is deactivated rather than left dangling. The
/// comparison is done in memory against the loaded rows so that a replacement never issues an insert and a
/// delete of the same (kind, name) in one unit of work, which the unique index would reject.
/// </remarks>
internal sealed class InstanceManifestService(
    IDbContextFactory<CloudDbContext> contextFactory,
    TimeProvider timeProvider)
{
    /// <summary>
    /// Applies an Engine's reported manifest to its stored catalogue.
    /// </summary>
    /// <param name="instanceId">The reporting instance identifier.</param>
    /// <param name="report">The parsed manifest.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// The number of extensions stored, or <see langword="null"/> when no instance with that identifier
    /// exists.
    /// </returns>
    internal async Task<int?> ApplyAsync(
        Guid instanceId,
        EngineManifestReport report,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(report);

        using CloudDbContext db = contextFactory.CreateDbContext();

        EngineInstance? instance = await db.EngineInstances
            .Include(i => i.Profile!).ThenInclude(p => p.Selections)
            .Include(i => i.ManifestEntries)
            .FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken)
            .ConfigureAwait(false);
        if (instance is null)
        {
            return null;
        }

        DateTimeOffset now = timeProvider.GetUtcNow();
        IReadOnlyList<(ExtensionKind Kind, string Name)> reported = report.ToEntries();
        HashSet<(ExtensionKind Kind, string Name)> reportedSet = [.. reported];

        List<ExtensionManifestEntry> obsolete = [.. instance.ManifestEntries
            .Where(entry => !reportedSet.Contains((entry.Kind, entry.Name)))];
        db.ExtensionManifestEntries.RemoveRange(obsolete);

        Dictionary<(ExtensionKind Kind, string Name), ExtensionManifestEntry> stored = instance.ManifestEntries
            .Where(entry => reportedSet.Contains((entry.Kind, entry.Name)))
            .ToDictionary(entry => (entry.Kind, entry.Name));

        foreach ((ExtensionKind kind, string name) in reported)
        {
            if (stored.TryGetValue((kind, name), out ExtensionManifestEntry? existing))
            {
                existing.ReportedAt = now;
            }
            else
            {
                // Added through the set, not through the loaded navigation. An entity that becomes reachable
                // only because it was appended to a tracked instance's collection is not reliably detected as
                // new: EF Core's change tracker sees a client-assigned key that is already populated and
                // issues an UPDATE, which affects no rows and fails the unit of work. DbSet.Add states the
                // intent explicitly.
                db.ExtensionManifestEntries.Add(new ExtensionManifestEntry
                {
                    Id = Guid.NewGuid(),
                    EngineInstanceId = instance.Id,
                    Kind = kind,
                    Name = name,
                    ReportedAt = now
                });
            }
        }

        if (instance.Profile is not null)
        {
            foreach (ProfileSelection selection in instance.Profile.Selections)
            {
                if (selection.IsActive && !reportedSet.Contains((selection.Kind, selection.Name)))
                {
                    selection.IsActive = false;
                }
            }
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return reported.Count;
    }
}
