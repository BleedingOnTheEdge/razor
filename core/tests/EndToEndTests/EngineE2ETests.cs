using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Cloud.Data;
using Cloud.Engine;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;
using Xunit.Abstractions;

namespace EndToEndTests
{
    public sealed class EngineE2ETests : IDisposable
    {
        private readonly ITestOutputHelper _output;

        public EngineE2ETests(ITestOutputHelper output)
        {
            _output = output;
        }

        [Fact]
        public async Task Engine_And_Cloud_Can_Perform_Handshake_And_RoundTrip_Command()
        {
            _output.WriteLine("Test starting...");
            using var database = new CloudTestDatabase();
            
            var engineDir = Path.GetFullPath(@"..\..\..\..\..\src\Engine\bin\Debug\net10.0");
            var stateDir = Path.Combine(engineDir, "state");
            if (Directory.Exists(stateDir))
            {
                Directory.Delete(stateDir, true);
            }
            Directory.CreateDirectory(stateDir);
            var stateDbPath = Path.Combine(stateDir, "engine_state.db");
            
            // Seed a known EngineId
            using (var connection = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={stateDbPath}"))
            {
                await connection.OpenAsync().ConfigureAwait(true);
                using var cmd = connection.CreateCommand();
                cmd.CommandText = @"
                    CREATE TABLE IF NOT EXISTS Metadata (Key TEXT PRIMARY KEY, Value TEXT NOT NULL);
                    CREATE TABLE IF NOT EXISTS Tasks (TaskId TEXT PRIMARY KEY, TaskType TEXT NOT NULL, State TEXT NOT NULL, Config TEXT NOT NULL);
                    CREATE TABLE IF NOT EXISTS LiveState (TaskId TEXT PRIMARY KEY, StateJson TEXT NOT NULL);
                    CREATE TABLE IF NOT EXISTS OptimizationStates (OptimizationId TEXT PRIMARY KEY, StateJson TEXT NOT NULL);
                    CREATE TABLE IF NOT EXISTS CronJobs (JobId TEXT PRIMARY KEY, CronExpression TEXT NOT NULL, Command TEXT NOT NULL, Enabled INTEGER NOT NULL);
                    CREATE TABLE IF NOT EXISTS Schedules (ScheduleId TEXT PRIMARY KEY, ScheduledTimeUtc TEXT NOT NULL, Command TEXT NOT NULL, Repeat INTEGER NOT NULL);
                    CREATE TABLE IF NOT EXISTS ExtensionManifest (ManifestType TEXT PRIMARY KEY, ManifestJson TEXT NOT NULL);
                    CREATE TABLE IF NOT EXISTS QueuedMessages (Id INTEGER PRIMARY KEY AUTOINCREMENT, MessageType TEXT NOT NULL, PayloadJson TEXT NOT NULL, CreatedAtUtc TEXT NOT NULL, Sent INTEGER NOT NULL DEFAULT 0);
                    INSERT INTO Metadata (Key, Value) VALUES ('EngineId', 'engine-1');";
                await cmd.ExecuteNonQueryAsync().ConfigureAwait(true);
            }

            Environment.SetEnvironmentVariable("Cloud__ConnectionString", "Host=unused;Database=unused");
            Environment.SetEnvironmentVariable("Cloud__ManagementApiKey", CloudWebApplicationFactory.ManagementApiKey);

            var args = new[] { "--urls=http://127.0.0.1:0" };
            var app = Cloud.CloudApplication.Build(args, services =>
            {
                services.RemoveAll<Microsoft.EntityFrameworkCore.IDbContextFactory<CloudDbContext>>();
                services.AddSingleton<Microsoft.EntityFrameworkCore.IDbContextFactory<CloudDbContext>>(database);
            });
            
            await app.StartAsync();
            
            var server = app.Services.GetRequiredService<Microsoft.AspNetCore.Hosting.Server.IServer>();
            var addresses = server.Features.Get<Microsoft.AspNetCore.Hosting.Server.Features.IServerAddressesFeature>();
            string serverAddress = addresses?.Addresses.FirstOrDefault() ?? "http://127.0.0.1:5000";
            
            var wsEndpoint = serverAddress.Replace("http://", "ws://", StringComparison.Ordinal) + "/engine";
            _output.WriteLine($"Cloud listening on {wsEndpoint}");

            var seededInstance = await CloudWebApplicationFactory.SeedInstanceAsync(database);
            _output.WriteLine($"Seeded Instance ID: {seededInstance.InstanceId}, API Key: {seededInstance.ApiKey}");

            var engineDll = Path.GetFullPath(@"..\..\..\..\..\src\Engine\bin\Debug\net10.0\Engine.dll");
            
            var processInfo = new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = $"\"{engineDll}\" --auth=operator,{CloudTestDatabase.Password},{seededInstance.ApiKey}",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            
            processInfo.EnvironmentVariables["Razor_PRIMARY_ENDPOINT"] = wsEndpoint;
            
            using var process = new Process { StartInfo = processInfo };
            process.OutputDataReceived += (s, e) => 
            { 
                if (e.Data != null) 
                {
                    _output.WriteLine($"[ENGINE] {e.Data}"); 
                }
            };
            process.ErrorDataReceived += (s, e) => 
            { 
                if (e.Data != null) 
                {
                    _output.WriteLine($"[ENGINE ERR] {e.Data}"); 
                }
            };
            
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            
            try
            {
                var registry = app.Services.GetRequiredService<EngineSessionRegistry>();
                bool registered = await WaitUntilRegisteredAsync(registry, seededInstance.InstanceId, TimeSpan.FromSeconds(30));
                
                using (var db = database.CreateDbContext())
                {
                    var instance = await db.EngineInstances.FindAsync(new object[] { seededInstance.InstanceId }).ConfigureAwait(true);
                    _output.WriteLine($"[DEBUG] Cloud DB EngineId: {instance?.EngineId}");
                }

                using (var connection = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={stateDbPath}"))
                {
                    await connection.OpenAsync().ConfigureAwait(true);
                    using var cmd = connection.CreateCommand();
                    cmd.CommandText = "SELECT Value FROM Metadata WHERE Key = 'EngineId'";
                    var engineDbId = await cmd.ExecuteScalarAsync().ConfigureAwait(true);
                    _output.WriteLine($"[DEBUG] Engine DB EngineId: {engineDbId}");
                }

                Assert.True(registered, "Engine failed to register with Cloud within the timeout.");
                
                _output.WriteLine("Engine successfully registered. Submitting command...");
                
                var commandService = app.Services.GetRequiredService<CommandService>();
                var submitOutcome = await commandService.SubmitAsync(
                    seededInstance.InstanceId,
                    numericCommandId: 1903,
                    commandType: "GetEngineVersion",
                    parametersJson: "{}",
                    timeoutSeconds: 60,
                    cancellationToken: CancellationToken.None);
                
                Assert.Equal(ServiceStatus.Succeeded, submitOutcome.Status);
                var command = submitOutcome.Command!;
                _output.WriteLine($"Command submitted with ID {command.Id}. Waiting for completion...");

                // Wake up the EngineSession to push the command
                await registry.TryDeliverPendingCommandsAsync(seededInstance.InstanceId, CancellationToken.None).ConfigureAwait(true);

                // Poll until command completes
                bool completed = false;
                for (int i = 0; i < 30; i++)
                {
                    await Task.Delay(1000);
                    var currentCommand = await commandService.GetAsync(command.Id, CancellationToken.None);
                    if (currentCommand != null && (currentCommand.Status == CommandStatus.Completed || currentCommand.Status == CommandStatus.Failed))
                    {
                        Assert.Equal(CommandStatus.Completed, currentCommand.Status);
                        _output.WriteLine($"Command completed! Result: {currentCommand.ResultPayloadJson}");
                        completed = true;
                        break;
                    }
                }
                
                Assert.True(completed, "Command did not complete within the timeout.");
            }
            finally
            {
                if (!process.HasExited)
                {
                    process.Kill();
                }
                
                await app.StopAsync();
                await app.DisposeAsync();
            }
        }

        private static async Task<bool> WaitUntilRegisteredAsync(EngineSessionRegistry registry, Guid instanceId, TimeSpan timeout)
        {
            var start = DateTime.UtcNow;
            while (DateTime.UtcNow - start < timeout)
            {
                bool hasSession = await registry.TryDeliverPendingCommandsAsync(instanceId, CancellationToken.None).ConfigureAwait(true);
                if (hasSession)
                {
                    return true;
                }
                await Task.Delay(500).ConfigureAwait(true);
            }
            return false;
        }

        public void Dispose()
        {
            GC.SuppressFinalize(this);
        }
    }
}
