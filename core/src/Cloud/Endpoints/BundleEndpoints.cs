// -----------------------------------------------------------------------------
// <copyright file="BundleEndpoints.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using Cloud.Data;
using Cloud.Services;
using FastEndpoints;
using Microsoft.AspNetCore.Http;

/// <summary>Query filters for trading bundles.</summary>
internal sealed class GetBundlesRequest
{
    /// <summary>Gets or sets the owning customer account identifier.</summary>
    public Guid? AccountId { get; set; }

    /// <summary>Gets or sets a value indicating whether to filter by public discovery.</summary>
    public bool? IsPublic { get; set; }

    /// <summary>Gets or sets an optional search term.</summary>
    public string? Search { get; set; }
}

/// <summary>Payload for creating or updating a trading bundle.</summary>
internal sealed class SaveBundleRequest
{
    /// <summary>Gets or sets the custom 8-12 alphanumeric bundle identifier.</summary>
    public string? Id { get; set; }

    /// <summary>Gets or sets the owning customer account identifier.</summary>
    public Guid AccountId { get; set; }

    /// <summary>Gets or sets the human-readable bundle name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the description.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Gets or sets the package documentation markdown text.</summary>
    public string DocumentationMarkdown { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether the bundle is publicly discoverable.</summary>
    public bool IsPublic { get; set; }

    /// <summary>Gets or sets a value indicating whether the bundle is published to the marketplace.</summary>
    public bool PublishedToMarketplace { get; set; }

    /// <summary>Gets or sets the bundle price.</summary>
    public decimal Price { get; set; }

    /// <summary>Gets or sets the pricing currency (IRT, USDT, USD, Free).</summary>
    public string Currency { get; set; } = "Free";

    /// <summary>Gets or sets the primary strategy slot identifier.</summary>
    public string StrategySlotId { get; set; } = string.Empty;

    /// <summary>Gets or sets the JSON-serialized array of adapter slot identifiers.</summary>
    public string AdapterSlotIdsJson { get; set; } = "[]";

    /// <summary>Gets or sets the JSON-serialized array of hook interceptor identifiers.</summary>
    public string HookSlotIdsJson { get; set; } = "[]";

    /// <summary>Gets or sets the JSON-serialized key-value map of default parameters.</summary>
    public string DefaultConfigurationsJson { get; set; } = "{}";
}

/// <summary>Payload for creating a bundle state snapshot.</summary>
internal sealed class CreateSnapshotRequest
{
    /// <summary>Gets or sets the snapshot version (e.g. v1.0.0).</summary>
    public string Version { get; set; } = string.Empty;

    /// <summary>Gets or sets the snapshot name or label.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the snapshot state JSON.</summary>
    public string SnapshotStateJson { get; set; } = "{}";
}

/// <summary>Payload for attaching a DNA to a bundle snapshot.</summary>
internal sealed class AttachDnaRequest
{
    /// <summary>Gets or sets the DNA lineage identifier.</summary>
    public string DnaId { get; set; } = string.Empty;

    /// <summary>Gets or sets the DNA descriptor name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the parameters JSON payload.</summary>
    public string ParametersJson { get; set; } = "{}";

    /// <summary>Gets or sets the backtest verification badge (Untested, Tested, Backtested).</summary>
    public string BacktestStatus { get; set; } = "Untested";

    /// <summary>Gets or sets the fitness score.</summary>
    public double? Fitness { get; set; }

    /// <summary>Gets or sets the net profit.</summary>
    public decimal? NetProfit { get; set; }

    /// <summary>Gets or sets the report summary.</summary>
    public string? ReportSummary { get; set; }
}

/// <summary>Endpoint listing all trading bundles matching query parameters.</summary>
internal sealed class GetBundlesEndpoint(BundleService bundles) : Endpoint<GetBundlesRequest, IReadOnlyList<TradingBundle>>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/bundles");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "List trading bundles";
            s.Description = "Returns all bundles accessible to the account or publicly discoverable.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(GetBundlesRequest req, CancellationToken ct)
    {
        var list = await bundles.GetBundlesAsync(req.AccountId, req.IsPublic, req.Search, ct).ConfigureAwait(false);
        await Send.OkAsync(list, ct).ConfigureAwait(false);
    }
}

/// <summary>Endpoint fetching a single bundle by unique alphanumeric identifier.</summary>
internal sealed class GetBundleByIdEndpoint(BundleService bundles) : EndpointWithoutRequest<TradingBundle>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/bundles/{id}");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Get trading bundle by ID";
            s.Description = "Retrieves bundle metadata, component slot bindings, and historical snapshots.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CancellationToken ct)
    {
        var id = Route<string>("id");
        if (string.IsNullOrWhiteSpace(id))
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        var bundle = await bundles.GetBundleByIdAsync(id, ct).ConfigureAwait(false);
        if (bundle is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(bundle, ct).ConfigureAwait(false);
    }
}

/// <summary>Endpoint creating a new trading bundle.</summary>
internal sealed class CreateBundleEndpoint(BundleService bundles) : Endpoint<SaveBundleRequest, TradingBundle>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/bundles");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Create a trading bundle";
            s.Description = "Persists a new bundle with component slots, hook bindings, and default parameter configs.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(SaveBundleRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
        {
            AddError("Bundle name cannot be empty.");
            await Send.ErrorsAsync(StatusCodes.Status400BadRequest, ct).ConfigureAwait(false);
            return;
        }

        var bundle = new TradingBundle
        {
            Id = req.Id?.Trim() ?? string.Empty,
            AccountId = req.AccountId,
            Name = req.Name.Trim(),
            Description = req.Description?.Trim() ?? string.Empty,
            DocumentationMarkdown = req.DocumentationMarkdown?.Trim() ?? string.Empty,
            IsPublic = req.IsPublic,
            PublishedToMarketplace = req.PublishedToMarketplace,
            Price = Math.Max(0, req.Price),
            Currency = string.IsNullOrWhiteSpace(req.Currency) ? "Free" : req.Currency.Trim(),
            StrategySlotId = req.StrategySlotId?.Trim() ?? string.Empty,
            AdapterSlotIdsJson = string.IsNullOrWhiteSpace(req.AdapterSlotIdsJson) ? "[]" : req.AdapterSlotIdsJson.Trim(),
            HookSlotIdsJson = string.IsNullOrWhiteSpace(req.HookSlotIdsJson) ? "[]" : req.HookSlotIdsJson.Trim(),
            DefaultConfigurationsJson = string.IsNullOrWhiteSpace(req.DefaultConfigurationsJson) ? "{}" : req.DefaultConfigurationsJson.Trim(),
        };

        var created = await bundles.CreateBundleAsync(bundle, ct).ConfigureAwait(false);
        await Send.CreatedAtAsync<GetBundleByIdEndpoint>(new { id = created.Id }, created, cancellation: ct).ConfigureAwait(false);
    }
}

/// <summary>Endpoint updating an existing trading bundle.</summary>
internal sealed class UpdateBundleEndpoint(BundleService bundles) : Endpoint<SaveBundleRequest, TradingBundle>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Put("/api/bundles/{id}");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Update a trading bundle";
            s.Description = "Modifies bundle attributes, slots, or default parameter configurations.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(SaveBundleRequest req, CancellationToken ct)
    {
        var id = Route<string>("id");
        if (string.IsNullOrWhiteSpace(id))
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        var update = new TradingBundle
        {
            Name = req.Name?.Trim() ?? string.Empty,
            Description = req.Description?.Trim() ?? string.Empty,
            DocumentationMarkdown = req.DocumentationMarkdown?.Trim() ?? string.Empty,
            IsPublic = req.IsPublic,
            PublishedToMarketplace = req.PublishedToMarketplace,
            Price = Math.Max(0, req.Price),
            Currency = string.IsNullOrWhiteSpace(req.Currency) ? "Free" : req.Currency.Trim(),
            StrategySlotId = req.StrategySlotId?.Trim() ?? string.Empty,
            AdapterSlotIdsJson = string.IsNullOrWhiteSpace(req.AdapterSlotIdsJson) ? "[]" : req.AdapterSlotIdsJson.Trim(),
            HookSlotIdsJson = string.IsNullOrWhiteSpace(req.HookSlotIdsJson) ? "[]" : req.HookSlotIdsJson.Trim(),
            DefaultConfigurationsJson = string.IsNullOrWhiteSpace(req.DefaultConfigurationsJson) ? "{}" : req.DefaultConfigurationsJson.Trim(),
        };

        var result = await bundles.UpdateBundleAsync(id, update, ct).ConfigureAwait(false);
        if (result is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(result, ct).ConfigureAwait(false);
    }
}

/// <summary>Endpoint deleting an existing trading bundle.</summary>
internal sealed class DeleteBundleEndpoint(BundleService bundles) : EndpointWithoutRequest
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Delete("/api/bundles/{id}");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Delete a trading bundle";
            s.Description = "Removes a bundle and all of its historical snapshots.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CancellationToken ct)
    {
        var id = Route<string>("id");
        if (string.IsNullOrWhiteSpace(id))
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        var deleted = await bundles.DeleteBundleAsync(id, ct).ConfigureAwait(false);
        if (!deleted)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.NoContentAsync(ct).ConfigureAwait(false);
    }
}

/// <summary>Endpoint creating a change snapshot for a bundle.</summary>
internal sealed class CreateBundleSnapshotEndpoint(BundleService bundles) : Endpoint<CreateSnapshotRequest, BundleSnapshot>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/bundles/{id}/snapshots");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Create a bundle snapshot";
            s.Description = "Captures an immutable snapshot of slots, hooks, and parameter gene states.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CreateSnapshotRequest req, CancellationToken ct)
    {
        var bundleId = Route<string>("id");
        if (string.IsNullOrWhiteSpace(bundleId))
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        var snapshot = await bundles.CreateSnapshotAsync(bundleId, req.Version, req.Name, req.SnapshotStateJson, ct).ConfigureAwait(false);
        if (snapshot is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(snapshot, ct).ConfigureAwait(false);
    }
}

/// <summary>Endpoint attaching a parameter DNA to a bundle snapshot.</summary>
internal sealed class AttachSnapshotDnaEndpoint(BundleService bundles) : Endpoint<AttachDnaRequest, BundleDna>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Post("/api/bundles/snapshots/{snapshotId}/dnas");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Attach backtested DNA to snapshot";
            s.Description = "Links an optimized or tested DNA to a bundle snapshot with its verification status.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(AttachDnaRequest req, CancellationToken ct)
    {
        var snapshotId = Route<Guid>("snapshotId");
        if (snapshotId == Guid.Empty)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        var dna = new BundleDna
        {
            DnaId = req.DnaId?.Trim() ?? string.Empty,
            Name = req.Name?.Trim() ?? string.Empty,
            ParametersJson = req.ParametersJson?.Trim() ?? "{}",
            BacktestStatus = string.IsNullOrWhiteSpace(req.BacktestStatus) ? "Untested" : req.BacktestStatus.Trim(),
            Fitness = req.Fitness,
            NetProfit = req.NetProfit,
            ReportSummary = req.ReportSummary?.Trim(),
        };

        var attached = await bundles.AttachDnaToSnapshotAsync(snapshotId, dna, ct).ConfigureAwait(false);
        if (attached is null)
        {
            await Send.NotFoundAsync(ct).ConfigureAwait(false);
            return;
        }

        await Send.OkAsync(attached, ct).ConfigureAwait(false);
    }
}
