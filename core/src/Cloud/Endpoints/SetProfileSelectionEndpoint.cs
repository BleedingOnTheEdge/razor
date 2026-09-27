// -----------------------------------------------------------------------------
// <copyright file="SetProfileSelectionEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Engine;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The body of a profile selection change.
/// </summary>
internal sealed class SetProfileSelectionRequest
{
    /// <summary>Gets or sets the Cloud-side identifier of the target instance.</summary>
    public Guid InstanceId { get; set; }

    /// <summary>Gets or sets the slot the extension occupies: Adapter, Strategy, Indicator, NeuralNetwork or HookPlugin.</summary>
    public string? Kind { get; set; }

    /// <summary>Gets or sets the extension name, as reported in the Engine's manifest.</summary>
    public string? Name { get; set; }

    /// <summary>Gets or sets a value indicating whether the extension should be selected.</summary>
    public bool IsActive { get; set; }
}

/// <summary>
/// The result of a profile selection change.
/// </summary>
internal sealed class SetProfileSelectionResponse
{
    /// <summary>Gets or sets the resolved active selection set after the change.</summary>
    public ActiveSetView ActiveSelections { get; set; } = new();

    /// <summary>Gets or sets the activation command queued for the Engine, when one was queued.</summary>
    public Guid? ActivationCommandId { get; set; }
}

/// <summary>
/// Activates or deactivates one extension in an instance's profile and queues the resulting
/// <c>ActivateExtensions</c> command for the Engine (002-030-160 §17.1; 002-030-090 §10.3 step 10).
/// </summary>
/// <remarks>
/// The selection is only accepted for an extension the Engine has reported, so an operator cannot select
/// something the Engine cannot load. When the change leaves the profile without both an adapter and a
/// strategy, nothing is queued: there is nothing the Engine's activation command could apply yet.
/// </remarks>
internal sealed class SetProfileSelectionEndpoint(ProfileService profiles, EngineSessionRegistry registry)
    : Endpoint<SetProfileSelectionRequest, SetProfileSelectionResponse>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Put("/api/instances/{instanceId}/profile/selections");
        Summary(summary =>
        {
            summary.Summary = "Select or clear an extension in an instance profile";
            summary.Description =
                "Updates the stored profile and queues the ActivateExtensions command that applies the "
                + "resulting active set to the Engine.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(SetProfileSelectionRequest request, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse(request.Kind, ignoreCase: true, out ExtensionKind kind) || !Enum.IsDefined(kind))
        {
            AddError(
                nameof(request.Kind),
                "Kind must be one of Adapter, Strategy, Indicator, NeuralNetwork or HookPlugin.");
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, cancellationToken).ConfigureAwait(false);
            return;
        }

        SelectionOutcome outcome = await profiles
            .SetSelectionAsync(request.InstanceId, kind, request.Name, request.IsActive, cancellationToken)
            .ConfigureAwait(false);

        switch (outcome.Status)
        {
            case ServiceStatus.NotFound:
                await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
                return;
            case ServiceStatus.Rejected:
                AddError(outcome.FailureReason ?? "The request was refused.");
                await Send.ErrorsAsync(StatusCodes.Status409Conflict, cancellationToken).ConfigureAwait(false);
                return;
            default:
                break;
        }

        CommandOutcome? activation = await profiles
            .ApplyActiveSetAsync(request.InstanceId, cancellationToken)
            .ConfigureAwait(false);

        Guid? activationCommandId = null;
        if (activation is { Status: ServiceStatus.Succeeded, Command: not null })
        {
            activationCommandId = activation.Command.Id;
            await registry
                .TryDeliverPendingCommandsAsync(request.InstanceId, cancellationToken)
                .ConfigureAwait(false);
        }

        ActiveSelectionSet activeSet = outcome.ActiveSet!;
        var response = new SetProfileSelectionResponse
        {
            ActiveSelections = new ActiveSetView
            {
                Adapter = activeSet.Adapter,
                Strategy = activeSet.Strategy,
                NeuralNetwork = activeSet.NeuralNetwork,
                Indicators = activeSet.Indicators,
                HookPlugins = activeSet.HookPlugins
            },
            ActivationCommandId = activationCommandId
        };

        await Send.OkAsync(response, cancellationToken).ConfigureAwait(false);
    }
}
