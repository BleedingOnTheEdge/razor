// -----------------------------------------------------------------------------
// <copyright file="CloudApiEndpointTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Cloud.Data;
using Cloud.Engine;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Tests of the management API over a real request pipeline: the routes, the management key gate, the
/// status codes and the payloads, plus the two decisions the surface makes that the services do not —
/// that the key gate fails closed, and that only a manifest-reported extension can be selected
/// (002-030-160 §17.1; 002-030-090 §10.3).
/// </summary>
public sealed class CloudApiEndpointTests
{
    [Fact]
    public async Task RegisterEngine_IssuesAnInstanceAndStoresOnlyItsHashedApiKey()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededAccount account = await factory.Database.SeedAccountAsync().ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await PostJsonAsync(
            client,
            "/api/engines",
            new
            {
                AccountId = account.AccountId,
                LicenseId = account.LicenseId,
                EngineId = "engine-api",
                Name = "registered over HTTP"
            }).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        RegisteredEngine registered = await ReadAsync<RegisteredEngine>(response).ConfigureAwait(true);
        Assert.NotEqual(Guid.Empty, registered.InstanceId);
        Assert.Equal("engine-api", registered.EngineId);

        // The key is returned once and stored only as a hash, so the response is the operator's only chance
        // to record it; that is asserted here because losing it would make the instance unreachable.
        Assert.False(string.IsNullOrWhiteSpace(registered.ApiKey));

        using CloudDbContext db = factory.Database.CreateDbContext();
        EngineInstance stored = await db.EngineInstances
            .SingleAsync(instance => instance.Id == registered.InstanceId)
            .ConfigureAwait(true);
        Assert.NotEqual(registered.ApiKey, stored.ApiKeyHash);
        Assert.Equal(ApiKeyHasher.Hash(registered.ApiKey), stored.ApiKeyHash);
    }

    [Fact]
    public async Task RegisterEngine_RefusesAnUnknownAccountOrLicenceAndADuplicateEngineId()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededAccount account = await factory.Database.SeedAccountAsync().ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();

        using HttpResponseMessage unknownAccount = await PostJsonAsync(
            client,
            "/api/engines",
            new { AccountId = Guid.NewGuid(), LicenseId = account.LicenseId, EngineId = "engine-x", Name = "x" }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, unknownAccount.StatusCode);

        using HttpResponseMessage unknownLicence = await PostJsonAsync(
            client,
            "/api/engines",
            new { AccountId = account.AccountId, LicenseId = Guid.NewGuid(), EngineId = "engine-y", Name = "y" }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, unknownLicence.StatusCode);

        // A request that names neither an Engine identifier nor a display name is refused outright. The
        // difference between this and the two above is the point: an unnameable request is a client fault
        // (409), while an account that does not exist is a missing resource (404).
        using HttpResponseMessage unnamed = await PostJsonAsync(
            client,
            "/api/engines",
            new { AccountId = account.AccountId, LicenseId = account.LicenseId, EngineId = "  ", Name = "n" }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Conflict, unnamed.StatusCode);

        var registration = new EngineRegistrationService(factory.Database, TimeProvider.System);
        await registration
            .RegisterAsync(account.AccountId, account.LicenseId, "engine-dup", "first", CancellationToken.None)
            .ConfigureAwait(true);

        // The Engine identifier is unique, so a second registration of the same one is a conflict and not a
        // second instance: two instances claiming one Engine identity could not both be served.
        using HttpResponseMessage duplicate = await PostJsonAsync(
            client,
            "/api/engines",
            new { AccountId = account.AccountId, LicenseId = account.LicenseId, EngineId = "engine-dup", Name = "second" }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
    }

    [Fact]
    public async Task SubmitCommand_QueuesACommandAndReportsThatItWasNotDelivered()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await PostJsonAsync(
            client,
            $"/api/instances/{instance.InstanceId}/commands",
            new
            {
                InstanceId = instance.InstanceId,
                CommandId = EngineCommandIds.ActivateExtensions,
                CommandType = EngineCommandIds.ActivateExtensionsName,
                Parameters = "{\"Adapter\":\"AdapterA\",\"Strategy\":\"StrategyA\"}",
                TimeoutSeconds = 30
            }).ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        SubmittedCommand submitted = await ReadAsync<SubmittedCommand>(response).ConfigureAwait(true);
        Assert.NotEqual(Guid.Empty, submitted.CommandId);
        Assert.False(string.IsNullOrWhiteSpace(submitted.CorrelationId));
        Assert.Equal(nameof(CommandStatus.Pending), submitted.Status);

        // No Engine has connected in this test, so the command is queued rather than written; reporting
        // "delivered" here would be a lie the operator would act on.
        Assert.False(submitted.Delivered);
    }

    [Fact]
    public async Task SubmitCommand_RefusesAnUnknownInstanceAndAnUnusableCommand()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        using HttpClient client = factory.CreateAuthorisedClient();

        using HttpResponseMessage unknownInstance = await PostJsonAsync(
            client,
            $"/api/instances/{Guid.NewGuid()}/commands",
            new { CommandId = 1200, CommandType = "RunBacktest" }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, unknownInstance.StatusCode);

        using HttpResponseMessage zeroId = await PostJsonAsync(
            client,
            $"/api/instances/{instance.InstanceId}/commands",
            new { CommandId = 0, CommandType = "RunBacktest" }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, zeroId.StatusCode);

        using HttpResponseMessage noType = await PostJsonAsync(
            client,
            $"/api/instances/{instance.InstanceId}/commands",
            new { CommandId = 1200, CommandType = "  " }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, noType.StatusCode);

        using HttpResponseMessage badParameters = await PostJsonAsync(
            client,
            $"/api/instances/{instance.InstanceId}/commands",
            new { CommandId = 1200, CommandType = "RunBacktest", Parameters = "[1,2,3]" }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, badParameters.StatusCode);

        using HttpResponseMessage badTimeout = await PostJsonAsync(
            client,
            $"/api/instances/{instance.InstanceId}/commands",
            new { CommandId = 1200, CommandType = "RunBacktest", TimeoutSeconds = 0 }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, badTimeout.StatusCode);
    }

    [Fact]
    public async Task GetCommand_ReturnsTheStoredResultAndEveryProgressReport()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        var commands = new CommandService(factory.Database, TestOptions(), TimeProvider.System, NullLogger<CommandService>.Instance);
        CommandOutcome queued = await commands
            .SubmitAsync(instance.InstanceId, 1200, "RunBacktest", "{\"Symbol\":\"EURUSD\"}", null, CancellationToken.None)
            .ConfigureAwait(true);

        string correlationId = queued.Command!.CorrelationId;
        Assert.True(await commands
            .RecordProgressAsync(instance.InstanceId, correlationId, "{\"Percent\":25}", CancellationToken.None)
            .ConfigureAwait(true));
        Assert.True(await commands
            .CompleteAsync(instance.InstanceId, correlationId, isSuccess: true, "{\"NetProfit\":12.5}", null, CancellationToken.None)
            .ConfigureAwait(true));

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await client
            .GetAsync(Relative($"/api/commands/{queued.Command.Id}"))
            .ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        CommandView view = await ReadAsync<CommandView>(response).ConfigureAwait(true);
        Assert.Equal(queued.Command.Id, view.CommandId);
        Assert.Equal(instance.InstanceId, view.InstanceId);
        Assert.Equal(1200, view.NumericCommandId);
        Assert.Equal("RunBacktest", view.CommandType);
        Assert.Equal(correlationId, view.CorrelationId);
        Assert.Equal("Completed", view.Status);
        Assert.NotNull(view.CompletedAt);
        Assert.Equal(12.5, view.Result!.Value.GetProperty("NetProfit").GetDouble());
        Assert.Null(view.ErrorMessage);
        ProgressView progress = Assert.Single(view.Progress);
        Assert.Equal(25, progress.Payload!.Value.GetProperty("Percent").GetInt32());
    }

    [Fact]
    public async Task GetCommand_ReturnsNotFoundAndToleratesAStoredPayloadThatIsNotJson()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();

        using HttpResponseMessage missing = await client
            .GetAsync(Relative($"/api/commands/{Guid.NewGuid()}"))
            .ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

        // A stored payload Cloud cannot parse must read as "no result" rather than failing the request: the
        // row is the Engine's evidence, and a client asking for the command should still see its state.
        Guid commandId = Guid.NewGuid();
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            db.EngineCommands.Add(new EngineCommand
            {
                Id = commandId,
                EngineInstanceId = instance.InstanceId,
                NumericCommandId = 1200,
                CommandType = "RunBacktest",
                CorrelationId = Guid.NewGuid().ToString(),
                Status = CommandStatus.Completed,
                SubmittedAt = DateTimeOffset.UnixEpoch,
                ResultPayloadJson = "not json at all"
            });

            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        using HttpResponseMessage unparseable = await client
            .GetAsync(Relative($"/api/commands/{commandId}"))
            .ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, unparseable.StatusCode);

        CommandView view = await ReadAsync<CommandView>(unparseable).ConfigureAwait(true);
        Assert.Null(view.Result);
        Assert.Equal("Completed", view.Status);
    }

    [Fact]
    public async Task GetInstance_ReturnsTheReportedManifestAndTheConfiguredSelections()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        var manifests = new InstanceManifestService(factory.Database, TimeProvider.System);
        Assert.NotNull(await manifests
            .ApplyAsync(
                instance.InstanceId,
                new EngineManifestReport(["AdapterB", "AdapterA"], ["StrategyA"], ["IndicatorB", "IndicatorA"], [], ["HookA"]),
                CancellationToken.None)
            .ConfigureAwait(true));

        var profiles = new ProfileService(
            factory.Database,
            new CommandService(factory.Database, TestOptions(), TimeProvider.System, NullLogger<CommandService>.Instance),
            TestOptions());

        await profiles
            .SetSelectionAsync(instance.InstanceId, ExtensionKind.Adapter, "AdapterA", isActive: true, CancellationToken.None)
            .ConfigureAwait(true);
        await profiles
            .SetSelectionAsync(instance.InstanceId, ExtensionKind.Indicator, "IndicatorA", isActive: true, CancellationToken.None)
            .ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage response = await client
            .GetAsync(Relative($"/api/instances/{instance.InstanceId}"))
            .ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        InstanceView view = await ReadAsync<InstanceView>(response).ConfigureAwait(true);
        Assert.Equal(instance.InstanceId, view.InstanceId);
        Assert.Equal("engine-1", view.EngineId);
        Assert.Equal("Active", view.Status);
        Assert.Equal("AdapterA", view.ActiveSelections.Adapter);

        // StrategyA is reported by the Engine but has not been selected, so it must not appear in the active
        // set: the manifest is what the Engine *can* load, and the profile is what the operator chose.
        Assert.Null(view.ActiveSelections.Strategy);
        Assert.Equal(["IndicatorA"], view.ActiveSelections.Indicators);

        // The same distinction holds in the selection list, which carries the configured slots only.
        Assert.Equal(["Adapter", "Indicator"], view.Selections.Select(selection => selection.Kind).ToArray());
        Assert.Equal(["AdapterA", "IndicatorA"], view.Selections.Select(selection => selection.Name).ToArray());

        // The manifest is ordered by slot and then by name, so the response is stable between calls.
        Assert.Equal(
            ["Adapter", "Adapter", "Strategy", "Indicator", "Indicator", "HookPlugin"],
            view.Manifest.Select(entry => entry.Kind).ToArray());
        Assert.Equal(
            ["AdapterA", "AdapterB", "StrategyA", "IndicatorA", "IndicatorB", "HookA"],
            view.Manifest.Select(entry => entry.Name).ToArray());
    }

    [Fact]
    public async Task GetInstance_ReturnsNotFoundForAnUnknownInstance()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateAuthorisedClient();

        using HttpResponseMessage response = await client
            .GetAsync(Relative($"/api/instances/{Guid.NewGuid()}"))
            .ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task SetProfileSelection_QueuesTheActivationOnlyOnceAProfileIsComplete()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        await SeedManifestAsync(factory, instance.InstanceId).ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();

        // An adapter alone cannot be applied: the Engine's ActivateExtensions handler requires both an
        // adapter and a strategy, so nothing is queued yet.
        using HttpResponseMessage adapterOnly = await PutJsonAsync(
            client,
            $"/api/instances/{instance.InstanceId}/profile/selections",
            new { Kind = "adapter", Name = "AdapterA", IsActive = true }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, adapterOnly.StatusCode);
        ProfileSelectionView adapterView = await ReadAsync<ProfileSelectionView>(adapterOnly).ConfigureAwait(true);
        Assert.Null(adapterView.ActivationCommandId);
        Assert.Equal("AdapterA", adapterView.ActiveSelections.Adapter);

        using HttpResponseMessage complete = await PutJsonAsync(
            client,
            $"/api/instances/{instance.InstanceId}/profile/selections",
            new { Kind = "Strategy", Name = "StrategyA", IsActive = true }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, complete.StatusCode);

        ProfileSelectionView completeView = await ReadAsync<ProfileSelectionView>(complete).ConfigureAwait(true);
        Assert.Equal("AdapterA", completeView.ActiveSelections.Adapter);
        Assert.Equal("StrategyA", completeView.ActiveSelections.Strategy);
        Assert.NotNull(completeView.ActivationCommandId);

        using HttpResponseMessage activation = await client
            .GetAsync(Relative($"/api/commands/{completeView.ActivationCommandId}"))
            .ConfigureAwait(true);
        CommandView view = await ReadAsync<CommandView>(activation).ConfigureAwait(true);
        Assert.Equal(EngineCommandIds.ActivateExtensions, view.NumericCommandId);
        Assert.Equal(EngineCommandIds.ActivateExtensionsName, view.CommandType);
    }

    [Fact]
    public async Task SetProfileSelection_RefusesAnUnknownKindAnUnknownInstanceAndAnUnreportedExtension()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        await SeedManifestAsync(factory, instance.InstanceId).ConfigureAwait(true);

        using HttpClient client = factory.CreateAuthorisedClient();
        string selectionsUrl = $"/api/instances/{instance.InstanceId}/profile/selections";

        using HttpResponseMessage missingKind = await PutJsonAsync(
            client,
            selectionsUrl,
            new { Kind = (string?)null, Name = "AdapterA", IsActive = true }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, missingKind.StatusCode);

        using HttpResponseMessage unknownKind = await PutJsonAsync(
            client,
            selectionsUrl,
            new { Kind = "NotASlot", Name = "AdapterA", IsActive = true }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, unknownKind.StatusCode);

        // A numeric string parses as the enum's underlying type but is not a defined member, which is a
        // different rejection path from a name that does not parse at all.
        using HttpResponseMessage undefinedKind = await PutJsonAsync(
            client,
            selectionsUrl,
            new { Kind = "99", Name = "AdapterA", IsActive = true }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.BadRequest, undefinedKind.StatusCode);

        using HttpResponseMessage unknownInstance = await PutJsonAsync(
            client,
            $"/api/instances/{Guid.NewGuid()}/profile/selections",
            new { Kind = "Adapter", Name = "AdapterA", IsActive = true }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.NotFound, unknownInstance.StatusCode);

        // The Engine never reported "AdapterZ", so activating it would produce a command the Engine cannot
        // honour; Cloud refuses it at the profile instead.
        using HttpResponseMessage unreported = await PutJsonAsync(
            client,
            selectionsUrl,
            new { Kind = "Adapter", Name = "AdapterZ", IsActive = true }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Conflict, unreported.StatusCode);

        using HttpResponseMessage blankName = await PutJsonAsync(
            client,
            selectionsUrl,
            new { Kind = "Adapter", Name = "   ", IsActive = true }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Conflict, blankName.StatusCode);
    }

    [Fact]
    public async Task AnInstanceWhoseProfileRowIsMissingStillReadsAndCanBeSelected()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);
        await SeedManifestAsync(factory, instance.InstanceId).ConfigureAwait(true);

        // Registration creates the profile, so an instance without one is a row written before that was true.
        // It must still be readable — an operator asking about such an instance needs an answer, not an error —
        // and selecting an extension must repair the profile rather than fail.
        using (CloudDbContext db = factory.Database.CreateDbContext())
        {
            EngineProfile profile = await db.EngineProfiles
                .SingleAsync(candidate => candidate.EngineInstanceId == instance.InstanceId)
                .ConfigureAwait(true);

            db.EngineProfiles.Remove(profile);
            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(true);
        }

        using HttpClient client = factory.CreateAuthorisedClient();
        using HttpResponseMessage before = await client
            .GetAsync(Relative($"/api/instances/{instance.InstanceId}"))
            .ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, before.StatusCode);

        InstanceView view = await ReadAsync<InstanceView>(before).ConfigureAwait(true);
        Assert.Empty(view.Selections);
        Assert.Null(view.ActiveSelections.Adapter);

        using HttpResponseMessage selected = await PutJsonAsync(
            client,
            $"/api/instances/{instance.InstanceId}/profile/selections",
            new { Kind = "Adapter", Name = "AdapterA", IsActive = true }).ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.OK, selected.StatusCode);

        ProfileSelectionView selectionView = await ReadAsync<ProfileSelectionView>(selected).ConfigureAwait(true);
        Assert.Equal("AdapterA", selectionView.ActiveSelections.Adapter);

        // The selection was written against a profile that had to be created for it, which is the repair this
        // test exists to pin: the row and the selection are both there afterwards.
        using CloudDbContext after = factory.Database.CreateDbContext();
        EngineProfile repaired = await after.EngineProfiles
            .Include(candidate => candidate.Selections)
            .SingleAsync(candidate => candidate.EngineInstanceId == instance.InstanceId)
            .ConfigureAwait(true);
        Assert.Equal("AdapterA", Assert.Single(repaired.Selections).Name);
    }

    [Fact]
    public async Task EveryApiRouteIsRefusedWithoutTheManagementKey()
    {
        using var factory = new CloudWebApplicationFactory();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(factory.Database).ConfigureAwait(true);

        using HttpClient client = factory.CreateClient();
        Uri[] routes =
        [
            Relative("/api/engines"),
            Relative($"/api/instances/{instance.InstanceId}"),
            Relative($"/api/instances/{instance.InstanceId}/commands"),
            Relative($"/api/instances/{instance.InstanceId}/profile/selections"),
            Relative($"/api/commands/{Guid.NewGuid()}")
        ];

        foreach (Uri route in routes)
        {
            using HttpResponseMessage response = await client.GetAsync(route).ConfigureAwait(true);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        // A wrong key of the same length must be refused too: the comparison is fixed-time, so a mismatch
        // anywhere in the key cannot be distinguished from a mismatch at the first byte.
        client.DefaultRequestHeaders.Add(
            Cloud.Endpoints.ManagementApiKeyMiddleware.HeaderName,
            new string('x', CloudWebApplicationFactory.ManagementApiKey.Length));

        using HttpResponseMessage wrongKey = await client
            .GetAsync(Relative("/api/engines"))
            .ConfigureAwait(true);
        Assert.Equal(HttpStatusCode.Unauthorized, wrongKey.StatusCode);
    }

    [Fact]
    public async Task TheEngineSocketPathIsNotBehindTheManagementKey()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateClient();

        // An Engine never holds the management key; the /engine path authenticates through the protocol
        // handshake, so it must not answer 401 here. A plain GET is not a WebSocket upgrade, and the
        // endpoint answers that with a 400.
        using HttpResponseMessage response = await client
            .GetAsync(Relative(EngineSocketHandler.Path))
            .ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ANonApiRouteIsServedWithoutTheManagementKey()
    {
        using var factory = new CloudWebApplicationFactory();
        using HttpClient client = factory.CreateClient();

        // The key gates the management API, not the whole host: a route outside /api must reach the
        // pipeline so that a future non-API surface is not accidentally locked behind the operator key.
        using HttpResponseMessage response = await client
            .GetAsync(Relative("/not-an-api-route"))
            .ConfigureAwait(true);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static CloudOptions TestOptions()
    {
        return new CloudOptions { ConnectionString = "unused", ManagementApiKey = "test-key" };
    }

    private static Uri Relative(string url)
    {
        return new Uri(url, UriKind.Relative);
    }

    private static async Task<HttpResponseMessage> PostJsonAsync(HttpClient client, string url, object body)
    {
        using StringContent content = JsonBody(body);
        return await client.PostAsync(Relative(url), content, CancellationToken.None).ConfigureAwait(true);
    }

    private static async Task<HttpResponseMessage> PutJsonAsync(HttpClient client, string url, object body)
    {
        using StringContent content = JsonBody(body);
        using var request = new HttpRequestMessage(HttpMethod.Put, Relative(url))
        {
            Content = content
        };

        return await client.SendAsync(request, CancellationToken.None).ConfigureAwait(true);
    }

    private static StringContent JsonBody(object body)
    {
        return new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
    }

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        T? value = await response.Content
            .ReadFromJsonAsync<T>(new JsonSerializerOptions(JsonSerializerDefaults.Web))
            .ConfigureAwait(true);

        return value!;
    }

    private static async Task SeedManifestAsync(CloudWebApplicationFactory factory, Guid instanceId)
    {
        var manifests = new InstanceManifestService(factory.Database, TimeProvider.System);
        await manifests
            .ApplyAsync(
                instanceId,
                new EngineManifestReport(["AdapterA"], ["StrategyA"], ["IndicatorA"], ["ModelA"], ["HookA"]),
                CancellationToken.None)
            .ConfigureAwait(true);
    }

    private sealed record RegisteredEngine(Guid InstanceId, string EngineId, string ApiKey);

    private sealed record SubmittedCommand(Guid CommandId, string CorrelationId, string Status, bool Delivered);

    private sealed record CommandView(
        Guid CommandId,
        Guid InstanceId,
        int NumericCommandId,
        string CommandType,
        string CorrelationId,
        string Status,
        DateTimeOffset? CompletedAt,
        JsonElement? Result,
        string? ErrorMessage,
        IReadOnlyList<ProgressView> Progress);

    private sealed record ProgressView(JsonElement? Payload, DateTimeOffset ReportedAt);

    private sealed record InstanceView(
        Guid InstanceId,
        string EngineId,
        string Status,
        ActiveSelectionSetView ActiveSelections,
        IReadOnlyList<ManifestEntryView> Selections,
        IReadOnlyList<ManifestEntryView> Manifest);

    private sealed record ActiveSelectionSetView(
        string? Adapter,
        string? Strategy,
        string? NeuralNetwork,
        IReadOnlyList<string> Indicators,
        IReadOnlyList<string> HookPlugins);

    private sealed record ManifestEntryView(string Kind, string Name);

    private sealed record ProfileSelectionView(ActiveSelectionSetView ActiveSelections, Guid? ActivationCommandId);
}
