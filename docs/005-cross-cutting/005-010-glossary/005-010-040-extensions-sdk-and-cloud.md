---
id: product:razor/cross-cutting/glossary/extensions-sdk-and-cloud
parent: product:razor/cross-cutting/glossary
title: Extensions, SDK and Cloud
level: product
kind: cross-cutting
domains: [extensions, sdk, cloud, operations]
keywords:
  - extensions
  - sdk
  - slots
  - hooks
  - indicators
  - neural networks
  - versioning
  - cloud
  - operations
  - health checks
references:
  - product:razor/cross-cutting/principles
---

# Extensions, SDK and Cloud

**Action Hook**
A type of hook that observes an event but cannot modify or reject data. The callback receives event data and a hook context. Registered via `IActionRegistration<T>`.

**Adapter**
An extension DLL that connects Razor to a specific broker or exchange. An adapter implements `IAdapterCapability` (in `Sdk.Slots.Adapter`), supplying historical data, live price streaming, and order execution. Examples: MetaTrader 5 adapter, Binance adapter.

**AdapterNameAttribute**
An attribute used to declare a human‑readable name for an adapter implementation. The engine uses this attribute to discover adapters by name.

**AOT (Ahead‑of‑Time Compilation)**
A .NET compilation mode that produces native code before runtime. Razor does not use AOT because it relies on reflection for extension loading and gene injection.

**Bundle**
A single extension DLL that contains multiple components — e.g., an adapter, a strategy, several indicators, and hook registrations — all in one assembly.

**Capability Interface**
An interface in the `Sdk.Slots` namespace that a slot extension must implement. The three capability interfaces are `IAdapterCapability`, `IStrategyCapability`, and `INeuralNetworkModel`.

**Razor Cloud**
The SaaS web application that manages Razor Engine instances, stores configurations, runs reports, and provides a dashboard for monitoring.

**Extension**
A .NET DLL that implements one or more contracts from `Sdk`. May be a slot (Adapter, Strategy, NN Model), an Indicator, a Hook Plugin, or any combination thereof. Loaded at runtime by the engine.

**Extension Manifest**
The list of all discovered extensions (adapters, strategies, indicators, hook plugins, NN models) that the engine sends to Razor Cloud after scanning its directories. The Cloud uses this to present activation options to the user.

**Feature Attribute**
An attribute used to mark an interface or class with a specific capability version requirement for feature negotiation.

**Filter Hook**
A type of hook that transforms or rejects data as it flows through the pipeline. The callback returns a `FilterResult<T>` indicating whether to allow (possibly modified) or reject the data. Registered via `IFilterRegistration<T>`.

**FilterResult**
A struct (`FilterResult<T>` in `Sdk.Hooks`) representing the result of a filter hook. Created via the static factory class `FilterResult`.

**Headless**
Describes the Razor Engine, which has no graphical user interface; it runs as a console/daemon process and is managed remotely.

**Health Check**
A periodic verification of engine connectivity, tick freshness, and resource usage. Reported to Razor Cloud.

**Hook**
A named point in the engine's pipeline where extensions can register callbacks. Hooks are either filters (can modify/reject data) or actions (observe only). All hook registration interfaces are in `Sdk.Hooks`.

**Hook Context**
An interface (`IHookContext` and its specialised descendants) passed to every hook callback, providing context data such as the hook name, UTC time, cancellation token, and pipeline‑specific state.

**Hook Manifest**
An interface (`IHookManifest`) implemented by hook plugin DLLs. The engine calls `RegisterHooks(IHookRegistry)` to allow the plugin to register its callbacks.

**Hook Registry**
The root registry (`IHookRegistry`) with four sub‑registries: `Backtest`, `Live`, `Optimization`, and `Report`. Each exposes typed hook registration points.

**Indicator**
A technical analysis tool that computes values from a tick stream (e.g., SMA, RSI). Derives from the `Indicator` base class in `Sdk.Shared`.

**IRegistryAwareIndicator**
Interface in `Sdk.Shared` that indicators implement to receive the `IIndicatorRegistry` for cross‑indicator references.

**IWindowAwareIndicator**
Interface in `Sdk.Shared` that indicators implement to receive the `TickWindow` dependency.

**LTS (Long‑Term Support)**
Each major Razor version (1.x, 2.x, …) is an LTS release with guaranteed stability and backward compatibility within its major.

**Neural Network Model**
A slot capability implementing `INeuralNetworkModel` (in `Sdk.Slots.NeuralNetwork`). Supports feed‑forward, ONNX, LSTM, RL, and other architectures through a unified parameter‑vector interface compatible with the GA.

**Principle**
An immutable design rule in the principles section (`product:razor/cross-cutting/principles`). Non‑negotiable; violations block merges.

**Priority**
An integer assigned to a hook registration. Lower numbers execute earlier. Same‑priority hooks are ordered alphabetically by plugin name, then by registration order.

**Product**
The top‑level unit of intent that a documentation system describes and an agent must not drift from. An organisation or directory (or org‑root) that contains one or more codebases, domains, or repos, and that exists to deliver a coherent set of capabilities to defined users. For this repository, the Product is Razor.

**ReLU (Rectified Linear Unit)**
An activation function: `max(0, x)`.

**SaaS**
Software as a Service. Razor Cloud is a SaaS product; the engine is on‑premise.

**Sdk**
The public NuGet SDK that extension developers reference. Contains only hooks, slots, domain types, and utilities — no runtime logic.

**SDK (Software Development Kit)**
The `Sdk` NuGet package that extension developers use.

**SdkVersionAttribute**
An assembly‑level attribute (`[assembly: SdkVersion("1.0.0")]`) that every extension must declare to specify the targeted SDK version.

**SemVer (Semantic Versioning)**
Versioning scheme: `Major.Minor.Patch`. Razor follows SemVer with LTS per major version.

**Sigmoid**
An S‑shaped activation function: `1 / (1 + e^(-x))`.

**Slot**
A required capability that the engine needs to operate. The three slots are Adapter, Strategy, and Neural Network Model. Only one Adapter and one Strategy can be active at a time. Activation is managed through Razor Cloud.

**Strategy**
An extension DLL implementing `IStrategyCapability` (in `Sdk.Slots.Strategy`), containing the trading logic.

**Tanh (Hyperbolic Tangent)**
An activation function: `tanh(x)`, output range `[-1, 1]`.

**Walk‑Forward Analysis**
An optimisation technique that splits data into multiple training/testing windows to avoid overfitting. Orchestrated by Razor Cloud using repeated backtest and optimisation commands; not built into the engine.
