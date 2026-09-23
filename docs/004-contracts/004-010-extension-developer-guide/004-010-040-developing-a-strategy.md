---
id: product:razor/contracts/extension-developer-guide/developing-a-strategy
parent: product:razor/contracts/extension-developer-guide
title: 5. Developing a Strategy
level: product
kind: contract
---

# 5. Developing a Strategy

Strategies contain the decision logic. They react to ticks, use indicators, place orders, and can be optimized via genetic algorithms.

## 5.1 The `IStrategyCapability` Interface

The interface is in `Razor.Core.Sdk.Slots.Strategy`.

```csharp
public interface IStrategyCapability
{
    // Lifecycle
    Task OnConfigureAsync(StrategySpecification spec);
    Task OnStartAsync(IIndicatorRegistry indicators);
    void OnTick(string symbol, Tick tick);
    Task OnStopAsync();

    // Gene support
    int TotalGeneCount { get; }
    void InjectGenes(double[] genes);
    double[] ExportGenes();

    // Neural network
    bool RequiresNeuralNetwork { get; }
    INeuralNetworkModel? NeuralNetwork { get; set; }
}
```

The `symbol` parameter tells your strategy which instrument the tick belongs to. This is essential for multi‑symbol strategies. The `Tick` struct itself carries only price data (bid, ask, volume, timestamp) to maintain its fixed‑size binary layout for memory‑mapped I/O.

A simpler approach is to derive from `StrategyBase`, which provides convenience members.

## 5.2 Strategy Lifecycle

1. `OnConfigureAsync` – Called once before data starts. The `spec` parameter (immutable) contains initial balance, leverage, and requested symbols/timeframes. Store what you need.
2. `OnStartAsync` – Called just before the first tick. The indicator registry is ready. Use this to pre‑allocate buffers, initialize indicators, etc.
3. `OnTick(string symbol, Tick tick)` – Called sequentially for every tick, in chronological order. **Must be purely synchronous** to guarantee determinism in backtesting and live. The `symbol` parameter identifies which instrument the tick belongs to. This is your main logic entry point.
4. `OnStopAsync` – Called after the last tick (backtest) or when a live session is stopped. Clean up resources.
5. `InjectGenes` – Called by the optimizer to load a chromosome's gene array. You override this to apply the values to your properties/neural network.

## 5.3 Using `StrategyBase`

`StrategyBase` provides:

- `Broker` – The trading interface (simulated in backtest, live adapter in production).
- `TickWindow` – Access to recent ticks and OHLC calculations (never a bar‑based callback). **Not thread‑safe** – use only from within `OnTick` or under external synchronisation.
- `Indicators` – The registry for your indicators.
- `Spec` – The immutable configuration.
- `PrimarySymbol` – Shorthand for the first requested symbol.
- `NeuralNetwork` – Your optional `INeuralNetworkModel` instance, set by the engine.
- `TotalGeneCount` – Computed automatically from property genes + NN parameter count.
- Helper methods: `BuyAsync`, `SellAsync`, `ModifyOrderAsync`, `CloseAllAsync`, etc.
- `GeneLock` – A `ReaderWriterLockSlim` to protect gene injection while processing ticks.

Override the virtual lifecycle methods and add your logic.

## 5.4 Example Strategy Skeleton

```csharp
using Razor.Core.Sdk.Shared;

public class SimpleMaStrategy : StrategyBase
{
    [Gene(10, 200, Step = 1, Type = GeneType.Discrete)]
    public int FastPeriod { get; set; } = 50;

    [Gene(50, 500, Step = 1, Type = GeneType.Discrete)]
    public int SlowPeriod { get; set; } = 200;

    private Indicator _fastSma = null!;
    private Indicator _slowSma = null!;

    public override async Task OnStartAsync(IIndicatorRegistry indicators)
    {
        await base.OnStartAsync(indicators);
        _fastSma = indicators.Get<SmaIndicator>(PrimarySymbol, TimeFrame.M1, FastPeriod);
        _slowSma = indicators.Get<SmaIndicator>(PrimarySymbol, TimeFrame.M1, SlowPeriod);
    }

    public override void OnTick(string symbol, Tick tick)
    {
        double fast = _fastSma[0];
        double slow = _slowSma[0];

        if (fast > slow && !Broker.HasOpenPositionAsync(symbol).Result)
            _ = BuyAsync(symbol, 0.1);
        else if (fast < slow)
            _ = CloseAllAsync(symbol);
    }
}
```

## 5.5 Indicators

Indicators are created via `IIndicatorRegistry.Get<T>(args)`. The registry caches them; use the same arguments to retrieve the same instance. Your strategy receives the registry in `OnStartAsync`.

The base `Indicator` class manages a circular buffer. Override `Initialize` and `Calculate` to implement your own. For example, `SmaIndicator` updates on each tick using a lookback. Use the `TickWindow` for OHLC data if your indicator needs it.

## 5.6 Using TickWindow for OHLC Data

Razor is tick‑only, but you can still get OHLC aggregates:

```csharp
TickWindow.GetCurrentStats(symbol, TimeFrame.M1, PriceType.Bid,
    out double open, out double high, out double low, out double close,
    out double volume, out bool isComplete);
if (isComplete) { /* use OHLC */ }
```

`TickWindow` also provides `WindowCompleted` events if you override `OnWindowCompletedAsync` in `StrategyBase`.

**Thread safety:** `TickWindow` is not thread‑safe. It is designed to be called exclusively from the single‑threaded tick processing pipeline (`OnTick`). If you need to access it from a background task, acquire the strategy's `GeneLock` or another synchronisation primitive first.

**Never call `DateTime.UtcNow` inside a strategy** – it will break determinism and is prohibited by the engine. Use the tick's time (`tick.Time`) for all time‑based decisions.

## 5.7 Gene‑Based Optimization

To make your strategy optimizable, mark properties with `[Gene]`. The GA will automatically discover them via reflection.

```csharp
[Gene(0.1, 5.0, Step = 0.1, Type = GeneType.Discrete)]
public double RiskPercent { get; set; } = 1.0;
```

- `Min`, `Max` – the range.
- `Step` – discrete step size. **Only valid for `Discrete` and `Categorical` gene types.** For `Continuous`, `Structural`, and `Parametric` types, `Step` must be `0` (the default). Providing a non‑zero step for unsupported types throws an `ArgumentException`.
- `Type` – `Continuous`, `Discrete`, `Categorical`, `Structural`, `Parametric`.
- `Order` – sets the gene order in the chromosome.

During optimization, the engine calls `InjectGenes(double[] genes)`, which maps the array to your properties (clamped to ranges). `StrategyBase` already implements this using `GeneInjector`. If you override `InjectGenes`, call `base.InjectGenes(genes)`.

## 5.8 Neural Networks

If your strategy uses a neural network, set `RequiresNeuralNetwork = true` in your strategy. The engine will activate an `INeuralNetworkModel` from the `NeuralNetworks/` directory and assign it to `NeuralNetwork` before `OnStartAsync`.

The `GeneInjector` will automatically include the model's `ParameterCount` in `TotalGeneCount` and inject the neural network genes during `InjectGenes`. You can call `NeuralNetwork.Predict(inputs)` inside `OnTick` to get predictions.

You may also implement `INeuralNetworkModel` yourself to create custom architectures, ONNX wrappers, or RL models. See §7.

---
