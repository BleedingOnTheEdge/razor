// -----------------------------------------------------------------------------
// <copyright file="PaymentConfigEndpoints.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using System;
using System.Threading;
using System.Threading.Tasks;
using Cloud.Services;
using FastEndpoints;

/// <summary>Request payload for saving payment gateway configurations.</summary>
internal sealed class SavePaymentConfigRequest
{
    /// <summary>Gets or sets the JSON configuration string.</summary>
    public string ConfigJson { get; set; } = string.Empty;
}

/// <summary>Saves payment provider configurations securely in cluster settings.</summary>
internal sealed class SavePaymentConfigEndpoint(AdminSettingsService settings)
    : Endpoint<SavePaymentConfigRequest, object>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/admin/payments/config");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Save marketplace payment provider configuration";
            s.Description = "Persists payment gateway configurations securely in backend system settings.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(SavePaymentConfigRequest req, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(req);
        var current = await settings.GetSettingsAsync(ct).ConfigureAwait(false);
        current.PaymentProvidersJson = req.ConfigJson;
        await settings.SaveSettingsAsync(current, ct).ConfigureAwait(false);
        await Send.OkAsync(new { success = true, updatedAt = DateTimeOffset.UtcNow }, ct).ConfigureAwait(false);
    }
}

/// <summary>Retrieves payment provider configurations from cluster settings.</summary>
internal sealed class GetPaymentConfigEndpoint(AdminSettingsService settings)
    : EndpointWithoutRequest<object>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/admin/payments/config");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Get marketplace payment provider configuration";
            s.Description = "Retrieves stored payment gateway configurations from backend settings.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CancellationToken ct)
    {
        var current = await settings.GetSettingsAsync(ct).ConfigureAwait(false);
        await Send.OkAsync(new { configJson = current.PaymentProvidersJson }, ct).ConfigureAwait(false);
    }
}
