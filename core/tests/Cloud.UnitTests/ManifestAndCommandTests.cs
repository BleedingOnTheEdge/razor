// -----------------------------------------------------------------------------
// <copyright file="ManifestAndCommandTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using Cloud;
using Cloud.Data;
using Cloud.Engine;
using Cloud.Services;
using Cloud.UnitTests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Tests of extension-manifest storage, profile selection rules and the command queue's lifecycle.
/// </summary>
public sealed class ManifestAndCommandTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UnixEpoch;

    [Fact]
    public async Task Manifest_StoresEveryDiscoveredExtensionInItsSlot()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        int? stored = await context.Manifests
            .ApplyAsync(
                context.InstanceId,
                new EngineManifestReport(["AdapterA"], ["StrategyA"], ["IndicatorA"], ["ModelA"], ["HookA"]),
                CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(5, stored);

        using CloudDbContext db = context.Database.CreateDbContext();
        List<ExtensionManifestEntry> entries = await db.ExtensionManifestEntries
            .Where(entry => entry.EngineInstanceId == context.InstanceId)
            .ToListAsync(CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Contains(entries, entry => entry.Kind == ExtensionKind.Adapter && entry.Name == "AdapterA");
        Assert.Contains(entries, entry => entry.Kind == ExtensionKind.NeuralNetwork && entry.Name == "ModelA");
        Assert.Contains(entries, entry => entry.Kind == ExtensionKind.HookPlugin && entry.Name == "HookA");
        Assert.All(entries, entry => Assert.Equal(Now, entry.ReportedAt));
    }

    [Fact]
    public async Task Manifest_ReplacesTheCatalogueSoAnUninstalledExtensionDisappears()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        await context.Manifests
            .ApplyAsync(context.InstanceId, new EngineManifestReport(["AdapterA", "AdapterB"], [], [], [], []), CancellationToken.None)
            .ConfigureAwait(true);
        await context.Manifests
            .ApplyAsync(context.InstanceId, new EngineManifestReport(["AdapterB"], [], [], [], []), CancellationToken.None)
            .ConfigureAwait(true);

        using CloudDbContext db = context.Database.CreateDbContext();
        List<ExtensionManifestEntry> entries = await db.ExtensionManifestEntries
            .Where(entry => entry.EngineInstanceId == context.InstanceId)
            .ToListAsync(CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal("AdapterB", Assert.Single(entries).Name);
    }

    [Fact]
    public async Task Manifest_KeepsAReportedExtensionWithoutDuplicatingItAndRefreshesItsTimestamp()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);
        var report = new EngineManifestReport(["AdapterA"], [], [], [], []);

        await context.Manifests.ApplyAsync(context.InstanceId, report, CancellationToken.None).ConfigureAwait(true);
        context.Time.Advance(TimeSpan.FromMinutes(10));
        await context.Manifests.ApplyAsync(context.InstanceId, report, CancellationToken.None).ConfigureAwait(true);

        using CloudDbContext db = context.Database.CreateDbContext();
        ExtensionManifestEntry entry = Assert.Single(
            await db.ExtensionManifestEntries
                .Where(row => row.EngineInstanceId == context.InstanceId)
                .ToListAsync(CancellationToken.None)
                .ConfigureAwait(true));

        // Re-reporting must not violate the unique (instance, kind, name) index, and the timestamp advances.
        Assert.Equal(Now.AddMinutes(10), entry.ReportedAt);
    }

    [Fact]
    public async Task Manifest_ReportsAnUnknownInstanceRatherThanSilentlySucceeding()
    {
        using var database = new CloudTestDatabase();
        var service = new InstanceManifestService(database, new TestTimeProvider(Now));

        int? stored = await service
            .ApplyAsync(Guid.NewGuid(), new EngineManifestReport([], [], [], [], []), CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Null(stored);
    }

    [Fact]
    public async Task Manifest_DeactivatesASelectionWhoseExtensionIsNoLongerReported()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);
        await context.Manifests
            .ApplyAsync(context.InstanceId, new EngineManifestReport(["AdapterA"], ["StrategyA"], [], [], []), CancellationToken.None)
            .ConfigureAwait(true);
        await context.Profiles
            .SetSelectionAsync(context.InstanceId, ExtensionKind.Adapter, "AdapterA", isActive: true, CancellationToken.None)
            .ConfigureAwait(true);

        // The operator removes the adapter from the Engine; the profile must not keep pointing at it.
        await context.Manifests
            .ApplyAsync(context.InstanceId, new EngineManifestReport([], ["StrategyA"], [], [], []), CancellationToken.None)
            .ConfigureAwait(true);

        InstanceStateSnapshot snapshot = (await context.Profiles
            .GetInstanceStateAsync(context.InstanceId, CancellationToken.None)
            .ConfigureAwait(true))!;

        Assert.Null(snapshot.ActiveSet.Adapter);
        Assert.False(Assert.Single(snapshot.Selections).IsActive);
    }

    [Fact]
    public async Task Selection_RefusesAnExtensionTheEngineHasNotReported()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        SelectionOutcome outcome = await context.Profiles
            .SetSelectionAsync(context.InstanceId, ExtensionKind.Adapter, "NeverReported", isActive: true, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Rejected, outcome.Status);
        Assert.Contains("has not reported", outcome.FailureReason!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Selection_ActivatesASecondAdapterOnlyByStandingTheFirstOneDown()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);
        await context.Manifests
            .ApplyAsync(context.InstanceId, new EngineManifestReport(["AdapterA", "AdapterB"], [], ["IndicatorA", "IndicatorB"], [], []), CancellationToken.None)
            .ConfigureAwait(true);

        await context.Profiles.SetSelectionAsync(context.InstanceId, ExtensionKind.Adapter, "AdapterA", true, CancellationToken.None).ConfigureAwait(true);
        SelectionOutcome second = await context.Profiles
            .SetSelectionAsync(context.InstanceId, ExtensionKind.Adapter, "AdapterB", true, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal("AdapterB", second.ActiveSet!.Adapter);

        // Indicators are not exclusive: both stay active.
        await context.Profiles.SetSelectionAsync(context.InstanceId, ExtensionKind.Indicator, "IndicatorA", true, CancellationToken.None).ConfigureAwait(true);
        SelectionOutcome indicators = await context.Profiles
            .SetSelectionAsync(context.InstanceId, ExtensionKind.Indicator, "IndicatorB", true, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(["IndicatorA", "IndicatorB"], indicators.ActiveSet!.Indicators);
    }

    [Fact]
    public async Task Selection_CanBeClearedWithoutDeactivatingItsNeighbours()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);
        await context.Manifests
            .ApplyAsync(context.InstanceId, new EngineManifestReport([], [], ["IndicatorA", "IndicatorB"], [], []), CancellationToken.None)
            .ConfigureAwait(true);
        await context.Profiles.SetSelectionAsync(context.InstanceId, ExtensionKind.Indicator, "IndicatorA", true, CancellationToken.None).ConfigureAwait(true);
        await context.Profiles.SetSelectionAsync(context.InstanceId, ExtensionKind.Indicator, "IndicatorB", true, CancellationToken.None).ConfigureAwait(true);

        SelectionOutcome outcome = await context.Profiles
            .SetSelectionAsync(context.InstanceId, ExtensionKind.Indicator, "IndicatorA", isActive: false, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(["IndicatorB"], outcome.ActiveSet!.Indicators);
    }

    [Fact]
    public async Task Selection_RefusesABlankNameAndReportsAnUnknownInstance()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        SelectionOutcome blank = await context.Profiles
            .SetSelectionAsync(context.InstanceId, ExtensionKind.Adapter, "   ", true, CancellationToken.None)
            .ConfigureAwait(true);
        SelectionOutcome unknown = await context.Profiles
            .SetSelectionAsync(Guid.NewGuid(), ExtensionKind.Adapter, "AdapterA", true, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Rejected, blank.Status);
        Assert.Equal(ServiceStatus.NotFound, unknown.Status);
    }

    [Fact]
    public async Task Activation_QueuesNothingUntilBothAnAdapterAndAStrategyAreSelected()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);
        await context.Manifests
            .ApplyAsync(context.InstanceId, new EngineManifestReport(["AdapterA"], ["StrategyA"], [], [], ["HookA"]), CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Null(await context.Profiles.ApplyActiveSetAsync(context.InstanceId, CancellationToken.None).ConfigureAwait(true));

        await context.Profiles.SetSelectionAsync(context.InstanceId, ExtensionKind.Adapter, "AdapterA", true, CancellationToken.None).ConfigureAwait(true);
        Assert.Null(await context.Profiles.ApplyActiveSetAsync(context.InstanceId, CancellationToken.None).ConfigureAwait(true));

        await context.Profiles.SetSelectionAsync(context.InstanceId, ExtensionKind.Strategy, "StrategyA", true, CancellationToken.None).ConfigureAwait(true);
        await context.Profiles.SetSelectionAsync(context.InstanceId, ExtensionKind.HookPlugin, "HookA", true, CancellationToken.None).ConfigureAwait(true);

        CommandOutcome? activation = await context.Profiles
            .ApplyActiveSetAsync(context.InstanceId, CancellationToken.None)
            .ConfigureAwait(true);

        // Now that the set is complete, Cloud drives the Engine's own ActivateExtensions command.
        Assert.NotNull(activation);
        Assert.Equal(ServiceStatus.Succeeded, activation.Status);
        Assert.Equal(EngineCommandIds.ActivateExtensions, activation.Command!.NumericCommandId);
        Assert.Equal(EngineCommandIds.ActivateExtensionsName, activation.Command.CommandType);
        Assert.Contains("\"Adapter\":\"AdapterA\"", activation.Command.ParametersJson!, StringComparison.Ordinal);
        Assert.Contains("\"Strategy\":\"StrategyA\"", activation.Command.ParametersJson!, StringComparison.Ordinal);
        Assert.Contains("\"Hooks\":[\"HookA\"]", activation.Command.ParametersJson!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Activation_ReportsAnUnknownInstanceAsNoWorkRatherThanFailing()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        Assert.Null(await context.Profiles.ApplyActiveSetAsync(Guid.NewGuid(), CancellationToken.None).ConfigureAwait(true));
    }

    [Fact]
    public async Task Command_IsQueuedPendingAndCollectableExactlyOnce()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        CommandOutcome submitted = await context.Commands
            .SubmitAsync(context.InstanceId, 1404, "ActivateExtensions", "{\"Adapter\":\"A\"}", 30, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Succeeded, submitted.Status);
        Assert.Equal(CommandStatus.Pending, submitted.Command!.Status);
        Assert.False(string.IsNullOrWhiteSpace(submitted.Command.CorrelationId));

        IReadOnlyList<EngineCommand> undelivered = await context.Commands
            .TakeUndeliveredAsync(context.InstanceId, CancellationToken.None)
            .ConfigureAwait(true);
        Assert.Single(undelivered);

        // Taking does not change state, so a failed write does not lose the command.
        Assert.Equal(
            CommandStatus.Pending,
            (await context.Commands.TakeUndeliveredAsync(context.InstanceId, CancellationToken.None).ConfigureAwait(true))[0].Status);

        await context.Commands.MarkDispatchedAsync([submitted.Command.Id], CancellationToken.None).ConfigureAwait(true);

        Assert.Empty(await context.Commands.TakeUndeliveredAsync(context.InstanceId, CancellationToken.None).ConfigureAwait(true));

        EngineCommand stored = (await context.Commands.GetAsync(submitted.Command.Id, CancellationToken.None).ConfigureAwait(true))!;
        Assert.Equal(CommandStatus.Dispatched, stored.Status);
        Assert.Equal(Now, stored.DispatchedAt);
    }

    [Fact]
    public async Task Command_MarkDispatchedIgnoresAnUnknownIdentifierWithoutFailing()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        await context.Commands.MarkDispatchedAsync([Guid.NewGuid()], CancellationToken.None).ConfigureAwait(true);
        await context.Commands.MarkDispatchedAsync([], CancellationToken.None).ConfigureAwait(true);
    }

    [Theory]
    [InlineData(0, "ActivateExtensions", "{}", null)]
    [InlineData(-1, "ActivateExtensions", "{}", null)]
    [InlineData(1404, "", "{}", null)]
    [InlineData(1404, "   ", "{}", null)]
    [InlineData(1404, "ActivateExtensions", "not json", null)]
    [InlineData(1404, "ActivateExtensions", "[1,2]", null)]
    [InlineData(1404, "ActivateExtensions", "{}", 0)]
    [InlineData(1404, "ActivateExtensions", "{}", -5)]
    public async Task Command_RefusesAMalformedSubmission(int commandId, string commandType, string parameters, int? timeout)
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        CommandOutcome outcome = await context.Commands
            .SubmitAsync(context.InstanceId, commandId, commandType, parameters, timeout, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.Rejected, outcome.Status);
    }

    [Fact]
    public async Task Command_AwaitsTheFirstResultAndIgnoresEverythingAfterIt()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);
        EngineCommand command = await SubmitAsync(context).ConfigureAwait(true);

        Assert.True(await context.Commands
            .RecordProgressAsync(context.InstanceId, command.CorrelationId, "{\"Percent\":50}", CancellationToken.None)
            .ConfigureAwait(true));
        Assert.True(await context.Commands
            .CompleteAsync(context.InstanceId, command.CorrelationId, isSuccess: true, "{\"Message\":\"done\"}", null, CancellationToken.None)
            .ConfigureAwait(true));

        // A late report after the final answer must not be recorded or allowed to overwrite the result.
        Assert.False(await context.Commands
            .RecordProgressAsync(context.InstanceId, command.CorrelationId, "{\"Percent\":90}", CancellationToken.None)
            .ConfigureAwait(true));
        Assert.False(await context.Commands
            .CompleteAsync(context.InstanceId, command.CorrelationId, isSuccess: false, null, "late failure", CancellationToken.None)
            .ConfigureAwait(true));

        EngineCommand stored = (await context.Commands.GetAsync(command.Id, CancellationToken.None).ConfigureAwait(true))!;
        Assert.Equal(CommandStatus.Completed, stored.Status);
        Assert.Null(stored.ErrorMessage);
        Assert.Single(stored.ProgressReports);
    }

    [Fact]
    public async Task Command_RecordsAFailureWithTheEnginesError()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);
        EngineCommand command = await SubmitAsync(context).ConfigureAwait(true);

        await context.Commands
            .CompleteAsync(context.InstanceId, command.CorrelationId, isSuccess: false, null, "activation failed", CancellationToken.None)
            .ConfigureAwait(true);

        EngineCommand stored = (await context.Commands.GetAsync(command.Id, CancellationToken.None).ConfigureAwait(true))!;
        Assert.Equal(CommandStatus.Failed, stored.Status);
        Assert.Equal("activation failed", stored.ErrorMessage);
        Assert.Null(stored.ResultPayloadJson);
    }

    [Fact]
    public async Task Command_IgnoresAReportFromADifferentInstanceAndAnUnknownCorrelation()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);
        EngineCommand command = await SubmitAsync(context).ConfigureAwait(true);

        // The instance identifier is checked as well as the correlation, so one Engine cannot finish another's
        // command with a guessed identifier.
        Assert.False(await context.Commands
            .RecordProgressAsync(Guid.NewGuid(), command.CorrelationId, "{}", CancellationToken.None)
            .ConfigureAwait(true));
        Assert.False(await context.Commands
            .CompleteAsync(Guid.NewGuid(), command.CorrelationId, true, "{}", null, CancellationToken.None)
            .ConfigureAwait(true));
        Assert.False(await context.Commands
            .CompleteAsync(context.InstanceId, "unknown-correlation", true, "{}", null, CancellationToken.None)
            .ConfigureAwait(true));
    }

    [Fact]
    public async Task Command_ReportsAnUnknownInstanceAsNotFound()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        CommandOutcome outcome = await context.Commands
            .SubmitAsync(Guid.NewGuid(), 1404, "ActivateExtensions", null, null, CancellationToken.None)
            .ConfigureAwait(true);

        Assert.Equal(ServiceStatus.NotFound, outcome.Status);
    }

    [Fact]
    public async Task Command_FailsAQueuedCommandThatExpiresBeforeTheEngineCollectsIt()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);
        EngineCommand command = await SubmitAsync(context).ConfigureAwait(true);

        context.Time.Advance(TimeSpan.FromSeconds(context.Options.CommandQueueExpirySeconds + 1));
        Assert.Equal(1, await context.Commands.FailExpiredAsync(context.InstanceId, CancellationToken.None).ConfigureAwait(true));

        EngineCommand stored = (await context.Commands.GetAsync(command.Id, CancellationToken.None).ConfigureAwait(true))!;
        Assert.Equal(CommandStatus.Failed, stored.Status);
        Assert.Contains("expired", stored.ErrorMessage!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Command_FailsADispatchedCommandWhoseTimeoutElapsed()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        CommandOutcome submitted = await context.Commands
            .SubmitAsync(context.InstanceId, 1404, "ActivateExtensions", null, 30, CancellationToken.None)
            .ConfigureAwait(true);
        await context.Commands.MarkDispatchedAsync([submitted.Command!.Id], CancellationToken.None).ConfigureAwait(true);

        // Delivery is not acknowledged, so silence past the deadline is the only signal that the answer was lost.
        context.Time.Advance(TimeSpan.FromSeconds(31));
        Assert.Equal(1, await context.Commands.FailExpiredAsync(context.InstanceId, CancellationToken.None).ConfigureAwait(true));

        EngineCommand stored = (await context.Commands.GetAsync(submitted.Command.Id, CancellationToken.None).ConfigureAwait(true))!;
        Assert.Equal(CommandStatus.Failed, stored.Status);
        Assert.Contains("timeout", stored.ErrorMessage!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Command_LeavesADispatchedCommandWithNoTimeoutAlone()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);

        CommandOutcome submitted = await context.Commands
            .SubmitAsync(context.InstanceId, 1404, "ActivateExtensions", null, timeoutSeconds: null, CancellationToken.None)
            .ConfigureAwait(true);
        await context.Commands.MarkDispatchedAsync([submitted.Command!.Id], CancellationToken.None).ConfigureAwait(true);

        // The protocol gives no deadline for a command without a TimeoutSeconds, and Cloud does not invent one.
        context.Time.Advance(TimeSpan.FromDays(30));
        Assert.Equal(0, await context.Commands.FailExpiredAsync(context.InstanceId, CancellationToken.None).ConfigureAwait(true));

        EngineCommand stored = (await context.Commands.GetAsync(submitted.Command.Id, CancellationToken.None).ConfigureAwait(true))!;
        Assert.Equal(CommandStatus.Dispatched, stored.Status);
    }

    [Fact]
    public async Task Command_DoesNotTouchAnotherInstancesExpiredCommands()
    {
        using CloudTestContext context = await CloudTestContext.CreateWithInstanceAsync().ConfigureAwait(true);
        await SubmitAsync(context).ConfigureAwait(true);

        Assert.Equal(0, await context.Commands.FailExpiredAsync(Guid.NewGuid(), CancellationToken.None).ConfigureAwait(true));
    }

    private static async Task<EngineCommand> SubmitAsync(CloudTestContext context)
    {
        CommandOutcome outcome = await context.Commands
            .SubmitAsync(context.InstanceId, 1404, "ActivateExtensions", "{}", 300, CancellationToken.None)
            .ConfigureAwait(true);
        return outcome.Command!;
    }
}
