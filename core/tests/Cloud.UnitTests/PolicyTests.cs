// -----------------------------------------------------------------------------
// <copyright file="PolicyTests.cs" company="BleedingOnTheEdge">
//   Copyright (c) BleedingOnTheEdge. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Cloud.UnitTests;

using System.Text.Json;
using Cloud;
using Cloud.Data;
using Cloud.Engine;
using Cloud.Protocol;
using Cloud.Services;
using Microsoft.Extensions.Configuration;

/// <summary>
/// Tests of the decisions Cloud makes without a database: configuration handling, key hashing, the
/// heartbeat status policy, licence validity, manifest flattening and the profile's active-set rules.
/// </summary>
public sealed class PolicyTests
{
    [Fact]
    public void Options_ReadEverySettingFromConfigurationAndTheEnvironment()
    {
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cloud:ConnectionString"] = "Host=configured",
                ["Cloud:ManagementApiKey"] = "configured-key",
                ["Cloud:HeartbeatIntervalSeconds"] = "30",
                ["Cloud:CommandQueueExpirySeconds"] = "120",
                ["Cloud:CommandBatchSize"] = "4",
                ["Cloud:ActivateExtensionsTimeoutSeconds"] = "15",
                ["Cloud:RequiredCapabilities"] = "100, 104"
            })
            .Build();

        CloudOptions options = CloudOptions.FromConfiguration(configuration);

        Assert.Equal("Host=configured", options.ConnectionString);
        Assert.Equal("configured-key", options.ManagementApiKey);
        Assert.Equal(30, options.HeartbeatIntervalSeconds);
        Assert.Equal(120, options.CommandQueueExpirySeconds);
        Assert.Equal(4, options.CommandBatchSize);
        Assert.Equal(15, options.ActivateExtensionsTimeoutSeconds);
        Assert.Equal([100, 104], options.RequiredCapabilities);
    }

    [Fact]
    public void Options_DefaultTheProtocolTunablesToTheEngineCompatibleValues()
    {
        CloudOptions options = CloudOptions.FromConfiguration(new ConfigurationBuilder().Build());

        // The heartbeat default matches the Engine's own constant, so an Engine that has never been
        // reconfigured keeps the cadence it was built with.
        Assert.Equal(CloudOptions.DefaultHeartbeatIntervalSeconds, options.HeartbeatIntervalSeconds);
        Assert.Equal(CloudOptions.DefaultCommandBatchSize, options.CommandBatchSize);
        Assert.Equal(CloudOptions.DefaultCommandQueueExpirySeconds, options.CommandQueueExpirySeconds);
        Assert.Equal(CloudOptions.DefaultActivateExtensionsTimeoutSeconds, options.ActivateExtensionsTimeoutSeconds);
        Assert.Empty(options.RequiredCapabilities);
    }

    [Theory]
    [InlineData("", "key")]
    [InlineData("Host=configured", "")]
    [InlineData("  ", "key")]
    [InlineData("Host=configured", "   ")]
    [InlineData(null, "key")]
    [InlineData("Host=configured", null)]
    public void Options_RefuseToStartWithoutAConnectionStringOrAManagementKey(string? connectionString, string? apiKey)
    {
        var options = new CloudOptions { ConnectionString = connectionString, ManagementApiKey = apiKey };

        // Failing closed matters most for the key: the management API can register instances and mint their
        // credentials, so "no key configured" must never mean "no authentication required".
        Assert.Throws<InvalidOperationException>(options.Validate);
    }

    [Fact]
    public void Options_StartWhenBothRequiredSecretsArePresent()
    {
        var options = new CloudOptions { ConnectionString = "Host=configured", ManagementApiKey = "key" };

        options.Validate();
    }

    [Theory]
    [InlineData("Cloud:HeartbeatIntervalSeconds", "0")]
    [InlineData("Cloud:HeartbeatIntervalSeconds", "-1")]
    [InlineData("Cloud:HeartbeatIntervalSeconds", "soon")]
    [InlineData("Cloud:CommandBatchSize", "many")]
    [InlineData("Cloud:RequiredCapabilities", "100,abc")]
    public void Options_RejectAnUnusableSettingInsteadOfSilentlyFallingBack(string key, string value)
    {
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { [key] = value })
            .Build();

        Assert.Throws<InvalidOperationException>(() => CloudOptions.FromConfiguration(configuration));
    }

    [Fact]
    public void ApiKeyHasher_IsDeterministicAndProducesAFullLengthHexDigest()
    {
        string hash = ApiKeyHasher.Hash("a-key");

        Assert.Equal(hash, ApiKeyHasher.Hash("a-key"));
        Assert.Equal(ApiKeyHasher.HashHexLength, hash.Length);
        Assert.Matches("^[0-9A-F]+$", hash);
        Assert.NotEqual(hash, ApiKeyHasher.Hash("a-different-key"));
    }

    [Fact]
    public void ApiKeyHasher_GeneratesADistinctHighEntropyKeyEachTime()
    {
        HashSet<string> keys = [];
        for (int index = 0; index < 32; index++)
        {
            string key = ApiKeyHasher.GenerateKey();
            Assert.Equal(ApiKeyHasher.KeySizeBytes, Convert.FromBase64String(key).Length);
            Assert.True(keys.Add(key), "GenerateKey produced a repeated key.");
        }
    }

    [Fact]
    public void ApiKeyHasher_RejectsANullKey()
    {
        Assert.Throws<ArgumentNullException>(() => ApiKeyHasher.Hash(null!));
    }

    [Fact]
    public void HealthPolicy_BarsABannedInstanceAndLocksASuspendedOne()
    {
        var now = DateTimeOffset.UnixEpoch;
        var licence = new License { Status = LicenseStatus.Active };

        Assert.Equal(
            CloudProtocol.HeartbeatStatus.Ban,
            InstanceHealthPolicy.Evaluate(new EngineInstance { Status = EngineInstanceStatus.Banned }, licence, now));

        Assert.Equal(
            CloudProtocol.HeartbeatStatus.Lock,
            InstanceHealthPolicy.Evaluate(new EngineInstance { Status = EngineInstanceStatus.Suspended }, licence, now));

        Assert.Equal(
            CloudProtocol.HeartbeatStatus.Ok,
            InstanceHealthPolicy.Evaluate(new EngineInstance { Status = EngineInstanceStatus.Active }, licence, now));
    }

    [Fact]
    public void HealthPolicy_LocksAnInstanceWhoseLicenceNoLongerRuns()
    {
        var now = DateTimeOffset.UnixEpoch;
        var instance = new EngineInstance { Status = EngineInstanceStatus.Active };

        Assert.Equal(
            CloudProtocol.HeartbeatStatus.Lock,
            InstanceHealthPolicy.Evaluate(instance, new License { Status = LicenseStatus.Revoked }, now));

        Assert.Equal(
            CloudProtocol.HeartbeatStatus.Lock,
            InstanceHealthPolicy.Evaluate(instance, license: null, now));
    }

    [Fact]
    public void HealthPolicy_RejectsANullInstance()
    {
        Assert.Throws<ArgumentNullException>(() => InstanceHealthPolicy.Evaluate(null!, null, DateTimeOffset.UnixEpoch));
    }

    [Fact]
    public void Licence_IsRunnableOnlyWhileItIsActiveAndUnexpired()
    {
        var now = DateTimeOffset.UnixEpoch;

        Assert.True(new License { Status = LicenseStatus.Active }.IsRunnableAt(now));
        Assert.True(new License { Status = LicenseStatus.Active, ExpiresAt = now.AddDays(1) }.IsRunnableAt(now));
        Assert.False(new License { Status = LicenseStatus.Active, ExpiresAt = now }.IsRunnableAt(now));
        Assert.False(new License { Status = LicenseStatus.Active, ExpiresAt = now.AddDays(-1) }.IsRunnableAt(now));
        Assert.False(new License { Status = LicenseStatus.Suspended }.IsRunnableAt(now));
        Assert.False(new License { Status = LicenseStatus.Expired }.IsRunnableAt(now));
        Assert.False(new License { Status = LicenseStatus.Revoked }.IsRunnableAt(now));
    }

    [Fact]
    public void ManifestReport_FlattensIntoTheSlotsItBelongsTo()
    {
        var report = new EngineManifestReport(
            ["  AdapterA  "],
            ["StrategyA"],
            ["IndicatorA", "IndicatorB"],
            [],
            ["HookA"]);

        IReadOnlyList<(ExtensionKind Kind, string Name)> entries = report.ToEntries();

        Assert.Contains((ExtensionKind.Adapter, "AdapterA"), entries);
        Assert.Contains((ExtensionKind.Strategy, "StrategyA"), entries);
        Assert.Contains((ExtensionKind.Indicator, "IndicatorA"), entries);
        Assert.Contains((ExtensionKind.Indicator, "IndicatorB"), entries);
        Assert.Contains((ExtensionKind.HookPlugin, "HookA"), entries);
        Assert.Equal(5, entries.Count);
    }

    [Fact]
    public void ManifestReport_DropsBlankNamesRatherThanStoringEmptySelections()
    {
        var report = new EngineManifestReport(["", "   ", "A"], [], [], [], []);

        Assert.Equal([(ExtensionKind.Adapter, "A")], report.ToEntries());
    }

    [Theory]
    [InlineData((int)ExtensionKind.Adapter, true)]
    [InlineData((int)ExtensionKind.Strategy, true)]
    [InlineData((int)ExtensionKind.NeuralNetwork, true)]
    [InlineData((int)ExtensionKind.Indicator, false)]
    [InlineData((int)ExtensionKind.HookPlugin, false)]
    public void ProfileRules_OnlyTheAdapterStrategyAndModelSlotsHoldOneExtension(int kindValue, bool expected)
    {
        // The parameter is an int because a public test method cannot take an internal enum; the value is
        // checked against the enum on the way in so a renamed member cannot silently pass.
        Assert.True(Enum.IsDefined((ExtensionKind)kindValue));
        Assert.Equal(expected, ProfileService.IsSingleSlot((ExtensionKind)kindValue));
    }

    [Fact]
    public void ProfileRules_ResolveOneExtensionPerExclusiveSlotAndAllOfTheRepeatableOnes()
    {
        List<ProfileSelection> selections =
        [
            new() { Kind = ExtensionKind.Adapter, Name = "AdapterB", IsActive = true },
            new() { Kind = ExtensionKind.Adapter, Name = "AdapterA", IsActive = false },
            new() { Kind = ExtensionKind.Strategy, Name = "StrategyA", IsActive = true },
            new() { Kind = ExtensionKind.NeuralNetwork, Name = "ModelA", IsActive = true },
            new() { Kind = ExtensionKind.Indicator, Name = "IndicatorB", IsActive = true },
            new() { Kind = ExtensionKind.Indicator, Name = "IndicatorA", IsActive = true },
            new() { Kind = ExtensionKind.Indicator, Name = "IndicatorC", IsActive = false },
            new() { Kind = ExtensionKind.HookPlugin, Name = "HookA", IsActive = true }
        ];

        ActiveSelectionSet active = ProfileService.BuildActiveSet(selections);

        Assert.Equal("AdapterB", active.Adapter);
        Assert.Equal("StrategyA", active.Strategy);
        Assert.Equal("ModelA", active.NeuralNetwork);
        Assert.Equal(["IndicatorA", "IndicatorB"], active.Indicators);
        Assert.Equal(["HookA"], active.HookPlugins);
    }

    [Fact]
    public void ProfileRules_LeaveAnExclusiveSlotEmptyWhenNothingIsActiveInIt()
    {
        ActiveSelectionSet active = ProfileService.BuildActiveSet(
            [new ProfileSelection { Kind = ExtensionKind.Adapter, Name = "AdapterA", IsActive = false }]);

        Assert.Null(active.Adapter);
        Assert.Null(active.Strategy);
        Assert.Null(active.NeuralNetwork);
        Assert.Empty(active.Indicators);
        Assert.Empty(active.HookPlugins);
    }

    [Fact]
    public void ProfileRules_BuildTheActivationParametersTheEngineHandlerReads()
    {
        var active = new ActiveSelectionSet("AdapterA", "StrategyA", "ModelA", ["IndicatorA"], ["HookA"]);

        using JsonDocument document = JsonDocument.Parse(ProfileService.BuildActivateExtensionsParameters(active));
        JsonElement parameters = document.RootElement;

        Assert.Equal(JsonValueKind.Object, parameters.ValueKind);
        Assert.Equal("AdapterA", parameters.GetProperty(EngineCommandIds.ActivateExtensionsParameters.Adapter).GetString());
        Assert.Equal("StrategyA", parameters.GetProperty(EngineCommandIds.ActivateExtensionsParameters.Strategy).GetString());
        Assert.Equal("ModelA", parameters.GetProperty(EngineCommandIds.ActivateExtensionsParameters.NeuralNetwork).GetString());
        Assert.Equal(["HookA"], parameters.GetProperty(EngineCommandIds.ActivateExtensionsParameters.Hooks)
            .EnumerateArray().Select(hook => hook.GetString()));
    }

    [Fact]
    public void ProfileRules_OmitTheOptionalActivationParametersRatherThanSendingNulls()
    {
        var active = new ActiveSelectionSet("AdapterA", "StrategyA", null, [], []);

        using JsonDocument document = JsonDocument.Parse(ProfileService.BuildActivateExtensionsParameters(active));

        // The Engine's handler type-tests each field and treats a JSON null as absent, so omitting is the
        // honest encoding of "not selected".
        Assert.False(document.RootElement.TryGetProperty(EngineCommandIds.ActivateExtensionsParameters.NeuralNetwork, out _));
        Assert.False(document.RootElement.TryGetProperty(EngineCommandIds.ActivateExtensionsParameters.Hooks, out _));
    }

    [Fact]
    public void EngineCommandIds_KeepTheEngineRegistryValues()
    {
        // Cloud must dial the Engine's own registry entry; 1404 is ActivateExtensions in
        // Engine.Management.Commands.CommandIds.
        Assert.Equal(1404, EngineCommandIds.ActivateExtensions);
        Assert.Equal("ActivateExtensions", EngineCommandIds.ActivateExtensionsName);
    }
}
