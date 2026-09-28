---
id: product:razor/cross-cutting/principles
title: Razor Principles
level: product
kind: cross-cutting
domains: [engine, data, extensions, sdk, live-trading, backtesting, optimisation, reporting, security, operations]
keywords:
  - principles
  - architectural contract
  - invariants
  - constitution
  - design rules
  - precedence
  - enforcement
---

# Razor Principles

The immutable, mandatory design rules that govern the Razor trading engine. Every line of code
committed to `Kernel`, `Engine`, `Cloud` and `Sdk` must respect them, and they apply to the current
v1.0.0 LTS release and to all later versions.

These principles are not implementation details; they are the **architectural contract**. All
subsystems - backtesting, live trading, optimisation, reporting, extension loading - derive from
them. Every design decision described in `product:razor/blueprint/internal-architecture` must comply
with them; that section explains *how* they are implemented, not why they exist.

Each document's title carries the principle's ordinal, and that ordinal is stable: other documents in
this tree cite principles by number (for example "Principle 3") and resolve that number to the
document here. Documents 19 and 20 are meta-rules about the set as a whole rather than principles.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/cross-cutting/principles/market-exchange-asset-agnosticism | The core engine knows no market type; every exchange-specific behaviour belongs to an adapter. | engine, extensions, data | | |
| product:razor/cross-cutting/principles/determinism-is-mandatory | Identical inputs must produce bit-identical output, from a seeded portable RNG, verified by a golden test. | engine, backtesting, optimisation | | |
| product:razor/cross-cutting/principles/internal-clock-no-system-time-in-trading-logic | Market time comes from the latest tick through `IClock`; the system clock is for scheduling and telemetry only. | engine, live-trading, backtesting | | |
| product:razor/cross-cutting/principles/tick-only-core-no-bar-dependencies | Ticks are the only price unit the core processes; bars exist only in adapters for legacy import. | engine, data, backtesting | | |
| product:razor/cross-cutting/principles/live-backtest-behavioural-parity | The simulated and live brokers must produce identical market-to-account effects for the same ticks. | live-trading, backtesting | | |
| product:razor/cross-cutting/principles/extension-versioning-compatibility | Every extension declares the SDK version it targets, and the host validates it before loading. | extensions, sdk | | |
| product:razor/cross-cutting/principles/adapter-owned-data-lifecycle | The adapter creates and deletes its binary data files, and deletes only after Razor signals safety. | extensions, data | | |
| product:razor/cross-cutting/principles/sorted-tick-data-contract | Adapters must store ticks sorted by ascending time; unsorted data is an adapter error. | data, extensions | | |
| product:razor/cross-cutting/principles/configuration-is-source-of-truth-strict-validation | Every specification record is validated and immutable, with no silent defaults for critical parameters. | engine, data | | |
| product:razor/cross-cutting/principles/performance-memory-efficiency | The hot paths minimise allocation, using pooled and uninitialised arrays, blittable structs and memory-mapped files. | engine, optimisation | | |
| product:razor/cross-cutting/principles/code-quality-documentation-mandates | Public and protected members are XML-documented, style is enforced, and suppressions are scoped and justified. | engine | | |
| product:razor/cross-cutting/principles/testing-determinism-verification | Unit, integration and golden determinism tests must accompany the code and pass before merge. | engine, backtesting | | |
| product:razor/cross-cutting/principles/live-trading-robustness | The live engine reconciles with the exchange, never silently fails, and never crashes the process. | live-trading, operations | | |
| product:razor/cross-cutting/principles/extension-isolation-future-extensibility | Extensions load in isolated, signed assembly contexts, discovered by scanning and version-checked. | extensions, security | | |
| product:razor/cross-cutting/principles/messaging-observability | Significant events publish on the in-process message bus and the engine exports OpenTelemetry metrics. | engine, reporting | | |
| product:razor/cross-cutting/principles/future-proofing-net-version | Razor targets the latest stable .NET major and keeps its NuGet dependencies on stable releases. | engine | | |
| product:razor/cross-cutting/principles/versioning-long-term-support | Every major release is an LTS; breaking changes, including output changes, are reserved for major versions. | engine | | |
| product:razor/cross-cutting/principles/feature-based-versioning-future | As the extension system evolves, feature attributes must let the host negotiate capabilities with extensions. | extensions, sdk | | |
| product:razor/cross-cutting/principles/principle-precedence | The order that resolves a conflict between principles, and the exception process. | engine | | |
| product:razor/cross-cutting/principles/enforcement | How the principles are enforced: review, static analysis, the golden test gate, and the extension SDK guide. | engine, operations | | |
