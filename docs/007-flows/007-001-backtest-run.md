---
id: product:razor/flows/backtest-run
title: Backtest Run
level: product
kind: contract
domains: [backtesting, cloud, data, engine, live-trading, operations, sdk]
flows: [backtest-run]
keywords:
  - backtest
  - backtest run
  - simple backtest
  - RunBacktest
  - historical replay
  - cloud-orchestrated backtest
references:
  - product:razor/blueprint/internal-architecture/backtesting-engine
  - product:razor/blueprint/internal-architecture/data-flow-architecture
  - product:razor/blueprint/internal-architecture/broker-architecture
  - product:razor/blueprint/internal-architecture/clock-system
  - product:razor/blueprint/internal-architecture/telemetry-observability
  - product:razor/blueprint/internal-architecture/messaging-events
  - product:razor/blueprint/internal-architecture/report-generation-engine-role
  - product:razor/blueprint/internal-architecture/configuration-specification-system
  - product:razor/blueprint/internal-architecture/cloud-control-plane
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/engine-technical-blueprint/command-system
  - product:razor/blueprint/engine-technical-blueprint/concurrency-and-task-management
  - product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
  - product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery
  - product:razor/blueprint/product-model/appendix-a-supported-commands
  - product:razor/blueprint/product-model/configuration-management
  - product:razor/blueprint/product-model/control-monitoring
  - product:razor/contracts/configuration-reference/execution-specification
  - product:razor/contracts/configuration-reference/strategy-specification
  - product:razor/contracts/configuration-reference/market-data-types
  - product:razor/contracts/configuration-reference/validation-and-exceptions
  - product:razor/contracts/configuration-reference/hook-system
  - product:razor/operational/installation-and-deployment/verifying-the-installation
implements: [backtest-run]
---

# Backtest Run

## Purpose

Replay a historical tick dataset through a strategy on the client's engine and return the raw result to
the Cloud. The Cloud authors the request; the engine executes it as one medium-priority task and streams
progress and results back. This is the simple backtest flow: a single Cloud-orchestrated `RunBacktest`,
not an engine feature.

## Participants

| Component | Role in this flow |
|---|---|
| Cloud | Authors the full configuration, sends `RunBacktest`, stores results and renders reports. |
| Engine | Receives the command, dispatches it, admits a task, streams progress and results. |
| Kernel | `BacktestRunner`, `SimulatedBroker`, `MergedTickTimeline`, metrics. |
| Adapter (extension) | Supplies historical ticks as a binary file and owns that file's lifecycle. |
| Strategy (extension) | Consumes ticks and places orders through the simulated broker. |

## Steps

| # | Step | Owner | Specified by |
|---|---|---|---|
| 1 | Build the complete payload - `StrategySpecification`, `ExecutionSpecification`, optionally genes and a neural network - and send `RunBacktest` (backtesting band 1200-1203) over the encrypted WebSocket. | Cloud | `product:razor/blueprint/product-model/configuration-management`, `product:razor/blueprint/engine-technical-blueprint/communication-protocol`, `product:razor/blueprint/product-model/appendix-a-supported-commands` |
| 2 | Deserialize the message, fire `CommandReceived`, and dispatch by `CommandId` to the `RunBacktest` handler. | Engine | `product:razor/blueprint/internal-architecture/solution-structure`, `product:razor/blueprint/engine-technical-blueprint/command-system` |
| 3 | Validate the specification records; an invalid record throws `ConfigurationException` and the run does not start. | Kernel | `product:razor/blueprint/internal-architecture/configuration-specification-system`, `product:razor/contracts/configuration-reference/validation-and-exceptions` |
| 4 | Admit a backtest task at Medium priority on the shared CPU budget; live trading keeps its reserved core. | Engine | `product:razor/blueprint/engine-technical-blueprint/concurrency-and-task-management` |
| 5 | Set up the run: `TickClock`, `SimulatedBroker` over the adapter's `IMarketCalculator` and `SymbolProperties`, `TickWindow` for the requested timeframes, strategy wiring. | Kernel | `product:razor/blueprint/internal-architecture/backtesting-engine`, `product:razor/blueprint/internal-architecture/broker-architecture`, `product:razor/blueprint/internal-architecture/clock-system` |
| 6 | Fetch historical data: the adapter writes the binary tick file, the engine maps it read-only and merges the streams into one chronological timeline. | Adapter, then Kernel | `product:razor/blueprint/internal-architecture/data-flow-architecture`, `product:razor/contracts/configuration-reference/market-data-types` |
| 7 | Inject genes: use the supplied genes, otherwise derive a deterministic set from `ExecutionSpecification.GeneInitializationSeed`. | Kernel | `product:razor/blueprint/internal-architecture/backtesting-engine`, `product:razor/contracts/configuration-reference/execution-specification` |
| 8 | Run the strategy lifecycle: `OnConfigureAsync`, then `OnStartAsync`. | Strategy, driven by Kernel | `product:razor/blueprint/internal-architecture/backtesting-engine` |
| 9 | Main loop, per tick in order: set the tick clock, `OnTickReceived` filter, `broker.OnTickAsync`, `OnTickStrategyBefore` filter, push to `TickWindow`, `strategy.OnTick`, `OnTickStrategyAfter`, `OnTickCompleted`. | Kernel, Strategy | `product:razor/blueprint/internal-architecture/backtesting-engine`, `product:razor/contracts/configuration-reference/hook-system` |
| 10 | Teardown: close open positions per symbol, dispose indicators, `OnStopAsync`; collect trade history, calculate metrics, publish `BacktestCompletedEvent`, fire `OnCompleted`. | Kernel | `product:razor/blueprint/internal-architecture/backtesting-engine`, `product:razor/blueprint/internal-architecture/messaging-events` |
| 11 | Release the data: dispose the mapped views and let the adapter delete or keep each file per its data action policy. | Kernel, Adapter | `product:razor/blueprint/internal-architecture/data-flow-architecture`, `product:razor/contracts/configuration-reference/market-data-types` |
| 12 | Stream `CommandProgress` during the run and the raw result at the end; render the report server-side. | Engine, then Cloud | `product:razor/blueprint/engine-technical-blueprint/communication-protocol`, `product:razor/blueprint/internal-architecture/report-generation-engine-role` |

## Persisted and Reported

- The Cloud stores the run, its results, its progress and its provenance; the engine keeps no backtest
  result of its own (`product:razor/blueprint/internal-architecture/cloud-control-plane`,
  `product:razor/blueprint/internal-architecture/report-generation-engine-role`).
- The engine writes only rotating structured logs locally, and streams raw result data to the Cloud
  (`product:razor/blueprint/engine-technical-blueprint/state-persistence`).
- Throughput telemetry is recorded per run (`product:razor/blueprint/internal-architecture/telemetry-observability`).
- The dashboard shows backtest percent complete while the run is in flight
  (`product:razor/blueprint/product-model/control-monitoring`).
- A test backtest is also the operator's end-to-end connectivity check
  (`product:razor/operational/installation-and-deployment/verifying-the-installation`).

## Failure Modes

| Failure | What happens | Specified by |
|---|---|---|
| Invalid configuration | `ConfigurationException`; the command returns an error and no run starts. | `product:razor/contracts/configuration-reference/validation-and-exceptions` |
| Adapter cannot fetch history | The adapter operation fails; the run fails rather than running on partial data. | `product:razor/contracts/configuration-reference/validation-and-exceptions`, `product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery` |
| Ticks out of order | The merged timeline throws; the run stops. | `product:razor/blueprint/internal-architecture/data-flow-architecture` |
| Task faults | The task is marked `Faulted` and the Cloud is notified. | `product:razor/blueprint/engine-technical-blueprint/error-handling-and-recovery` |
| `CancelBacktest` received | The run is cancelled through the same command surface. | `product:razor/blueprint/product-model/appendix-a-supported-commands` |
| Cloud connection lost mid-run | The run continues; outgoing data is queued in SQLite and sent when the connection returns. | `product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry` |
| Engine restarts mid-run | The run is lost; configuration lives in the Cloud, so it is re-issued rather than recovered locally. | `product:razor/blueprint/engine-technical-blueprint/state-persistence` |

## Domain References

- `backtesting`, `engine`: `product:razor/blueprint/internal-architecture/backtesting-engine`,
  `product:razor/blueprint/internal-architecture/solution-structure`.
- `data`, `sdk`: `product:razor/blueprint/internal-architecture/data-flow-architecture`,
  `product:razor/contracts/configuration-reference/market-data-types`.
- `live-trading`: `product:razor/blueprint/internal-architecture/broker-architecture` - the simulated
  broker is the backtest half of the live/backtest parity pair.
- `cloud`: `product:razor/blueprint/internal-architecture/cloud-control-plane`,
  `product:razor/blueprint/product-model/control-monitoring`.
- `operations`: `product:razor/operational/installation-and-deployment/verifying-the-installation`.

## Change Entry Point

Any change that touches how a backtest is requested, executed, streamed or reported starts impact
discovery here. `product:razor/blueprint/internal-architecture/cloud-control-plane` refers to
`product:razor/flows` because the simple backtest is one of the flows the Cloud orchestrates.
