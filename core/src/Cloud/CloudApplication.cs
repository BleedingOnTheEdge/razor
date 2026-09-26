// -----------------------------------------------------------------------------
// <copyright file="CloudApplication.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud;

/// <summary>
/// Bootstraps the Razor Cloud SaaS control plane web application.
/// </summary>
internal static class CloudApplication
{
    /// <summary>
    /// Builds and runs the Cloud web application.
    /// </summary>
    /// <param name="args">Command-line arguments passed to the host.</param>
    /// <returns>A task that completes when the host has stopped.</returns>
    internal static async Task RunAsync(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        var app = builder.Build();

        app.MapGet("/health", () => Results.Ok(new { Status = "OK" }));

        await app.RunAsync().ConfigureAwait(false);
    }
}
