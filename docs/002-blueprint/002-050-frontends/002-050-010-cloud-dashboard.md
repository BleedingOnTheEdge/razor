---
id: product:razor/blueprint/frontends/cloud-dashboard
parent: product:razor/blueprint/frontends
title: Razor Cloud Dashboard
level: product
kind: blueprint
domains:
  - cloud
  - engine
  - backtesting
  - live-trading
  - optimisation
  - reporting
  - security
flows:
  - onboarding
  - live-trading-session
  - backtest-run
  - optimisation-run
  - reporting
keywords:
  - dashboard
  - control plane
  - operator ui
  - engine fleet
  - instance management
  - profile slots
  - command dispatch
  - sse stream
  - real-time events
  - lineage tree
  - interventions
  - audit trail
references:
  - product:razor/blueprint/frontends/architecture
  - product:razor/blueprint/internal-architecture
  - product:razor/contracts/lineage-and-reproduction
code_paths:
  - frontends/apps/cloud-dashboard/**
test_paths:
  - frontends/apps/cloud-dashboard/**
---

# Razor Cloud Dashboard

## Overview & Scope

The **Razor Cloud Dashboard** (`frontends/apps/cloud-dashboard`) is the operator control plane application for the Razor Trading Platform. It provides institutional operators, portfolio managers, and algorithmic developers with an authoritative interface for managing distributed Engine instances, assigning hot-swappable extension profiles, dispatching control commands, tracking live execution telemetry, and inspecting audit trails.

The application runs as a **Next.js 15 (App Router)** single-page application with server-rendered shell capabilities, communicating with the Cloud backend at `http://localhost:5000` via REST and Server-Sent Events (SSE).

## Core Capabilities & Route Map

| Route | Purpose | Key Data Sources |
|---|---|---|
| `/` | System overview telemetry, active fleet metrics, and real-time SSE event activity. | `GET /api/instances`, SSE `/api/events/stream` |
| `/instances` | Engine fleet directory: displays all registered engine instances, heartbeat status, and manifest extension counts. | `GET /api/instances` |
| `/instances/[id]` | Engine detail view: active profile slots (Adapter, Strategy, NeuralNetwork, HookPlugins), reported manifest, and command dispatch console. | `GET /api/instances/{id}`, `GET /api/instances/{id}/commands`, `POST /api/instances/{id}/commands` |
| `/runs` | Flow runs registry: lists backtests, optimizations, and walk-forward runs with status and ranking metrics. | `GET /api/runs`, `GET /api/instances/{id}/runs` |
| `/runs/[id]/lineage` | Lineage visualization: renders execution tree showing Original, Appended, Branched, and Spliced relationships. | `GET /api/runs/{id}/lineage` |
| `/reports/[id]` | Comprehensive run report: displays performance metrics, recorded gaps, and append-only intervention history. | `GET /api/runs/{id}/report` |

## Key Architectural Modules

### 1. Engine Fleet Management (`/instances`)
Displays engine instances registered under the operator's account:
- **Status Lifecycle Indicators**: Renders instance health (`Pending`, `Active`, `Draining`, `Decommissioned`) using `@razor/ui-kit` status badges.
- **Heartbeat & Connection Telemetry**: Real-time indication of WebSocket engine socket connectivity with last-seen timestamps converted from UTC.
- **Manifest Count**: Quantifies loaded plugins reported by the engine's bootstrap manifest.

### 2. Profile Slot Configuration (`/instances/[id]`)
Enables zero-downtime hot swapping of trading logic:
- **Extension Slots**: Inspects active selections for:
  - `Adapter Slot`: Active broker/exchange feed.
  - `Strategy Slot`: Active portfolio/order generation logic.
  - `NeuralNetwork Slot`: Active deep learning or ONNX inference model.
  - `HookPlugins`: Active risk, logging, or behavioral hooks.
- **Command Dispatcher**: Allows operators to issue commands with numeric IDs (e.g. `1001 SoftReload`, `1002 PauseTrading`, `1003 Drain`) directly to the connected engine via `POST /api/instances/{instanceId}/commands`.
- **Command History**: Chronological log of dispatched commands and delivery statuses (`Queued`, `Dispatched`, `Delivered`, `Completed`, `Failed`).

### 3. Real-Time Domain Event Stream (SSE)
- Connects to `/api/events/stream` via native `EventSource`.
- Ingests immutable `ClientEvent` records broadcast from the Cloud control plane.
- Emits reactive state updates across the dashboard when:
  - An engine instance registers or updates status.
  - A command status changes.
  - A flow run is created, paused, resumed, or completed.
  - An operator intervention is recorded.

### 4. Lineage and Reproduction Explorer (`/runs/[id]/lineage`)
Implements the contract defined in `product:razor/contracts/lineage-and-reproduction`:
- Renders hierarchical relation nodes representing branching, splicing, and continuous execution.
- Identifies fork points (step index, generation, window index) and displays the cryptographic fingerprint delta (`previousFingerprint` $\rightarrow$ `newFingerprint`).
- Displays whether a run is marked as `isDiverged` or `comparable` according to deterministic ranking policies.

## Security & Access Control

- All outbound REST requests inject the `X-Cloud-Management-Key` header via `@razor/api-client`.
- No engine credentials or signing private keys are stored on the client.
- Sensitive parameters in dispatched commands are masked in the audit view unless explicitly revealed by an authorized operator.
