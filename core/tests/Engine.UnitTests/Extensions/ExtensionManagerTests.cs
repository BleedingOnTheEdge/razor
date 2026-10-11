// -----------------------------------------------------------------------------
// <copyright file="ExtensionManagerTests.cs" company="Razor Platform">
//   Copyright (c) Razor Platform. All rights reserved.
// </copyright>
// -----------------------------------------------------------------------------

namespace Engine.UnitTests.Extensions;

using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Engine.Core;
using Engine.Extensions;
using global::Kernel.Hooks;
using Microsoft.Extensions.Logging.Abstractions;
using Sdk.Hooks;
using Sdk.Shared;
using Xunit;

public sealed class ExtensionManagerTests : IDisposable
{
    private readonly string _tempDirectory;
    private readonly string _tempDbPath;
    private readonly StateManager _stateManager;
    private readonly HookRegistry _hookRegistry;
    private readonly FakeBehaviorRecorder _behaviorRecorder;
    private readonly ExtensionManager _extensionManager;

    public ExtensionManagerTests()
    {
        _tempDirectory = Path.Combine(Path.GetTempPath(), $"ext_mgr_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDirectory);
        Directory.CreateDirectory(Path.Combine(_tempDirectory, "Adapters"));
        Directory.CreateDirectory(Path.Combine(_tempDirectory, "Strategies"));
        Directory.CreateDirectory(Path.Combine(_tempDirectory, "Indicators"));
        Directory.CreateDirectory(Path.Combine(_tempDirectory, "Plugins"));
        Directory.CreateDirectory(Path.Combine(_tempDirectory, "NeuralNetworks"));

        _tempDbPath = Path.Combine(Path.GetTempPath(), $"ext_db_{Guid.NewGuid():N}.db");
        _stateManager = new StateManager(_tempDbPath);
        _hookRegistry = new HookRegistry();
        _behaviorRecorder = new FakeBehaviorRecorder();

        _extensionManager = new ExtensionManager(
            NullLogger<ExtensionManager>.Instance,
            _stateManager,
            NullLoggerFactory.Instance,
            _hookRegistry,
            _behaviorRecorder,
            _tempDirectory);
    }

    public void Dispose()
    {
        _extensionManager.Dispose();
        _stateManager.Dispose();

        if (Directory.Exists(_tempDirectory))
        {
            try
            {
                Directory.Delete(_tempDirectory, recursive: true);
            }
            catch
            {
                // Ignore cleanup error on temp directory
            }
        }

        if (File.Exists(_tempDbPath))
        {
            try
            {
                File.Delete(_tempDbPath);
            }
            catch
            {
                // Ignore cleanup error on temp db
            }
        }
    }

    [Fact]
    public async Task DiscoverExtensionsAsync_ScansDirectoryAndPersistsManifest()
    {
        await _extensionManager.DiscoverExtensionsAsync(CancellationToken.None);

        var manifestObj = await _extensionManager.GetManifestAsync(CancellationToken.None);
        Assert.NotNull(manifestObj);

        var savedManifest = await _stateManager.LoadExtensionManifestAsync(CancellationToken.None);
        Assert.NotNull(savedManifest);
    }

    [Fact]
    public async Task ActivateExtensionsAsync_BeforeDiscovery_ThrowsInvalidOperationException()
    {
        using var uninitializedManager = new ExtensionManager(
            NullLogger<ExtensionManager>.Instance,
            _stateManager,
            NullLoggerFactory.Instance,
            _hookRegistry,
            _behaviorRecorder,
            _tempDirectory);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            uninitializedManager.ActivateExtensionsAsync("Adapter", "Strategy", null, [], CancellationToken.None));

        Assert.Contains("Catalog not initialized", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ActivateExtensionsAsync_UnknownAdapter_ThrowsInvalidOperationException()
    {
        await _extensionManager.DiscoverExtensionsAsync(CancellationToken.None);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _extensionManager.ActivateExtensionsAsync("MissingAdapter", "SomeStrategy", null, [], CancellationToken.None));

        Assert.Contains("Adapter 'MissingAdapter' not found", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task DeployExtensionAsync_And_RemoveExtensionAsync_ManagesFiles()
    {
        byte[] sampleBytes = [0x4D, 0x5A, 0x90, 0x00]; // Sample header
        string pluginName = "TestPlugin";

        await _extensionManager.DeployExtensionAsync(pluginName, sampleBytes, CancellationToken.None);

        string expectedPath = Path.Combine(_tempDirectory, "Plugins", $"{pluginName}.dll");
        Assert.True(File.Exists(expectedPath));
        byte[] writtenBytes = await File.ReadAllBytesAsync(expectedPath);
        Assert.Equal(sampleBytes, writtenBytes);

        // Removal
        await _extensionManager.RemoveExtensionAsync(pluginName, CancellationToken.None);
        Assert.False(File.Exists(expectedPath));

        // Removing non-existent plugin does not throw
        await _extensionManager.RemoveExtensionAsync("NoSuchPlugin", CancellationToken.None);
    }

    [Fact]
    public async Task DeployExtensionAsync_InvalidArguments_ThrowsArgumentException()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _extensionManager.DeployExtensionAsync("", [1, 2, 3], CancellationToken.None));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            _extensionManager.DeployExtensionAsync("ValidName", [], CancellationToken.None));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            _extensionManager.DeployExtensionAsync("ValidName", null!, CancellationToken.None));
    }

    [Fact]
    public async Task ReloadExtensionsAsync_ClearsHooksAndResetsActiveSet()
    {
        await _extensionManager.DiscoverExtensionsAsync(CancellationToken.None);

        // Register dummy hook
        _hookRegistry.Backtest.OnTickStrategyBefore.Register((tick, ctx) => FilterResult.Allow(tick));
        var reg = (FilterRegistration<Tick>)_hookRegistry.Backtest.OnTickStrategyBefore;
        Assert.NotEmpty(reg.Entries);

        await _extensionManager.ReloadExtensionsAsync(CancellationToken.None);

        Assert.Empty(reg.Entries);
        Assert.Null(_extensionManager.ActiveAdapter);
        Assert.Null(_extensionManager.ActiveStrategy);
        Assert.Null(_extensionManager.ActiveNeuralNetwork);
    }

    [Fact]
    public async Task CreateTransientStrategy_BeforeDiscovery_ThrowsInvalidOperationException()
    {
        using var uninitialized = new ExtensionManager(
            NullLogger<ExtensionManager>.Instance,
            _stateManager,
            NullLoggerFactory.Instance,
            _hookRegistry,
            _behaviorRecorder,
            _tempDirectory);

        Assert.Throws<InvalidOperationException>(() => uninitialized.CreateTransientStrategy("Strategy"));
    }

    [Fact]
    public async Task CreateTransientStrategy_UnknownStrategy_ReturnsNull()
    {
        await _extensionManager.DiscoverExtensionsAsync(CancellationToken.None);

        var result = _extensionManager.CreateTransientStrategy("NonExistentStrategy");
        Assert.Null(result);
    }

    [Fact]
    public void BehaviorLogging_Enable_Disable_And_RecordSnapshot()
    {
        _behaviorRecorder.IsEnabled = true;

        _extensionManager.EnableBehaviorLoggingOnStrategy("session-123", snapshotIntervalSeconds: 0);

        _extensionManager.RecordSnapshotOnStrategy();
        Assert.Single(_behaviorRecorder.Recorded);
        Assert.Equal("session-123", _behaviorRecorder.Recorded[0].SessionId);
        Assert.Equal("Snapshot", _behaviorRecorder.Recorded[0].Action);

        _extensionManager.DisableBehaviorLoggingOnStrategy();

        // While disabled, snapshot is a no-op
        _extensionManager.RecordSnapshotOnStrategy();
        Assert.Single(_behaviorRecorder.Recorded);
    }

    [Fact]
    public void Dispose_CanBeCalledMultipleTimesSafely()
    {
        _extensionManager.Dispose();
        _extensionManager.Dispose();
    }

    // ─── Test Doubles ────────────────────────────────────────────────────────────

    private sealed class FakeBehaviorRecorder : IBehaviorRecorder
    {
        public bool IsEnabled { get; set; } = true;
        public List<BehaviorRecord> Recorded { get; } = [];

        public void Record(BehaviorRecord record)
        {
            Recorded.Add(record);
        }
    }
}
