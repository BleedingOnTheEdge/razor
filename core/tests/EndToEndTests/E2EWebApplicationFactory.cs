using System;
using System.Linq;
using Cloud.UnitTests.TestSupport;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace EndToEndTests
{
    internal sealed class E2EWebApplicationFactory : WebApplicationFactory<Program>
    {
        public string ServerAddress { get; private set; } = string.Empty;
        
        private IHost? _host;
        private readonly CloudTestDatabase _database = new CloudTestDatabase();

        internal CloudTestDatabase Database => _database;

        protected override IHost CreateHost(IHostBuilder builder)
        {
            builder.ConfigureWebHost(webHostBuilder =>
            {
                webHostBuilder.UseKestrel();
                webHostBuilder.UseUrls("http://127.0.0.1:0");
                webHostBuilder.UseSetting("Cloud:ConnectionString", "Host=unused;Database=unused");
                webHostBuilder.UseSetting("Cloud:ManagementApiKey", CloudWebApplicationFactory.ManagementApiKey);
                webHostBuilder.ConfigureServices(services =>
                {
                    services.RemoveAll<Microsoft.EntityFrameworkCore.IDbContextFactory<Cloud.Data.CloudDbContext>>();
                    services.AddSingleton<Microsoft.EntityFrameworkCore.IDbContextFactory<Cloud.Data.CloudDbContext>>(_database);
                });
            });

            _host = base.CreateHost(builder);
            return _host;
        }
        
        public void EnsureServerStarted()
        {
            if (_host == null)
            {
                _ = CreateClient();
            }
            
            var server = _host!.Services.GetRequiredService<IServer>();
            var addresses = server.Features.Get<IServerAddressesFeature>();
            ServerAddress = addresses?.Addresses.FirstOrDefault() ?? "http://127.0.0.1:5000";
        }
        
        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (disposing)
            {
                _host?.Dispose();
                _database.Dispose();
            }
        }
    }
}
