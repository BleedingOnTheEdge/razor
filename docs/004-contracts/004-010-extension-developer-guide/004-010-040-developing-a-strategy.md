---
id: product:razor/contracts/extension-developer-guide/developing-a-strategy
parent: product:razor/contracts/extension-developer-guide
title: Developing a Strategy
level: product
kind: contract
domains: [sdk, extensions]
flows: [strategy-development]
keywords:
  - developing a strategy
  - istrategycapability
  - strategybase
  - lifecycle
  - ontick
  - indicators
  - tickwindow
  - ohlc
  - gene optimization
  - injectgenes
references:
  - product:razor/contracts/configuration-reference/slot-capability-interfaces
  - product:razor/contracts/configuration-reference/gene-attributes
  - product:razor/contracts/configuration-reference/market-data-types
  - product:razor/contracts/extension-developer-guide/developing-a-neural-network-model
---

# Developing a Strategy

Strategies contain the decision logic. They react to ticks, use indicators, place orders, and can be optimized via genetic algorithms.

## The `IStrategyCapability` Interface

The interface is `IStrategyCapability` in `Sdk.Slots.Strategy`. Its members are defined in `product:razor/contracts/configuration-reference/slot-capability-interfaces`.

The `symbol` parameter tells your strategy which instrument the tick belongs to. This is essential for multi-symbol strategies. The `Tick` struct itself carries only price data (bid, ask, volume, timestamp) to maintain its fixed-size binary layout for memory-mapped I/O.

A simpler approach is to derive from `StrategyBase`, which provides convenience members.

## Strategy Lifecycle

1. `OnConfigureAsync` - Called once before data starts. The `spec` parameter (immutable) contains initial balance, leverage, and requested symbols/timeframes. Store what you need.
2. `OnStartAsync` - Called just before the first tick. The indicator registry is ready. Use this to pre-allocate buffers, initialize indicators, etc.
3. `OnTick(string symbol, Tick tick)` - Called sequentially for every tick, in chronological order. **Must be purely synchronous** to guarantee determinism in backtesting and live. The `symbol` parameter identifies which instrument the tick belongs to. This is your main logic entry point.
4. `OnStopAsync` - Called after the last tick (backtest) or when a live session is stopped. Clean up resources.
5. `InjectGenes` - Called by the optimizer to load a chromosome's gene array. You override this to apply the values to your properties/neural network.

## Using `StrategyBase`

`StrategyBase` provides:

- `Broker` - The trading interface (simulated in backtest, live adapter in production).
- `TickWindow` - Access to recent ticks and OHLC calculations (never a bar-based callback). **Not thread-safe** - use only from within `OnTick` or under external synchronisation.
- `Indicators` - The registry for your indicators.
- `Spec` - The immutable configuration.
- `PrimarySymbol` - Shorthand for the first requested symbol.
- `NeuralNetwork` - Your optional `INeuralNetworkModel` instance, set by the engine.
- `TotalGeneCount` - Computed automatically from property genes + NN parameter count.
- Helper methods: `BuyAsync`, `SellAsync`, `ModifyOrderAsync`, `CloseAllAsync`, etc.
- `GeneLock` - A `ReaderWriterLockSlim` to protect gene injection while processing ticks.

Override the virtual lifecycle methods and add your logic.

## Example Strategy Skeleton

```csharp
using Sdk.Shared;

// Your own indicator: the SDK ships no concrete indicators, so declare one and implement Calculate.
public sealed class SmaIndicator : Indicator
{
    public SmaIndicator(string symbol, TimeFrame timeframe, int period)
    {
        // Store the arguments and call Initialize(period) to size the circular buffer.
    }

    public override void Calculate(long index)
    {
        // Read Window for the symbol and store the moving average at the latest slot.
    }
}

public class SimpleMaStrategy : StrategyBase
{
    [Gene(10, 200, 1, GeneType.Discrete)]
    public int FastPeriod { get; set; } = 50;

    [Gene(50, 500, 1, GeneType.Discrete)]
    public int SlowPeriod { get; set; } = 200;

    private SmaIndicator _fastSma = null!;
    private SmaIndicator _slowSma = null!;

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

## Indicators

Indicators are created via `IIndicatorRegistry.Get<T>(args)`. The registry caches them; use the same arguments to retrieve the same instance. Your strategy receives the registry in `OnStartAsync`.

The base `Indicator` class manages a circular buffer. Override `Initialize` and `Calculate` to implement your own - for example, an SMA indicator updates on each tick using a lookback. Use the `TickWindow` for OHLC data if your indicator needs it.

## Using TickWindow for OHLC Data

Razor is tick-only, but you can still get OHLC aggregates:

```csharp
TickWindow.GetCurrentStats(symbol, TimeFrame.M1, PriceType.Bid,
    out double open, out double high, out double low, out double close,
    out double volume, out bool isComplete);
if (isComplete) { /* use OHLC */ }
```

`TickWindow` also provides `WindowCompleted` events if you override `OnWindowCompletedAsync` in `StrategyBase`.

**Thread safety:** `TickWindow` is not thread-safe. It is designed to be called exclusively from the single-threaded tick processing pipeline (`OnTick`). If you need to access it from a background task, acquire the strategy's `GeneLock` or another synchronisation primitive first.

**Never call `DateTime.UtcNow` inside a strategy** - it will break determinism and is prohibited by the engine. Use the tick's time (`tick.Time`) for all time-based decisions.

## Gene-Based Optimization

To make your strategy optimizable, mark properties with `[Gene]`. The GA will automatically discover them via reflection.

```csharp
[Gene(0.1, 5.0, 0.1, GeneType.Discrete)]
public double RiskPercent { get; set; } = 1.0;
```

The attribute - its `min`, `max`, `step` and `type` parameters, the `GeneType` values, and the rules the constructor enforces - is defined in `product:razor/contracts/configuration-reference/gene-attributes`.

During optimization, the engine calls `InjectGenes(double[] genes)`, which maps the array to your properties (clamped to ranges). `StrategyBase` already implements this using `GeneInjector`. If you override `InjectGenes`, call `base.InjectGenes(genes)`.

## Neural Networks

If your strategy uses a neural network, set `RequiresNeuralNetwork = true` in your strategy. The engine will activate an `INeuralNetworkModel` from the `NeuralNetworks/` directory and assign it to `NeuralNetwork` before `OnStartAsync`.

The `GeneInjector` will automatically include the model's `ParameterCount` in `TotalGeneCount` and inject the neural network genes during `InjectGenes`. You can call `NeuralNetwork.Predict(inputs)` inside `OnTick` to get predictions.

You may also implement `INeuralNetworkModel` yourself to create custom architectures, ONNX wrappers, or RL models. See `product:razor/contracts/extension-developer-guide/developing-a-neural-network-model`.
