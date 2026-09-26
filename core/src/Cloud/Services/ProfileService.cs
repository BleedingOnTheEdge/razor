// -----------------------------------------------------------------------------
// <copyright file="ProfileService.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using System.Text.Json;
using Cloud.Data;
using Cloud.Engine;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Owns the per-instance profile: the active adapter, strategy, indicators, neural network and hook
/// plugin selections (002-030-160 §17.1), and their delivery to the Engine
/// (002-030-090 §10.3 step 10).
/// </summary>
/// <remarks>
/// <para>
/// A selection may only be activated for an extension the Engine has actually reported, which is why the
/// manifest must be stored before a profile is useful. Activating a name the Engine has never reported
/// would produce a command that the Engine rejects at activation time, so it is refused here instead.
/// </para>
/// <para>
/// An activation is applied through the Engine's <c>ActivateExtensions</c> command, whose handler requires
/// both an adapter and a strategy and accepts an optional neural network and hook plugin list. Indicators
/// are part of the stored profile but have no field in that command: the Engine's handler cannot receive
/// them, so Cloud does not pretend to deliver them. See the PR notes for this divergence.
/// </para>
/// </remarks>
internal sealed class ProfileService(
    IDbContextFactory<CloudDbContext> contextFactory,
    CommandService commandService,
    CloudOptions options)
{
    /// <summary>
    /// Loads an instance together with its manifest, its selections and the resolved active set.
    /// </summary>
    /// <param name="instanceId">The instance identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The snapshot, or <see langword="null"/> when no instance with that identifier exists.</returns>
    internal async Task<InstanceStateSnapshot?> GetInstanceStateAsync(Guid instanceId, CancellationToken cancellationToken)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        EngineInstance? instance = await LoadAsync(db, instanceId, cancellationToken).ConfigureAwait(false);
        if (instance is null)
        {
            return null;
        }

        List<ProfileSelection> selections = [.. (instance.Profile?.Selections ?? [])
            .OrderBy(selection => selection.Kind)
            .ThenBy(selection => selection.Name, StringComparer.Ordinal)];

        List<ExtensionManifestEntry> manifest = [.. instance.ManifestEntries
            .OrderBy(entry => entry.Kind)
            .ThenBy(entry => entry.Name, StringComparer.Ordinal)];

        return new InstanceStateSnapshot(instance, manifest, selections, BuildActiveSet(selections));
    }

    /// <summary>
    /// Activates or deactivates one extension for an instance.
    /// </summary>
    /// <param name="instanceId">The instance identifier.</param>
    /// <param name="kind">The slot the extension occupies.</param>
    /// <param name="name">The extension name, as reported in the manifest.</param>
    /// <param name="isActive">Whether the extension should be selected.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The active set after the change, or the reason the change was refused.</returns>
    /// <remarks>
    /// Activating a single-slot extension (<see cref="ExtensionKind.Adapter"/>, <see cref="ExtensionKind.Strategy"/>
    /// and <see cref="ExtensionKind.NeuralNetwork"/>) deactivates whichever extension previously held the
    /// slot, so the profile cannot describe two active adapters at once.
    /// </remarks>
    internal async Task<SelectionOutcome> SetSelectionAsync(
        Guid instanceId,
        ExtensionKind kind,
        string? name,
        bool isActive,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return new SelectionOutcome(ServiceStatus.Rejected, "The extension name is required.", null);
        }

        string trimmedName = name.Trim();

        using CloudDbContext db = contextFactory.CreateDbContext();

        EngineInstance? instance = await LoadAsync(db, instanceId, cancellationToken).ConfigureAwait(false);
        if (instance is null)
        {
            return new SelectionOutcome(ServiceStatus.NotFound, "No Engine instance with that identifier.", null);
        }

        instance.Profile ??= new EngineProfile { Id = Guid.NewGuid(), EngineInstanceId = instance.Id };
        EngineProfile profile = instance.Profile;

        if (isActive)
        {
            bool reported = instance.ManifestEntries
                .Any(entry => entry.Kind == kind && string.Equals(entry.Name, trimmedName, StringComparison.Ordinal));
            if (!reported)
            {
                return new SelectionOutcome(
                    ServiceStatus.Rejected,
                    $"The Engine has not reported a {kind} named '{trimmedName}'.",
                    null);
            }

            if (IsSingleSlot(kind))
            {
                foreach (ProfileSelection other in profile.Selections.Where(selection =>
                    selection.Kind == kind
                    && selection.IsActive
                    && !string.Equals(selection.Name, trimmedName, StringComparison.Ordinal)))
                {
                    other.IsActive = false;
                }
            }
        }

        ProfileSelection? selection = profile.Selections
            .FirstOrDefault(candidate => candidate.Kind == kind
                && string.Equals(candidate.Name, trimmedName, StringComparison.Ordinal));

        if (selection is null)
        {
            selection = new ProfileSelection
            {
                Id = Guid.NewGuid(),
                EngineProfileId = profile.Id,
                Kind = kind,
                Name = trimmedName
            };
            profile.Selections.Add(selection);
        }

        selection.IsActive = isActive;

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new SelectionOutcome(ServiceStatus.Succeeded, null, BuildActiveSet(profile.Selections));
    }

    /// <summary>
    /// Queues an <c>ActivateExtensions</c> command carrying the instance's current active set.
    /// </summary>
    /// <param name="instanceId">The instance identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// The queued command, or <see langword="null"/> when the profile cannot be applied — either the
    /// instance does not exist or no adapter and strategy are both selected.
    /// </returns>
    /// <remarks>
    /// A profile without both an adapter and a strategy is not an error: it is simply not yet complete, and
    /// the Engine's <c>ActivateExtensions</c> handler would reject it. No command is queued in that case.
    /// </remarks>
    internal async Task<CommandOutcome?> ApplyActiveSetAsync(Guid instanceId, CancellationToken cancellationToken)
    {
        using CloudDbContext db = contextFactory.CreateDbContext();

        EngineInstance? instance = await LoadAsync(db, instanceId, cancellationToken).ConfigureAwait(false);
        if (instance?.Profile is null)
        {
            return null;
        }

        ActiveSelectionSet activeSet = BuildActiveSet(instance.Profile.Selections);
        if (activeSet.Adapter is null || activeSet.Strategy is null)
        {
            return null;
        }

        return await commandService.SubmitAsync(
            instanceId,
            EngineCommandIds.ActivateExtensions,
            EngineCommandIds.ActivateExtensionsName,
            BuildActivateExtensionsParameters(activeSet),
            options.ActivateExtensionsTimeoutSeconds,
            cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Resolves the active selections into one set per slot.
    /// </summary>
    /// <param name="selections">The profile's selections.</param>
    /// <returns>The active set.</returns>
    /// <exception cref="ArgumentNullException"><paramref name="selections"/> is <see langword="null"/>.</exception>
    internal static ActiveSelectionSet BuildActiveSet(IEnumerable<ProfileSelection> selections)
    {
        ArgumentNullException.ThrowIfNull(selections);

        List<ProfileSelection> active = [.. selections.Where(selection => selection.IsActive)];

        string? Single(ExtensionKind kind) => active
            .Where(selection => selection.Kind == kind)
            .Select(selection => selection.Name)
            .OrderBy(name => name, StringComparer.Ordinal)
            .FirstOrDefault();

        return new ActiveSelectionSet(
            Single(ExtensionKind.Adapter),
            Single(ExtensionKind.Strategy),
            Single(ExtensionKind.NeuralNetwork),
            [.. active.Where(s => s.Kind == ExtensionKind.Indicator).Select(s => s.Name).OrderBy(n => n, StringComparer.Ordinal)],
            [.. active.Where(s => s.Kind == ExtensionKind.HookPlugin).Select(s => s.Name).OrderBy(n => n, StringComparer.Ordinal)]);
    }

    /// <summary>
    /// Determines whether a slot holds at most one extension.
    /// </summary>
    /// <param name="kind">The slot.</param>
    /// <returns><see langword="true"/> for the adapter, strategy and neural network slots.</returns>
    internal static bool IsSingleSlot(ExtensionKind kind)
    {
        return kind is ExtensionKind.Adapter or ExtensionKind.Strategy or ExtensionKind.NeuralNetwork;
    }

    /// <summary>
    /// Builds the <c>ActivateExtensions</c> parameter object for an active set.
    /// </summary>
    /// <param name="activeSet">The active set to apply.</param>
    /// <returns>The parameters as a JSON object, using the property names the Engine's handler reads.</returns>
    /// <remarks>
    /// The optional fields are omitted rather than written as JSON <c>null</c>, because the Engine's handler
    /// tests each parameter for the type it expects and treats anything else as absent.
    /// </remarks>
    internal static string BuildActivateExtensionsParameters(ActiveSelectionSet activeSet)
    {
        ArgumentNullException.ThrowIfNull(activeSet);

        Dictionary<string, object?> parameters = new(StringComparer.Ordinal)
        {
            [EngineCommandIds.ActivateExtensionsParameters.Adapter] = activeSet.Adapter,
            [EngineCommandIds.ActivateExtensionsParameters.Strategy] = activeSet.Strategy
        };

        if (activeSet.NeuralNetwork is not null)
        {
            parameters[EngineCommandIds.ActivateExtensionsParameters.NeuralNetwork] = activeSet.NeuralNetwork;
        }

        if (activeSet.HookPlugins.Count > 0)
        {
            parameters[EngineCommandIds.ActivateExtensionsParameters.Hooks] = activeSet.HookPlugins;
        }

        return JsonSerializer.Serialize(parameters);
    }

    private static async Task<EngineInstance?> LoadAsync(
        CloudDbContext db,
        Guid instanceId,
        CancellationToken cancellationToken)
    {
        return await db.EngineInstances
            .Include(i => i.Profile!).ThenInclude(p => p.Selections)
            .Include(i => i.ManifestEntries)
            .FirstOrDefaultAsync(i => i.Id == instanceId, cancellationToken)
            .ConfigureAwait(false);
    }
}
