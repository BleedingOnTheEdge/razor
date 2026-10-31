// -----------------------------------------------------------------------------
// <copyright file="MarketplaceAcquisitionsEndpoints.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.Endpoints;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Cloud.Data;
using Cloud.Services;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Retrieves all acquisitions and licenses for the caller account.
/// </summary>
internal sealed class ListAcquisitionsEndpoint(
    IDbContextFactory<CloudDbContext> factory,
    CloudOptions options,
    JwtTokenService jwt)
    : EndpointWithoutRequest<IReadOnlyList<AcquisitionResponseView>>
{
    /// <inheritdoc/>
    public override void Configure()
    {
        Get("/api/marketplace/acquisitions");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "List account marketplace acquisitions";
            s.Description = "Returns all licenses and extension packages acquired by the authenticated workspace.";
        });
    }

    /// <inheritdoc/>
    public override async Task HandleAsync(CancellationToken ct)
    {
        Guid? tenantId = TenantContext.ResolveAccountId(HttpContext, options, jwt);
        using var db = factory.CreateDbContext();

        var query = db.MarketplaceAcquisitions.AsNoTracking();
        if (tenantId.HasValue)
        {
            query = query.Where(a => a.AccountId == tenantId.Value);
        }

        var list = await query
            .OrderByDescending(a => a.AcquiredAt)
            .Select(a => new AcquisitionResponseView
            {
                Id = a.Id,
                ItemId = a.MarketplaceItemId,
                AccountId = a.AccountId,
                LicenseKey = a.LicenseKey,
                AcquiredAt = a.AcquiredAt
            })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        await Send.OkAsync(list, ct).ConfigureAwait(false);
    }
}
