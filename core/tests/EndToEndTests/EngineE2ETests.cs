using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
using Cloud.Data;
using Cloud.Engine;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit.Abstractions;

[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace EndToEndTests
{
    public sealed class EngineE2ETests : IDisposable
    {
        private readonly ITestOutputHelper _output;
        private readonly string _engineDir;
        private readonly string _engineDll;

        public EngineE2ETests(ITestOutputHelper output)
        {
            _output = output;
            _engineDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "src", "Engine", "bin", "Debug", "net10.0"));
            _engineDll = Path.Combine(_engineDir, "Engine.dll");
        }

        [Fact]
        public async Task Engine_And_Cloud_Can_Perform_Handshake_And_RoundTrip_Command()
        {
            _output.WriteLine("=== Test 1: Handshake and RoundTrip Command ===");
            using var database = new CloudTestDatabase();
            SetupStateDirectory(_engineDir);

            var app = await StartCloudAppAsync(database, port: 0).ConfigureAwait(true);
            var wsEndpoint = GetWsEndpoint(app);
            _output.WriteLine($"Cloud listening on {wsEndpoint}");

            var seededInstance = await CloudWebApplicationFactory.SeedInstanceAsync(database).ConfigureAwait(true);
            _output.WriteLine($"Seeded Instance ID: {seededInstance.InstanceId}");

            using var process = StartEngineProcess(_engineDir, _engineDll, wsEndpoint, seededInstance.ApiKey, _output);

            try
            {
                var registry = app.Services.GetRequiredService<EngineSessionRegistry>();
                bool registered = await WaitUntilRegisteredAsync(registry, seededInstance.InstanceId, TimeSpan.FromSeconds(30)).ConfigureAwait(true);
                Assert.True(registered, "Engine failed to register with Cloud within timeout.");

                _output.WriteLine("Engine successfully registered. Submitting GetEngineVersion command...");
                var commandService = app.Services.GetRequiredService<CommandService>();
                var submitOutcome = await commandService.SubmitAsync(
                    seededInstance.InstanceId,
                    numericCommandId: 1903,
                    commandType: "GetEngineVersion",
                    parametersJson: "{}",
                    timeoutSeconds: 60,
                    cancellationToken: CancellationToken.None).ConfigureAwait(true);

                Assert.Equal(ServiceStatus.Succeeded, submitOutcome.Status);
                var command = submitOutcome.Command!;
                _output.WriteLine($"Command submitted with ID {command.Id}. Waiting for completion...");

                await registry.TryDeliverPendingCommandsAsync(seededInstance.InstanceId, CancellationToken.None).ConfigureAwait(true);

                var completedCommand = await WaitForCommandCompletionAsync(commandService, command.Id, TimeSpan.FromSeconds(30)).ConfigureAwait(true);
                Assert.NotNull(completedCommand);
                Assert.Equal(CommandStatus.Completed, completedCommand.Status);
                _output.WriteLine($"Command completed! Result: {completedCommand.ResultPayloadJson}");
            }
            finally
            {
                KillProcessSafely(process);
                await app.StopAsync().ConfigureAwait(true);
                await app.DisposeAsync().ConfigureAwait(true);
            }
        }

        [Fact]
        public async Task Engine_And_Cloud_Reconnect_Path_Is_Exercised()
        {
            _output.WriteLine("=== Test 2: Reconnect Path Exercise (Infinite Retry) ===");
            using var database = new CloudTestDatabase();
            SetupStateDirectory(_engineDir);

            int fixedPort = GetFreePort();
            var wsEndpoint = $"ws://127.0.0.1:{fixedPort}/engine";

            var seededInstance = await CloudWebApplicationFactory.SeedInstanceAsync(database).ConfigureAwait(true);
            _output.WriteLine($"Seeded Instance ID: {seededInstance.InstanceId}");

            // Start First Cloud Instance
            var app1 = await StartCloudAppAsync(database, fixedPort).ConfigureAwait(true);
            _output.WriteLine($"Cloud 1 listening on {wsEndpoint}");

            using var process = StartEngineProcess(_engineDir, _engineDll, wsEndpoint, seededInstance.ApiKey, _output);

            try
            {
                var registry1 = app1.Services.GetRequiredService<EngineSessionRegistry>();
                bool registered1 = await WaitUntilRegisteredAsync(registry1, seededInstance.InstanceId, TimeSpan.FromSeconds(30)).ConfigureAwait(true);
                Assert.True(registered1, "Engine failed to register with Cloud 1.");
                _output.WriteLine("Engine connected to Cloud 1.");

                // Stop Cloud 1 — Engine will experience connection termination and enter infinite retry loop
                _output.WriteLine("Stopping Cloud 1 to trigger Engine offline/retry loop...");
                await app1.StopAsync().ConfigureAwait(true);
                await app1.DisposeAsync().ConfigureAwait(true);

                await Task.Delay(2000).ConfigureAwait(true); // Allow disconnect to be observed by Engine

                // Start Second Cloud Instance on the exact same port with the same database
                _output.WriteLine("Starting Cloud 2 on the same port...");
                var app2 = await StartCloudAppAsync(database, fixedPort).ConfigureAwait(true);

                try
                {
                    var registry2 = app2.Services.GetRequiredService<EngineSessionRegistry>();
                    bool registered2 = await WaitUntilRegisteredAsync(registry2, seededInstance.InstanceId, TimeSpan.FromSeconds(30)).ConfigureAwait(true);
                    Assert.True(registered2, "Engine failed to reconnect to Cloud 2.");
                    _output.WriteLine("Engine successfully reconnected to Cloud 2!");

                    // Verify command dispatching works over the reconnected session
                    var commandService2 = app2.Services.GetRequiredService<CommandService>();
                    var submitOutcome = await commandService2.SubmitAsync(
                        seededInstance.InstanceId,
                        numericCommandId: 1003,
                        commandType: "GetStatus",
                        parametersJson: "{}",
                        timeoutSeconds: 60,
                        cancellationToken: CancellationToken.None).ConfigureAwait(true);

                    Assert.Equal(ServiceStatus.Succeeded, submitOutcome.Status);
                    await registry2.TryDeliverPendingCommandsAsync(seededInstance.InstanceId, CancellationToken.None).ConfigureAwait(true);

                    var completedCommand = await WaitForCommandCompletionAsync(commandService2, submitOutcome.Command!.Id, TimeSpan.FromSeconds(30)).ConfigureAwait(true);
                    Assert.NotNull(completedCommand);
                    Assert.Equal(CommandStatus.Completed, completedCommand.Status);
                    _output.WriteLine($"Command executed successfully over reconnected session! Result: {completedCommand.ResultPayloadJson}");
                }
                finally
                {
                    await app2.StopAsync().ConfigureAwait(true);
                    await app2.DisposeAsync().ConfigureAwait(true);
                }
            }
            finally
            {
                KillProcessSafely(process);
            }
        }

        [Fact]
        public async Task Negative_Control_Unauthorized_Engine_Is_Rejected()
        {
            _output.WriteLine("=== Test 3: Negative Control — Unauthorized Engine Rejected ===");
            using var database = new CloudTestDatabase();
            SetupStateDirectory(_engineDir);

            var app = await StartCloudAppAsync(database, port: 0).ConfigureAwait(true);
            var wsEndpoint = GetWsEndpoint(app);

            var seededInstance = await CloudWebApplicationFactory.SeedInstanceAsync(database).ConfigureAwait(true);
            string invalidApiKey = "invalid_api_key_that_does_not_match_hash=";

            using var process = StartEngineProcess(_engineDir, _engineDll, wsEndpoint, invalidApiKey, _output);

            try
            {
                var registry = app.Services.GetRequiredService<EngineSessionRegistry>();
                bool registered = await WaitUntilRegisteredAsync(registry, seededInstance.InstanceId, TimeSpan.FromSeconds(8)).ConfigureAwait(true);
                Assert.False(registered, "Unauthorized engine must not be registered into EngineSessionRegistry.");
                _output.WriteLine("Negative control passed: Unauthorized engine connection was successfully rejected.");
            }
            finally
            {
                KillProcessSafely(process);
                await app.StopAsync().ConfigureAwait(true);
                await app.DisposeAsync().ConfigureAwait(true);
            }
        }

        [Fact]
        public async Task Cloud_Owned_Flow_Can_Drive_Lifecycle_Against_Real_Engine()
        {
            _output.WriteLine("=== Test 4: Cloud-Owned Flow Lifecycle Against Real Engine ===");
            using var database = new CloudTestDatabase();
            SetupStateDirectory(_engineDir);

            var app = await StartCloudAppAsync(database, port: 0).ConfigureAwait(true);
            var wsEndpoint = GetWsEndpoint(app);

            var seededInstance = await CloudWebApplicationFactory.SeedInstanceAsync(database).ConfigureAwait(true);
            using var process = StartEngineProcess(_engineDir, _engineDll, wsEndpoint, seededInstance.ApiKey, _output);

            try
            {
                var registry = app.Services.GetRequiredService<EngineSessionRegistry>();
                bool registered = await WaitUntilRegisteredAsync(registry, seededInstance.InstanceId, TimeSpan.FromSeconds(30)).ConfigureAwait(true);
                Assert.True(registered, "Engine failed to register with Cloud.");

                var flowOrchestrator = app.Services.GetRequiredService<FlowOrchestrator>();
                var commandService = app.Services.GetRequiredService<CommandService>();

                // 1. Cloud starts an original flow run
                var originalRun = await flowOrchestrator.StartOriginalRunAsync(
                    seededInstance.InstanceId,
                    RunKind.Backtest,
                    baseSeed: 42,
                    cancellationToken: CancellationToken.None).ConfigureAwait(true);

                Assert.Equal(RunStatus.Running, originalRun.Status);
                Assert.Equal(42, originalRun.BaseSeed);
                _output.WriteLine($"Started original flow run: ID {originalRun.Id}, Seed {originalRun.BaseSeed}");

                // 2. Cloud drives a command against the Engine
                var submitOutcome = await commandService.SubmitAsync(
                    seededInstance.InstanceId,
                    numericCommandId: 1003,
                    commandType: "GetStatus",
                    parametersJson: "{}",
                    timeoutSeconds: 60,
                    cancellationToken: CancellationToken.None).ConfigureAwait(true);

                Assert.Equal(ServiceStatus.Succeeded, submitOutcome.Status);
                await registry.TryDeliverPendingCommandsAsync(seededInstance.InstanceId, CancellationToken.None).ConfigureAwait(true);

                var completedCommand = await WaitForCommandCompletionAsync(commandService, submitOutcome.Command!.Id, TimeSpan.FromSeconds(30)).ConfigureAwait(true);
                Assert.NotNull(completedCommand);
                Assert.Equal(CommandStatus.Completed, completedCommand.Status);

                // 3. Pause the flow run
                var pausedRun = await flowOrchestrator.PauseRunAsync(originalRun.Id, CancellationToken.None).ConfigureAwait(true);
                Assert.Equal(RunStatus.Paused, pausedRun.Status);
                _output.WriteLine($"Flow run {originalRun.Id} paused successfully.");

                // 4. Resume with intervention (first-class checkpoint step: Spliced + Contiguous)
                var childRun = await flowOrchestrator.ResumeWithInterventionAsync(
                    originalRun.Id,
                    new ForkPoint(Step: 10, Generation: 1),
                    new InterventionSpecification(
                        StepIndex: 10,
                        PreviousFingerprint: "fp_old",
                        NewFingerprint: "fp_new",
                        Actor: "operator",
                        Reason: "Adjusted risk parameter at fork point",
                        ModificationsSummary: "RiskPercent 1.0 -> 1.5"),
                    newRandomPosition: "rng_pos_10",
                    childSeed: 43,
                    cancellationToken: CancellationToken.None).ConfigureAwait(true);

                Assert.Equal(RunStatus.Running, childRun.Status);
                Assert.Equal(RunRelation.Spliced, childRun.Relation);
                Assert.Equal(RunContinuity.Contiguous, childRun.Continuity);
                Assert.Equal(originalRun.Id, childRun.ParentRunId);
                Assert.Equal(43, childRun.BaseSeed);
                _output.WriteLine($"Child run {childRun.Id} created via intervention with Spliced + Contiguous lineage.");
            }
            finally
            {
                KillProcessSafely(process);
                await app.StopAsync().ConfigureAwait(true);
                await app.DisposeAsync().ConfigureAwait(true);
            }
        }

        private static void SetupStateDirectory(string engineDir)
        {
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            var stateDir = Path.Combine(engineDir, "state");
            if (Directory.Exists(stateDir))
            {
                try
                {
                    Directory.Delete(stateDir, true);
                }
                catch
                {
                    // Ignore if temporarily locked
                }
            }
            Directory.CreateDirectory(stateDir);
            var stateDbPath = Path.Combine(stateDir, "engine_state.db");

            using var connection = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={stateDbPath};Mode=ReadWriteCreate;");
            connection.Open();
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
                INSERT OR REPLACE INTO Metadata (Key, Value) VALUES ('EngineId', 'engine-1');";
            cmd.ExecuteNonQuery();
            connection.Close();
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        }

        private static async Task<WebApplication> StartCloudAppAsync(CloudTestDatabase database, int port = 0)
        {
            Environment.SetEnvironmentVariable("Cloud__ConnectionString", "Host=unused;Database=unused");
            Environment.SetEnvironmentVariable("Cloud__ManagementApiKey", CloudWebApplicationFactory.ManagementApiKey);

            var args = new[] { $"--urls=http://127.0.0.1:{port}" };
            var app = Cloud.CloudApplication.Build(args, services =>
            {
                services.RemoveAll<Microsoft.EntityFrameworkCore.IDbContextFactory<CloudDbContext>>();
                services.AddSingleton<Microsoft.EntityFrameworkCore.IDbContextFactory<CloudDbContext>>(database);
            });

            await app.StartAsync().ConfigureAwait(true);
            return app;
        }

        private static string GetWsEndpoint(WebApplication app)
        {
            var server = app.Services.GetRequiredService<IServer>();
            var addresses = server.Features.Get<IServerAddressesFeature>();
            string serverAddress = addresses?.Addresses.FirstOrDefault() ?? "http://127.0.0.1:5000";
            return serverAddress.Replace("http://", "ws://", StringComparison.Ordinal) + "/engine";
        }

        private static int GetFreePort()
        {
            using var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            int port = ((IPEndPoint)listener.LocalEndpoint).Port;
            listener.Stop();
            return port;
        }

        private static Process StartEngineProcess(string engineDir, string engineDll, string wsEndpoint, string apiKey, ITestOutputHelper output)
        {
            var processInfo = new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = $"\"{engineDll}\" --auth=operator,{CloudTestDatabase.Password},{apiKey}",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                WorkingDirectory = engineDir
            };

            processInfo.EnvironmentVariables["Razor_PRIMARY_ENDPOINT"] = wsEndpoint;

            var process = new Process { StartInfo = processInfo };
            process.OutputDataReceived += (s, e) =>
            {
                if (e.Data != null)
                {
                    output.WriteLine($"[ENGINE] {e.Data}");
                }
            };
            process.ErrorDataReceived += (s, e) =>
            {
                if (e.Data != null)
                {
                    output.WriteLine($"[ENGINE ERR] {e.Data}");
                }
            };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            return process;
        }

        private static void KillProcessSafely(Process process)
        {
            try
            {
                if (!process.HasExited)
                {
                    process.Kill();
                    process.WaitForExit(3000);
                }
            }
            catch
            {
                // Process may have already exited
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
                    await Task.Delay(500).ConfigureAwait(true);
                    return true;
                }
                await Task.Delay(500).ConfigureAwait(true);
            }
            return false;
        }

        private static async Task<EngineCommand?> WaitForCommandCompletionAsync(CommandService commandService, Guid commandId, TimeSpan timeout)
        {
            var start = DateTime.UtcNow;
            while (DateTime.UtcNow - start < timeout)
            {
                var command = await commandService.GetAsync(commandId, CancellationToken.None).ConfigureAwait(true);
                if (command != null && (command.Status == CommandStatus.Completed || command.Status == CommandStatus.Failed))
                {
                    return command;
                }
                await Task.Delay(500).ConfigureAwait(true);
            }
            return null;
        }

        public void Dispose()
        {
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            GC.SuppressFinalize(this);
        }
    }
}
