// -----------------------------------------------------------------------------
// <copyright file="ExportRunReportEndpointsTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Net;
using Cloud.UnitTests.TestSupport;
using Xunit;

public sealed class ExportRunReportEndpointsTests
{
    [Fact]
    public async Task ExportRunReportPdf_Returns501NotImplementedWithRoadmapDisclaimer()
    {
        using var factory = new CloudWebApplicationFactory();
        using var client = factory.CreateAuthorisedClient();

        var runId = Guid.NewGuid();
        var response = await client.GetAsync(new Uri($"/api/runs/{runId}/export/pdf", UriKind.Relative)).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotImplemented, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync().ConfigureAwait(true);
        Assert.Contains("v1.5", body, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("xlsx", body, StringComparison.OrdinalIgnoreCase);
    }
}
