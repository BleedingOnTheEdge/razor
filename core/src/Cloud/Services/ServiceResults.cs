// -----------------------------------------------------------------------------
// <copyright file="ServiceResults.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Services;

using Cloud.Data;

/// <summary>
/// The outcome category of a service operation, so that the HTTP layer can map it to a status code
/// without inspecting strings.
/// </summary>
internal enum ServiceStatus
{
    /// <summary>The operation completed.</summary>
    Succeeded,

    /// <summary>The addressed aggregate does not exist.</summary>
    NotFound,

    /// <summary>The request was well formed but violates a domain rule.</summary>
    Rejected
}

/// <summary>The outcome of registering an Engine instance.</summary>
/// <param name="Status">The outcome category.</param>
/// <param name="FailureReason">Why the request was refused, when <paramref name="Status"/> is not <see cref="ServiceStatus.Succeeded"/>.</param>
/// <param name="Instance">The registered instance, on success.</param>
/// <param name="ApiKey">The plaintext API key, on success. It is not persisted and is shown only once.</param>
internal sealed record RegistrationOutcome(
    ServiceStatus Status,
    string? FailureReason,
    EngineInstance? Instance,
    string? ApiKey);

/// <summary>The outcome of authenticating an Engine.</summary>
/// <param name="Succeeded">Whether the Engine may proceed to key exchange.</param>
/// <param name="FailureReason">The reason reported to the Engine, on failure.</param>
/// <param name="Instance">The authenticated instance, on success.</param>
internal sealed record AuthenticationOutcome(
    bool Succeeded,
    string? FailureReason,
    EngineInstance? Instance);

/// <summary>The outcome of a command operation.</summary>
/// <param name="Status">The outcome category.</param>
/// <param name="FailureReason">Why the operation was refused, when it was not a success or a not-found.</param>
/// <param name="Command">The affected command, when there is one.</param>
internal sealed record CommandOutcome(
    ServiceStatus Status,
    string? FailureReason,
    EngineCommand? Command);

/// <summary>The outcome of changing a profile selection.</summary>
/// <param name="Status">The outcome category.</param>
/// <param name="FailureReason">Why the change was refused, when it was not a success or a not-found.</param>
/// <param name="ActiveSet">The active selection set after the change.</param>
internal sealed record SelectionOutcome(
    ServiceStatus Status,
    string? FailureReason,
    ActiveSelectionSet? ActiveSet);

/// <summary>
/// The user's active extension selections for one instance, resolved per
/// <see cref="ExtensionKind"/> (002-030-160 §17.1).
/// </summary>
/// <param name="Adapter">The selected broker adapter, when one is selected.</param>
/// <param name="Strategy">The selected strategy, when one is selected.</param>
/// <param name="NeuralNetwork">The selected neural network model, when one is selected.</param>
/// <param name="Indicators">The selected indicators.</param>
/// <param name="HookPlugins">The selected hook plugins.</param>
internal sealed record ActiveSelectionSet(
    string? Adapter,
    string? Strategy,
    string? NeuralNetwork,
    IReadOnlyList<string> Indicators,
    IReadOnlyList<string> HookPlugins);

/// <summary>
/// The stored configuration of one Engine instance, as returned by the state query.
/// </summary>
/// <param name="Instance">The instance itself.</param>
/// <param name="Manifest">The extensions the Engine has reported.</param>
/// <param name="Selections">Every configured selection, active and inactive.</param>
/// <param name="ActiveSet">The active selections.</param>
internal sealed record InstanceStateSnapshot(
    EngineInstance Instance,
    IReadOnlyList<ExtensionManifestEntry> Manifest,
    IReadOnlyList<ProfileSelection> Selections,
    ActiveSelectionSet ActiveSet);

/// <summary>
/// The result of handling one heartbeat.
/// </summary>
/// <param name="Status">The status to answer with.</param>
/// <param name="AuthValid">Whether the credentials backing the session are still valid.</param>
/// <param name="NextIntervalSeconds">The heartbeat interval Cloud asks the Engine to use.</param>
/// <param name="ServerTime">Cloud's current UTC time, for the Engine's clock correction.</param>
internal sealed record HeartbeatOutcome(
    string Status,
    bool AuthValid,
    int NextIntervalSeconds,
    DateTimeOffset ServerTime);
