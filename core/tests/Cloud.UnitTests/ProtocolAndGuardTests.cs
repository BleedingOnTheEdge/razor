// -----------------------------------------------------------------------------
// <copyright file="ProtocolAndGuardTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Text.Json;
using Cloud.Data;
using Cloud.Endpoints;
using Cloud.Protocol;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Tests of the two pieces of Cloud that decide without a network: the payload reader that turns a decoded
/// envelope into typed fields, and the management API key filter that decides whether a request is served.
/// </summary>
/// <remarks>
/// Both are guard code, and guards are exactly what a test that only drives the happy path never reaches. The
/// reader is also the boundary where a malformed frame stops being a wire problem and becomes a decision, so
/// every shape it can meet — not an object, an absent field, a JSON null, the wrong type — is asserted here.
/// </remarks>
public sealed class ProtocolAndGuardTests
{
    [Theory]
    [InlineData("null")]
    [InlineData("true")]
    [InlineData("123")]
    [InlineData("\"a string\"")]
    [InlineData("[1,2,3]")]
    public void EveryReaderTreatsAPayloadThatIsNotAnObjectAsAbsent(string payloadJson)
    {
        using JsonDocument document = JsonDocument.Parse(payloadJson);
        JsonElement payload = document.RootElement;

        // A frame whose payload is not an object cannot carry named fields at all. Reading each field as
        // absent is what lets the session carry on and report the frame as unhandled, instead of throwing on
        // an untrusted shape.
        Assert.Null(payload.ReadString("Field"));
        Assert.Null(payload.ReadInt32("Field"));
        Assert.Null(payload.ReadBoolean("Field"));
        Assert.Null(payload.ReadObject("Field"));
        Assert.Empty(payload.ReadArray("Field"));
        Assert.Empty(payload.ReadStringArray("Field"));
        Assert.Empty(payload.ReadInt32Array("Field"));
    }

    [Fact]
    public void TheReadersReturnTheTypedValueForEachKindOfField()
    {
        using JsonDocument document = JsonDocument.Parse(
            """
            {
              "Text": "value",
              "Number": 42,
              "TooLarge": 1e30,
              "True": true,
              "False": false,
              "Null": null,
              "Object": { "Nested": 1 },
              "Array": ["a", 2, "b"],
              "Numbers": [1, "two", 3]
            }
            """);
        JsonElement payload = document.RootElement;

        Assert.Equal("value", payload.ReadString("Text"));

        // A number read as a string is formatted rather than dropped, which is how a field whose type the
        // Engine widened still reaches the code that asked for it.
        Assert.Equal("42", payload.ReadString("Number"));
        Assert.Equal(42, payload.ReadInt32("Number"));
        Assert.True(payload.ReadBoolean("True"));
        Assert.False(payload.ReadBoolean("False"));
        Assert.Equal(1, payload.ReadObject("Object")!.Value.GetProperty("Nested").GetInt32());

        // A JSON null is treated as absent everywhere: the Engine omits what it does not have, but a null is
        // the other way of saying the same thing and must not become an empty string or a zero.
        Assert.Null(payload.ReadString("Null"));
        Assert.Null(payload.ReadInt32("Null"));
        Assert.Null(payload.ReadBoolean("Null"));
        Assert.Null(payload.ReadObject("Null"));

        // Entries of the wrong type inside an array are skipped rather than failing the whole field, so one
        // odd element cannot discard a manifest.
        Assert.Equal(["a", "b"], payload.ReadStringArray("Array"));
        Assert.Equal([1, 3], payload.ReadInt32Array("Numbers"));

        // The same fields, read as the wrong type, are absent rather than coerced.
        Assert.Null(payload.ReadString("Missing"));
        Assert.Null(payload.ReadInt32("Text"));
        Assert.Null(payload.ReadBoolean("Text"));
        Assert.Null(payload.ReadObject("Text"));
        Assert.Empty(payload.ReadArray("Text"));
        Assert.Empty(payload.ReadArray("Missing"));
        Assert.Empty(payload.ReadStringArray("Object"));
        Assert.Empty(payload.ReadInt32Array("Object"));

        // A field that is not there at all is absent for every reader, and a number that does not fit the
        // requested width is absent rather than truncated: silently wrapping a large generation count or a
        // tick index would be worse than reporting that it cannot be represented.
        Assert.Null(payload.ReadInt32("Missing"));
        Assert.Null(payload.ReadBoolean("Missing"));
        Assert.Null(payload.ReadObject("Missing"));
        Assert.Null(payload.ReadInt32("TooLarge"));
    }

    [Fact]
    public void AMessageWithoutABodySerialisesWithoutOneAndDescribesItself()
    {
        // A message with no payload is how Cloud sends a frame it has nothing to say beyond the discriminator
        // in — the AuthAck is the one that matters today.
        CloudMessage message = CloudMessage.Create(CloudProtocol.MessageType.AuthAck, null);

        Assert.Null(message.Payload);
        Assert.False(message.Encrypted);
        Assert.Equal(CloudProtocol.Version, message.Version);

        // The description is what an operator sees in a log line, so it names the fields that identify the
        // message without dumping the payload.
        Assert.Equal(
            $"CloudMessage {{ MessageType = {CloudProtocol.MessageType.AuthAck}, Encrypted = False, MessageId = {message.MessageId} }}",
            message.ToString());
    }

    [Fact]
    public void ASessionEstablishedWithoutANonceStillDerivesAKeyFromASalt()
    {
        using var cipher = new SessionCipher();
        using var peer = new EnginePeer();

        // The nonce is Cloud's contribution to the salt. An empty one must still produce a usable key rather
        // than a zero-length salt, and the Engine derives the same key from the same empty nonce — which is
        // what makes this a test of the agreement rather than of one side.
        cipher.EstablishSession(peer.PublicKey, string.Empty);
        peer.EstablishSession(cipher.GetPublicKey(), string.Empty);

        string plaintext = "{\"Probe\":true}";
        Assert.Equal(plaintext, peer.Decrypt(cipher.Encrypt(plaintext)));

        // The challenge is the proof that both sides derived the same key; an empty nonce must not make it
        // trivially satisfiable.
        string challenge = peer.ComputeChallenge(string.Empty);
        Assert.True(cipher.VerifyChallenge(string.Empty, challenge));
        Assert.False(cipher.VerifyChallenge(string.Empty, peer.ComputeChallenge("a different nonce")));
    }

    [Fact]
    public void ReleasingACipherTwiceIsSafe()
    {
        var cipher = new SessionCipher();
        Assert.NotNull(cipher.GetPublicKey());

        // The session and the registry can both release the cipher, so the second release must not throw or
        // touch key material that has already been disposed.
        cipher.Dispose();
        cipher.Dispose();
    }

    [Theory]
    [InlineData("/api/engines")]
    [InlineData("/api/instances/anything")]
    public async Task TheKeyFilterRefusesEveryApiRequestThatDoesNotPresentTheKey(string path)
    {
        var options = new CloudOptions { ManagementApiKey = "the-key" };
        RequestDelegate pipeline = BuildPipeline(options);

        HttpContext context = Context(path);
        await pipeline(context).ConfigureAwait(true);

        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
    }

    [Fact]
    public async Task TheKeyFilterRefusesAnEmptyHeaderAndAKeyOfTheWrongLength()
    {
        var options = new CloudOptions { ManagementApiKey = "the-key" };
        RequestDelegate pipeline = BuildPipeline(options);

        // A header present but empty is not a key, and it must not be compared as one: an empty value would
        // otherwise be a prefix of every key.
        HttpContext empty = Context("/api/engines");
        empty.Request.Headers[ManagementApiKeyMiddleware.HeaderName] = string.Empty;
        await pipeline(empty).ConfigureAwait(true);
        Assert.Equal(StatusCodes.Status401Unauthorized, empty.Response.StatusCode);

        // A key of a different length is refused without a fixed-time comparison of unequal buffers, which is
        // what keeps the length itself from being a timing signal.
        HttpContext wrongLength = Context("/api/engines");
        wrongLength.Request.Headers[ManagementApiKeyMiddleware.HeaderName] = "a-much-longer-wrong-key";
        await pipeline(wrongLength).ConfigureAwait(true);
        Assert.Equal(StatusCodes.Status401Unauthorized, wrongLength.Response.StatusCode);
    }

    [Fact]
    public async Task TheKeyFilterServesAnApiRequestThatPresentsTheKeyAndEverythingOutsideTheApi()
    {
        var options = new CloudOptions { ManagementApiKey = "the-key" };
        RequestDelegate pipeline = BuildPipeline(options);

        HttpContext authorised = Context("/api/engines");
        authorised.Request.Headers[ManagementApiKeyMiddleware.HeaderName] = "the-key";
        await pipeline(authorised).ConfigureAwait(true);
        Assert.True(authorised.Items.ContainsKey("reached"));

        // The filter is scoped to /api. A path outside it is somebody else's route and must pass through, or
        // the key would silently become the gate for the whole host.
        HttpContext elsewhere = Context("/engine");
        await pipeline(elsewhere).ConfigureAwait(true);
        Assert.True(elsewhere.Items.ContainsKey("reached"));
    }

    [Fact]
    public async Task TheKeyFilterFailsClosedWhenNoKeyIsConfigured()
    {
        // CloudOptions refuses to start without a key, so this cannot happen through the composition root;
        // the filter is still asserted to fail closed because the alternative — treating a missing key as
        // "no authentication required" — would serve the API to anyone if the startup check were ever
        // relaxed or bypassed.
        RequestDelegate pipeline = BuildPipeline(new CloudOptions { ManagementApiKey = null });

        HttpContext context = Context("/api/engines");
        await pipeline(context).ConfigureAwait(true);

        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
    }

    [Fact]
    public void TheKeyFilterRejectsMissingArguments()
    {
        ApplicationBuilder builder = new(new ServiceCollection().BuildServiceProvider());
        var options = new CloudOptions { ManagementApiKey = "the-key" };

        // The extension is called statically here because the null case is the receiver, which an extension
        // call cannot express.
        Assert.Throws<ArgumentNullException>(() => ManagementApiKeyMiddleware.UseManagementApiKey(null!, options));
        Assert.Throws<ArgumentNullException>(() => builder.UseManagementApiKey(null!));
    }

    [Fact]
    public void TheDesignTimeFactoryUsesTheConfiguredConnectionStringOrItsPlaceholder()
    {
        var factory = new CloudDbContextFactory();
        string? original = Environment.GetEnvironmentVariable(CloudOptions.ConnectionStringVariable);

        try
        {
            // The design-time factory exists so that `dotnet ef migrations add` can build the model on a
            // workstation with no PostgreSQL server. It is never used at runtime, which is why a placeholder
            // is acceptable here and would not be in CloudOptions.
            Environment.SetEnvironmentVariable(CloudOptions.ConnectionStringVariable, "Host=configured");
            using (CloudDbContext configured = factory.CreateDbContext([]))
            {
                Assert.Contains("Host=configured", configured.Database.GetConnectionString(), StringComparison.Ordinal);
            }

            Environment.SetEnvironmentVariable(CloudOptions.ConnectionStringVariable, null);
            using CloudDbContext fallback = factory.CreateDbContext([]);
            Assert.Equal(
                CloudDbContextFactory.DesignTimeFallbackConnection,
                fallback.Database.GetConnectionString());
        }
        finally
        {
            Environment.SetEnvironmentVariable(CloudOptions.ConnectionStringVariable, original);
        }
    }

    [Fact]
    public void ALicenceOnlyRunsWhileItIsActiveAndNotYetExpired()
    {
        var now = DateTimeOffset.UnixEpoch;

        // The expiry is absolute time rather than a stored status, so a licence whose window has closed is
        // refused even when nothing has moved its status to Expired yet.
        Assert.True(new License { Status = LicenseStatus.Active }.IsRunnableAt(now));
        Assert.True(new License { Status = LicenseStatus.Active, ExpiresAt = now.AddDays(1) }.IsRunnableAt(now));
        Assert.False(new License { Status = LicenseStatus.Active, ExpiresAt = now }.IsRunnableAt(now));
        Assert.False(new License { Status = LicenseStatus.Suspended }.IsRunnableAt(now));
    }

    [Fact]
    public async Task TheModelWiresBothDirectionsOfEveryNavigationCloudReads()
    {
        // Cloud reads an instance's account, licence, profile, selections, manifest and commands through the
        // navigation properties the model configures. Those are hand-written mappings, so this asserts the
        // fix-up rather than assuming EF inferred it: a missing configuration would surface as a null
        // collection at a request, not as a compiler error.
        using var database = new CloudTestDatabase();
        SeededInstance instance = await CloudWebApplicationFactory.SeedInstanceAsync(database).ConfigureAwait(true);

        var manifests = new InstanceManifestService(database, TimeProvider.System);
        await manifests
            .ApplyAsync(instance.InstanceId, new EngineManifestReport(["AdapterA"], ["StrategyA"], [], [], []), CancellationToken.None)
            .ConfigureAwait(true);

        var commands = new CommandService(
            database,
            new CloudOptions { ConnectionString = "unused", ManagementApiKey = "test-key" },
            TimeProvider.System,
            NullLogger<CommandService>.Instance);

        var profiles = new ProfileService(
            database,
            commands,
            new CloudOptions { ConnectionString = "unused", ManagementApiKey = "test-key" });
        await profiles
            .SetSelectionAsync(instance.InstanceId, ExtensionKind.Adapter, "AdapterA", isActive: true, CancellationToken.None)
            .ConfigureAwait(true);

        CommandOutcome queued = await commands
            .SubmitAsync(instance.InstanceId, 1200, "RunBacktest", null, null, CancellationToken.None)
            .ConfigureAwait(true);
        await commands
            .RecordProgressAsync(instance.InstanceId, queued.Command!.CorrelationId, "{\"Percent\":10}", CancellationToken.None)
            .ConfigureAwait(true);

        using CloudDbContext db = database.CreateDbContext();

        Account account = await db.Accounts
            .Include(candidate => candidate.Users)
            .Include(candidate => candidate.Licenses)
                .ThenInclude(license => license.Instances)
            .SingleAsync(candidate => candidate.Id == instance.AccountId)
            .ConfigureAwait(true);

        Assert.Single(account.Users);
        Assert.Single(account.Licenses);
        Assert.Single(account.Licenses.Single().Instances);

        User user = await db.Users.SingleAsync().ConfigureAwait(true);
        Assert.NotNull(user.Account);
        Assert.Equal(account.Id, user.Account!.Id);

        License licence = await db.Licenses.SingleAsync().ConfigureAwait(true);
        Assert.Equal(account.Id, licence.Account!.Id);

        EngineInstance loaded = await db.EngineInstances
            .Include(candidate => candidate.Profile)
                .ThenInclude(profile => profile!.Selections)
            .Include(candidate => candidate.ManifestEntries)
            .Include(candidate => candidate.Commands)
                .ThenInclude(command => command.ProgressReports)
            .SingleAsync(candidate => candidate.Id == instance.InstanceId)
            .ConfigureAwait(true);

        Assert.Equal(account.Id, loaded.AccountId);
        Assert.Equal(licence.Id, loaded.LicenseId);
        Assert.Equal(2, loaded.ManifestEntries.Count);
        Assert.All(loaded.ManifestEntries, entry => Assert.Equal(instance.InstanceId, entry.EngineInstance!.Id));

        // The profile is the row a selection hangs off, and every selection points back at it; both ends are
        // what the profile service navigates, so both are pinned here.
        Assert.NotNull(loaded.Profile);
        ProfileSelection selection = Assert.Single(loaded.Profile!.Selections);
        Assert.Equal(loaded.Profile.Id, selection.EngineProfileId);
        Assert.Equal(loaded.Profile.Id, selection.EngineProfile!.Id);

        EngineCommand command = Assert.Single(loaded.Commands);
        Assert.Equal(loaded.Id, command.EngineInstance!.Id);
        CommandProgressReport report = Assert.Single(command.ProgressReports);
        Assert.Equal(command.Id, report.EngineCommand!.Id);

        // The context exposes each set Cloud queries; a set that is missing would be a compile error only in
        // the service that needs it, so they are all touched here.
        Assert.Equal(1, await db.EngineProfiles.CountAsync().ConfigureAwait(true));
        Assert.Equal(1, await db.ProfileSelections.CountAsync().ConfigureAwait(true));
        Assert.Equal(2, await db.ExtensionManifestEntries.CountAsync().ConfigureAwait(true));
        Assert.Equal(1, await db.EngineCommands.CountAsync().ConfigureAwait(true));
        Assert.Equal(1, await db.CommandProgressReports.CountAsync().ConfigureAwait(true));
    }

    private static RequestDelegate BuildPipeline(CloudOptions options)
    {
        ApplicationBuilder builder = new(new ServiceCollection().BuildServiceProvider());
        builder.UseManagementApiKey(options);
        builder.Run(context =>
        {
            context.Items["reached"] = true;
            context.Response.StatusCode = StatusCodes.Status200OK;
            return Task.CompletedTask;
        });

        return builder.Build();
    }

    private static DefaultHttpContext Context(string path)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        return context;
    }
}
