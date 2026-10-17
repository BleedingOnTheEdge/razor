using Sdk.Hooks;
using Sdk.Shared;
using Sdk.Slots.Adapter;
using Sdk.Slots.NeuralNetwork;
using Sdk.Slots.Strategy;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;

namespace Engine.Extensions;

/// <summary>
/// Discovers and loads extension assemblies.
/// </summary>
internal sealed class ExtensionCatalog : IDisposable
{
    private readonly string _basePath;
    private readonly List<PluginLoadContext> _contexts = new();
    private readonly Dictionary<string, Type> _adapterTypes = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, Type> _strategyTypes = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, Type> _indicatorTypes = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, Type> _nnModelTypes = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<IHookManifest> _hookManifests = new();
    private readonly ILogger<ExtensionCatalog> _logger;
    private bool _disposed;

    // QLT‑07: Constructor cache for fast instantiation.
    private static readonly ConcurrentDictionary<Type, Func<object>> _ctorCache = new();

    // LoggerMessage delegate
    private static readonly Action<ILogger, string, Exception?> _logAdapterInstantiationFailed =
        LoggerMessage.Define<string>(LogLevel.Warning, 0, "Failed to instantiate adapter type {Type} to read its name.");

    /// <param name="basePath"></param>
    /// <param name="logger"></param>
    /// <exception cref="ArgumentNullException"></exception>
    public ExtensionCatalog(string basePath, ILogger<ExtensionCatalog> logger)
    {
        _basePath = basePath ?? throw new ArgumentNullException(nameof(basePath));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        ScanAll();
    }

    public IAdapterCapability CreateAdapter(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Adapter name cannot be empty or whitespace.", nameof(name));
        }

        if (_adapterTypes.TryGetValue(name, out var type))
        {
            return (IAdapterCapability)CreateInstance(type)!;
        }

        if (name.Equals("PaperBroker", StringComparison.OrdinalIgnoreCase) ||
            name.Equals("MockPaperTrading", StringComparison.OrdinalIgnoreCase) ||
            name.Equals("MockPaperTradingAdapter", StringComparison.OrdinalIgnoreCase) ||
            name.Equals("Paper Broker", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Paper", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Mock", StringComparison.OrdinalIgnoreCase))
        {
            return new MockPaperTradingAdapter();
        }

        throw new InvalidOperationException($"Adapter '{name}' not found.");
    }

    public IStrategyCapability CreateStrategy(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Strategy name cannot be empty or whitespace.", nameof(name));
        }

        if (_strategyTypes.TryGetValue(name, out var type))
        {
            return (IStrategyCapability)CreateInstance(type)!;
        }

        if (name.Equals("TrendFollowing", StringComparison.OrdinalIgnoreCase) ||
            name.Equals("TrendFollowingStrategy", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Trend", StringComparison.OrdinalIgnoreCase))
        {
            return new TrendFollowingStrategy();
        }

        if (name.Equals("MeanRevertingPairs", StringComparison.OrdinalIgnoreCase) ||
            name.Equals("MeanRevertingPairsStrategy", StringComparison.OrdinalIgnoreCase))
        {
            return new MeanRevertingPairsStrategy();
        }

        throw new InvalidOperationException($"Strategy '{name}' not found.");
    }

    public INeuralNetworkModel CreateNeuralNetworkModel(string name)
    {
        if (!_nnModelTypes.TryGetValue(name, out var type))
        {
            throw new InvalidOperationException($"Neural network model '{name}' not found.");
        }

        return (INeuralNetworkModel)CreateInstance(type)!;
    }

    public Indicator CreateIndicator(string name)
    {
        if (!_indicatorTypes.TryGetValue(name, out var type))
        {
            throw new InvalidOperationException($"Indicator '{name}' not found.");
        }

        return (Indicator)CreateInstance(type)!;
    }

    public bool ContainsAdapter(string name) =>
        !string.IsNullOrWhiteSpace(name) &&
        (_adapterTypes.ContainsKey(name) ||
         name.Equals("PaperBroker", StringComparison.OrdinalIgnoreCase) ||
         name.Equals("MockPaperTrading", StringComparison.OrdinalIgnoreCase) ||
         name.Equals("MockPaperTradingAdapter", StringComparison.OrdinalIgnoreCase) ||
         name.Equals("Paper Broker", StringComparison.OrdinalIgnoreCase) ||
         name.Contains("Paper", StringComparison.OrdinalIgnoreCase) ||
         name.Contains("Mock", StringComparison.OrdinalIgnoreCase));

    public bool ContainsStrategy(string name) =>
        !string.IsNullOrWhiteSpace(name) &&
        (_strategyTypes.ContainsKey(name) ||
         name.Equals("TrendFollowing", StringComparison.OrdinalIgnoreCase) ||
         name.Equals("TrendFollowingStrategy", StringComparison.OrdinalIgnoreCase) ||
         name.Equals("MeanRevertingPairs", StringComparison.OrdinalIgnoreCase) ||
         name.Equals("MeanRevertingPairsStrategy", StringComparison.OrdinalIgnoreCase) ||
         name.Contains("Trend", StringComparison.OrdinalIgnoreCase));

    public IReadOnlyList<IHookManifest> HookManifests => _hookManifests.AsReadOnly();

    public IReadOnlyList<string> AdapterNames
    {
        get
        {
            var names = _adapterTypes.Keys.Where(k => !k.Contains('.', StringComparison.Ordinal)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            if (!names.Contains("MockPaperTradingAdapter", StringComparer.OrdinalIgnoreCase))
            {
                names.Add("MockPaperTradingAdapter");
            }
            if (!names.Contains("PaperBroker", StringComparer.OrdinalIgnoreCase))
            {
                names.Add("PaperBroker");
            }
            return names.AsReadOnly();
        }
    }

    public IReadOnlyList<string> StrategyNames
    {
        get
        {
            var names = _strategyTypes.Keys.Where(k => !k.Contains('.', StringComparison.Ordinal)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            if (!names.Contains("TrendFollowingStrategy", StringComparer.OrdinalIgnoreCase))
            {
                names.Add("TrendFollowingStrategy");
            }
            if (!names.Contains("MeanRevertingPairsStrategy", StringComparer.OrdinalIgnoreCase))
            {
                names.Add("MeanRevertingPairsStrategy");
            }
            return names.AsReadOnly();
        }
    }

    public IReadOnlyList<string> IndicatorNames => _indicatorTypes.Keys.ToList().AsReadOnly();
    public IReadOnlyList<string> NeuralNetworkNames => _nnModelTypes.Keys.ToList().AsReadOnly();

    private object CreateInstance(Type type)
    {
        return _ctorCache.GetOrAdd(type, t =>
        {
            var ctor = t.GetConstructor(Type.EmptyTypes);
            if (ctor == null)
            {
                throw new InvalidOperationException($"Type {t.FullName} lacks a parameterless constructor.");
            }
            var newExpr = Expression.New(ctor);
            var lambda = Expression.Lambda<Func<object>>(newExpr);
            return lambda.Compile();
        })();
    }

    private void ScanAll()
    {
        // 1. Scan SDK assembly for built-in capabilities (MockPaperTradingAdapter, TrendFollowingStrategy)
        ScanAssembly(typeof(MockPaperTradingAdapter).Assembly);

        // 2. Scan executing assembly if distinct
        var currentAsm = Assembly.GetExecutingAssembly();
        if (currentAsm != typeof(MockPaperTradingAdapter).Assembly)
        {
            ScanAssembly(currentAsm);
        }

        // 3. Scan base directory DLLs
        if (Directory.Exists(_basePath))
        {
            ScanDlls(_basePath);
        }

        // 4. Scan subdirectories
        string[] dirs = { "Adapters", "Strategies", "Indicators", "Plugins", "NeuralNetworks" };
        foreach (var dir in dirs)
        {
            var path = Path.Combine(_basePath, dir);
            if (Directory.Exists(path))
            {
                ScanDirectory(path);
            }
        }
    }

    private void ScanAssembly(Assembly asm)
    {
        try
        {
            foreach (var type in asm.GetExportedTypes().Where(t => t.IsClass && !t.IsAbstract))
            {
                if (typeof(IAdapterCapability).IsAssignableFrom(type))
                {
                    RegisterAdapter(type);
                }

                if (typeof(IStrategyCapability).IsAssignableFrom(type))
                {
                    RegisterStrategy(type);
                }

                if (typeof(INeuralNetworkModel).IsAssignableFrom(type))
                {
                    _nnModelTypes[type.FullName!] = type;
                    _nnModelTypes[type.Name] = type;
                }

                if (typeof(Indicator).IsAssignableFrom(type))
                {
                    _indicatorTypes[type.FullName!] = type;
                    _indicatorTypes[type.Name] = type;
                }

                if (typeof(IHookManifest).IsAssignableFrom(type))
                {
                    _hookManifests.Add((IHookManifest)CreateInstance(type)!);
                }
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Trace.TraceWarning($"Failed to inspect assembly {asm.FullName}: {ex.Message}");
        }
    }

    private void ScanDirectory(string directory)
    {
        ScanDlls(directory);
        foreach (var subDir in Directory.GetDirectories(directory))
        {
            ScanDlls(subDir);
        }
    }

    private void ScanDlls(string directory)
    {
        foreach (var dll in Directory.GetFiles(directory, "*.dll", SearchOption.TopDirectoryOnly))
        {
            try
            {
                var context = new PluginLoadContext(dll);
                _contexts.Add(context);
                var asm = context.LoadFromAssemblyPath(dll);

                var errors = PluginValidator.ValidateAssembly(asm);
                if (errors.Any())
                {
                    foreach (var err in errors)
                    {
                        System.Diagnostics.Trace.TraceWarning($"Skipping {dll}: {err}");
                    }

                    continue;
                }

                var safetyErrors = PluginSafetyValidator.Validate(asm);
                if (safetyErrors.Any())
                {
                    foreach (var err in safetyErrors)
                    {
                        System.Diagnostics.Trace.TraceWarning($"Safety validation failed for {dll}: {err}");
                    }

                    continue;
                }

                ScanAssembly(asm);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceWarning($"Failed to load {dll}: {ex.Message}");
            }
        }
    }

    private void RegisterAdapter(Type type)
    {
        _adapterTypes[type.FullName!] = type;
        _adapterTypes[type.Name] = type;

        var attr = type.GetCustomAttribute<AdapterNameAttribute>();
        if (attr != null)
        {
            _adapterTypes[attr.Name] = type;
        }

        if (type.Name.Equals("MockPaperTradingAdapter", StringComparison.OrdinalIgnoreCase))
        {
            _adapterTypes["PaperBroker"] = type;
            _adapterTypes["MockPaperTrading"] = type;
        }

        try
        {
            var temp = (IAdapterCapability)CreateInstance(type)!;
            _adapterTypes[temp.Name] = type;
        }
        catch (Exception ex)
        {
            _logAdapterInstantiationFailed(_logger, type.FullName!, ex);
        }
    }

    private void RegisterStrategy(Type type)
    {
        _strategyTypes[type.FullName!] = type;
        _strategyTypes[type.Name] = type;

        if (type.Name.EndsWith("Strategy", StringComparison.OrdinalIgnoreCase) && type.Name.Length > 8)
        {
            _strategyTypes[type.Name[..^8]] = type;
        }

        if (type.Name.Equals("TrendFollowingStrategy", StringComparison.OrdinalIgnoreCase))
        {
            _strategyTypes["TrendFollowing"] = type;
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        foreach (var context in _contexts)
        {
            try { context.UnloadContext(); }
            catch
            {
                // ignored
            }
        }
        _contexts.Clear();
    }
}
