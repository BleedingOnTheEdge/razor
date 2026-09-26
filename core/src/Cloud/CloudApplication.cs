// -----------------------------------------------------------------------------
// <copyright file="CloudApplication.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud;

using System.Text.Json.Serialization;
using Cloud.Data;
using Cloud.Endpoints;
using Cloud.Engine;
using Cloud.Services;
using FastEndpoints;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Bootstraps the Razor Cloud SaaS control plane web application (002-030-160 §17.1).
/// </summary>
/// <remarks>
/// The composition root is separate from <c>Program</c> so that the integration tests can build the same
/// service graph and pipeline against another database provider, without a PostgreSQL server.
/// </remarks>
internal static class CloudApplication
{
    /// <summary>
    /// Builds the application without running it.
    /// </summary>
    /// <param name="args">Command-line arguments passed to the host.</param>
    /// <param name="configureServices">
    /// An optional hook that adjusts the service registrations after the defaults are applied. The
    /// integration tests use it to swap the Npgsql provider for one that needs no server.
    /// </param>
    /// <returns>The built application.</returns>
    /// <exception cref="InvalidOperationException">A required setting is missing or unusable.</exception>
    internal static WebApplication Build(string[] args, Action<IServiceCollection>? configureServices = null)
    {
        WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

        CloudOptions options = CloudOptions.FromConfiguration(builder.Configuration);
        options.Validate();

        ConfigureServices(builder.Services, options);

        configureServices?.Invoke(builder.Services);

        WebApplication app = builder.Build();
        ConfigurePipeline(app, options);
        return app;
    }

    /// <summary>
    /// Builds and runs the Cloud web application.
    /// </summary>
    /// <param name="args">Command-line arguments passed to the host.</param>
    /// <returns>A task that completes when the host has stopped.</returns>
    internal static async Task RunAsync(string[] args)
    {
        WebApplication app = Build(args);
        await app.RunAsync().ConfigureAwait(false);
    }

    /// <summary>
    /// Registers the services the control plane needs.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="options">The validated Cloud options.</param>
    private static void ConfigureServices(IServiceCollection services, CloudOptions options)
    {
        services.AddSingleton(options);
        services.AddSingleton(TimeProvider.System);

        // A factory rather than a scoped context: an Engine session is long lived and would otherwise hold a
        // context for the whole connection, while each protocol message needs its own short lived unit of work.
        services.AddDbContextFactory<CloudDbContext>(contextOptions => contextOptions.UseNpgsql(options.ConnectionString));

        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddSingleton<EngineRegistrationService>();
        services.AddSingleton<EngineAuthenticationService>();
        services.AddSingleton<InstanceManifestService>();
        services.AddSingleton<CommandService>();
        services.AddSingleton<ProfileService>();
        services.AddSingleton<HeartbeatService>();
        services.AddSingleton<EngineSessionRegistry>();

        // FastEndpoints marks every route it registers with authorization metadata, and ASP.NET Core refuses
        // to run a route whose metadata no middleware can act on — so the pipeline needs the authentication
        // and authorization middleware, and those need their services. Nothing is registered to authenticate
        // with and no policy is added, so this stack can never admit a caller: the management API key filter
        // is still the only thing that authorises a request, and the Engine still authenticates through the
        // protocol handshake. Without these registrations every API request fails with a 500.
        services.AddAuthentication();
        services.AddAuthorization();

        services.AddFastEndpoints();
    }

    /// <summary>
    /// Configures the request pipeline.
    /// </summary>
    /// <param name="app">The application.</param>
    /// <param name="options">The validated Cloud options.</param>
    private static void ConfigurePipeline(WebApplication app, CloudOptions options)
    {
        app.UseWebSockets();

        // The Engine WebSocket authenticates through the protocol handshake, so it is mounted before the
        // management API key filter and is never subject to it.
        app.Map(EngineSocketHandler.Path, EngineSocketHandler.HandleAsync);

        app.UseManagementApiKey(options);

        // FastEndpoints attaches authorization metadata to every route it registers, and ASP.NET Core
        // refuses to execute a route that carries that metadata when no middleware can act on it: the
        // request fails with "contains authorization metadata, but a middleware was not found that supports
        // authorization" before the endpoint runs. Cloud does not use ASP.NET Core authentication — the
        // management API key filter above is the whole authorisation model, and the Engine authenticates
        // through the protocol handshake — so these two calls add no policy of their own. They exist so the
        // pipeline matches the metadata FastEndpoints declares; without them the whole API answers 500.
        app.UseAuthentication();
        app.UseAuthorization();

        app.UseFastEndpoints(config =>
        {
            // Enums travel as their names so that a stored status or extension kind is as readable on the API
            // as it is in the database.
            config.Serializer.Options.Converters.Add(new JsonStringEnumConverter());

            // Every endpoint is marked allow-anonymous, and that is deliberate rather than a weakening.
            // FastEndpoints gives each route an authorization requirement, and with no authentication scheme
            // registered that requirement can only fail — the authorisation middleware would challenge and
            // throw "no authenticationScheme was specified". Cloud has no ASP.NET Core identity to carry a
            // policy: the shared management key in ManagementApiKeyMiddleware is the authorisation model for
            // the whole /api surface, and the Engine authenticates with the protocol handshake. Marking the
            // routes anonymous states that plainly instead of leaving a requirement that nothing can satisfy.
            config.Endpoints.Configurator = definition => definition.AllowAnonymous();
        });
    }
}
