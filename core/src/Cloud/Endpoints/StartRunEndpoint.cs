// -----------------------------------------------------------------------------
// <copyright file="StartRunEndpoint.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;

/// <summary>
/// The request for starting a new original flow run.
/// </summary>
internal sealed class StartRunRequest
{
    /// <summary>Gets or sets the target instance identifier.</summary>
    public Guid InstanceId { get; set; }

    /// <summary>Gets or sets the category of flow execution.</summary>
    public RunKind Kind { get; set; }

    /// <summary>Gets or sets the initial master seed for the run.</summary>
    public long? BaseSeed { get; set; }

    /// <summary>Gets or sets the execution parameters, slot configurations, and hook specifications.</summary>
    public string? ConfigurationJson { get; set; }
}

/// <summary>
/// Starts a new original flow run for an Engine instance (003-040).
/// </summary>
internal sealed class StartRunEndpoint(
    FlowOrchestrator orchestrator,
    EngineRegistrationService registration)
    : Endpoint<StartRunRequest, FlowRunView>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/runs");
        Summary(summary =>
        {
            summary.Summary = "Start a new flow run";
            summary.Description = "Creates and starts an original flow run (Backtest, Optimization, WalkForward) on an instance.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(StartRunRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        Guid? accountId = null;
        if (HttpContext.Request.Headers.TryGetValue("X-Account-Id", out var accVal) && Guid.TryParse(accVal, out var parsedAcc))
        {
            accountId = parsedAcc;
        }

        Guid? userId = null;
        if (HttpContext.Request.Headers.TryGetValue("X-User-Id", out var userVal) && Guid.TryParse(userVal, out var parsedUser))
        {
            userId = parsedUser;
        }

        string? userEmail = HttpContext.Request.Headers.TryGetValue("X-User-Email", out var emailVal) ? emailVal.ToString() : null;

        if (accountId.HasValue || userId.HasValue || !string.IsNullOrEmpty(userEmail))
        {
            bool hasAccess = await registration
                .CheckInstanceAccessAsync(request.InstanceId, accountId, userId, userEmail, "RunFlows", cancellationToken)
                .ConfigureAwait(false);

            if (!hasAccess)
            {
                await Send.ForbiddenAsync(cancellationToken).ConfigureAwait(false);
                return;
            }
        }
        try
        {
            FlowRun run = await orchestrator
                .StartOriginalRunAsync(request.InstanceId, request.Kind, request.BaseSeed, request.ConfigurationJson, cancellationToken)
                .ConfigureAwait(false);

            await Send.ResponseAsync(FlowRunView.FromEntity(run), StatusCodes.Status201Created, cancellationToken)
                .ConfigureAwait(false);
        }
        catch (KeyNotFoundException)
        {
            await Send.NotFoundAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (ArgumentException ex)
        {
            AddError(ex.Message);
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, cancellationToken).ConfigureAwait(false);
        }
    }
}
