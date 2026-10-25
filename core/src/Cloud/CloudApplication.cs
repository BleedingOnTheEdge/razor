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
using Cloud.Events;
using Cloud.Services;
using FastEndpoints;
using FastEndpoints.Swagger;
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
        using (IServiceScope scope = app.Services.CreateScope())
        {
            IDbContextFactory<CloudDbContext> factory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<CloudDbContext>>();
            CloudDbContext db = await factory.CreateDbContextAsync().ConfigureAwait(false);
            await using (db.ConfigureAwait(false))
            {
                await db.Database.EnsureCreatedAsync().ConfigureAwait(false);
                await DatabaseSchemaCompatibility.EnsureSchemaAsync(db).ConfigureAwait(false);

                CloudOptions cloudOptions = scope.ServiceProvider.GetRequiredService<CloudOptions>();
                if (!string.Equals(cloudOptions.ConnectionString, "Host=unused;Database=unused", StringComparison.OrdinalIgnoreCase))
                {
                    IPasswordHasher<User> passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
                    await DatabaseSeeder.SeedAsync(db, passwordHasher).ConfigureAwait(false);
                }
            }
        }

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
        services.AddDbContextFactory<CloudDbContext>(contextOptions =>
            contextOptions.UseNpgsql(options.ConnectionString, npgsqlOptions =>
                npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));

        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddSingleton<EngineRegistrationService>();
        services.AddSingleton<EngineAuthenticationService>();
        services.AddSingleton<InstanceManifestService>();
        services.AddSingleton<CommandService>();
        services.AddSingleton<ProfileService>();
        services.AddSingleton<HeartbeatService>();
        services.AddSingleton<EngineSessionRegistry>();
        services.AddSingleton<IClientEventBroadcaster, ClientEventBroadcaster>();
        services.AddSingleton<LineageService>();
        services.AddSingleton<RunReportService>();
        services.AddSingleton<RunRankingService>();
        services.AddSingleton<FlowOrchestrator>();
        services.AddSingleton<MarketplaceService>();
        services.AddSingleton<TicketService>();
        services.AddSingleton<CommunityService>();
        services.AddSingleton<UserService>();
        services.AddSingleton<AdminSettingsService>();
        services.AddSingleton<BundleService>();

        services.AddCors();

        // FastEndpoints marks every route it registers with authorization metadata, and ASP.NET Core refuses
        // to run a route whose metadata no middleware can act on — so the pipeline needs the authentication
        // and authorization middleware, and those need their services. Nothing is registered to authenticate
        // with and no policy is added, so this stack can never admit a caller: the management API key filter
        // is still the only thing that authorises a request, and the Engine still authenticates through the
        // protocol handshake. Without these registrations every API request fails with a 500.
        services.AddAuthentication(authOptions =>
        {
            authOptions.DefaultAuthenticateScheme = "ApiKey";
            authOptions.DefaultChallengeScheme = "ApiKey";
        }).AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>("ApiKey", _ => { });
        services.AddAuthorization();

        services.AddFastEndpoints();
        services.SwaggerDocument(options =>
        {
            options.DocumentSettings = settings =>
            {
                settings.Title = "Razor Cloud Control Plane API";
                settings.Version = "v1.0.0";
                settings.Description = "OpenAPI specification for Razor Cloud REST endpoints, real-time events, and marketplace.";
            };
        });
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

        app.UseCors(policy => policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod());

        app.UseSwaggerGen();
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

        });
    }

    private sealed class ApiKeyAuthenticationHandler(
        Microsoft.Extensions.Options.IOptionsMonitor<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions> options,
        Microsoft.Extensions.Logging.ILoggerFactory logger,
        System.Text.Encodings.Web.UrlEncoder encoder)
        : Microsoft.AspNetCore.Authentication.AuthenticationHandler<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<Microsoft.AspNetCore.Authentication.AuthenticateResult> HandleAuthenticateAsync()
        {
            if (Context.User.Identity?.IsAuthenticated == true)
            {
                return Task.FromResult(Microsoft.AspNetCore.Authentication.AuthenticateResult.Success(
                    new Microsoft.AspNetCore.Authentication.AuthenticationTicket(Context.User, Scheme.Name)));
            }

            return Task.FromResult(Microsoft.AspNetCore.Authentication.AuthenticateResult.NoResult());
        }
    }
}
