---
id: product:razor/flows/onboarding
title: Onboarding
level: product
kind: contract
domains: [cloud, engine, extensions, licensing, live-trading, operations, security]
flows: [onboarding]
keywords:
  - onboarding
  - getting started
  - install the engine
  - register an engine
  - instance api key
  - first run
  - developer account
references:
  - product:razor/operational/installation-and-deployment/introduction
  - product:razor/operational/installation-and-deployment/system-requirements
  - product:razor/operational/installation-and-deployment/getting-your-engine-binary
  - product:razor/operational/installation-and-deployment/installation
  - product:razor/operational/installation-and-deployment/authentication-and-startup
  - product:razor/operational/installation-and-deployment/network-requirements
  - product:razor/operational/installation-and-deployment/verifying-the-installation
  - product:razor/operational/installation-and-deployment/security-considerations
  - product:razor/blueprint/product-model/user-workflows
  - product:razor/blueprint/product-model/licensing-subscriptions
  - product:razor/blueprint/product-model/configuration-management
  - product:razor/blueprint/product-model/product-overview
  - product:razor/blueprint/engine-technical-blueprint/cli-and-startup
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/engine-technical-blueprint/platform-details
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
  - product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management
  - product:razor/blueprint/internal-architecture/cloud-control-plane
implements: [onboarding]
---

# Onboarding

## Purpose

Take a new user from an account to a working engine: get the licence and the binary, put both on a
server, authenticate, and confirm end to end that the Cloud can drive the engine. It ends with a
successful test backtest and an instance shown as Online.

## Participants

| Component | Role in this flow |
|---|---|
| User, or IT staff | Provisions the server, installs and starts the engine. |
| Cloud | Issues the account, licence and instance API key, delivers the binary, and shows instance status. |
| Engine | Boots, authenticates, discovers extensions, and reports in. |
| Extensions (extensions optional) | Placed before first start if the user has adapters, strategies, indicators, plugins or models to run. |

## Steps

| # | Step | Owner | Specified by |
|---|---|---|---|
| 1 | Obtain an account and a licence: purchase a subscription, or use the free development tier. | User, Cloud | `product:razor/blueprint/product-model/licensing-subscriptions`, `product:razor/blueprint/product-model/user-workflows` |
| 2 | Provision a server meeting the minimum specification and note the platform constraints. | User | `product:razor/operational/installation-and-deployment/system-requirements`, `product:razor/operational/installation-and-deployment/introduction` |
| 3 | Download the engine archive for the operating system from the Cloud. | User, Cloud | `product:razor/operational/installation-and-deployment/getting-your-engine-binary` |
| 4 | Extract the archive to a permanent directory and place any extension DLLs in the matching directories. | User | `product:razor/operational/installation-and-deployment/installation`, `product:razor/operational/installation-and-deployment/extension-management` |
| 5 | Register the engine in the Cloud and copy its instance API key. | User, Cloud | `product:razor/operational/installation-and-deployment/installation`, `product:razor/blueprint/product-model/licensing-subscriptions` |
| 6 | Ensure outbound connectivity: WebSocket to the Cloud endpoints on port 443, plus whatever the broker adapter needs. No inbound port is opened. | User | `product:razor/operational/installation-and-deployment/network-requirements` |
| 7 | Start the engine: interactive prompt, `--auth=username,password,apikey`, or the `RAZOR_AUTH_TOKEN` environment variable; optionally install it as a Windows service or a systemd unit. | User | `product:razor/operational/installation-and-deployment/authentication-and-startup`, `product:razor/blueprint/engine-technical-blueprint/cli-and-startup` |
| 8 | The engine authenticates and negotiates its capability set against the licence; the licence decides what the instance may do. | Engine, Cloud | `product:razor/blueprint/engine-technical-blueprint/communication-protocol`, `product:razor/blueprint/product-model/licensing-subscriptions` |
| 9 | The engine scans its extension directories, sends a manifest, and the Cloud activates the profile's set. | Engine, Cloud | `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management`, `product:razor/blueprint/internal-architecture/cloud-control-plane` |
| 10 | Verify: read the startup log, confirm the instance shows Online in the Cloud, then create a simple configuration and run a test backtest. | User, Cloud, Engine | `product:razor/operational/installation-and-deployment/verifying-the-installation` |

## Persisted and Reported

- Nothing is configured on disk: there is no configuration file, and credentials are held in memory only,
  never written to disk (`product:razor/blueprint/engine-technical-blueprint/cli-and-startup`,
  `product:razor/operational/installation-and-deployment/security-considerations`).
- First run creates `state/`, `logs/`, `downloads/`, `backup/`, `update/` and `behavior_logs/` alongside
  the executable; the engine ID is stored in SQLite and the rest of the product state lives in the Cloud
  (`product:razor/operational/installation-and-deployment/getting-your-engine-binary`,
  `product:razor/blueprint/engine-technical-blueprint/state-persistence`).
- All operational parameters arrive from the Cloud after authentication
  (`product:razor/blueprint/product-model/configuration-management`).
- The Cloud shows connectivity and health for the instance
  (`product:razor/blueprint/product-model/product-overview`).

## Failure Modes

| Failure | What happens | Specified by |
|---|---|---|
| Malformed or missing credentials | The engine exits immediately; the operator fixes the format or runs interactively. | `product:razor/operational/installation-and-deployment/logs-and-troubleshooting` |
| Firewall blocks outbound traffic | The engine cannot reach the Cloud; outbound TCP 443 must be allowed. | `product:razor/operational/installation-and-deployment/network-requirements`, `product:razor/operational/installation-and-deployment/logs-and-troubleshooting` |
| The API key is revoked or mistyped | The engine reports an invalid API key; a new key is generated in the Cloud. | `product:razor/operational/installation-and-deployment/logs-and-troubleshooting` |
| An extension is missing its version attribute | The extension is not loaded; the operator checks the assembly attributes. | `product:razor/operational/installation-and-deployment/logs-and-troubleshooting` |
| A MetaTrader 5 adapter is installed on Linux | It cannot run, because MT5 ships Windows-only DLLs. | `product:razor/operational/installation-and-deployment/system-requirements` |
| Two engine instances share one state directory | The state database locks; only one instance may run per directory. | `product:razor/operational/installation-and-deployment/logs-and-troubleshooting` |
| The binary fails its integrity check | The engine refuses to run on a tampered or unsigned build. | `product:razor/operational/installation-and-deployment/logs-and-troubleshooting`, `product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering` |
| The Cloud is temporarily unreachable at first start | The engine does not exit; it retries indefinitely rather than failing the installation. | `product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry` |

## Domain References

- `operations`: `product:razor/operational/installation-and-deployment/introduction`,
  `product:razor/operational/installation-and-deployment/installation`.
- `cloud`, `engine`: `product:razor/blueprint/engine-technical-blueprint/cli-and-startup`,
  `product:razor/blueprint/internal-architecture/cloud-control-plane`.
- `licensing`: `product:razor/blueprint/product-model/licensing-subscriptions`.
- `security`: `product:razor/operational/installation-and-deployment/security-considerations`,
  `product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering`.
- `extensions`: `product:razor/operational/installation-and-deployment/extension-management`.
- `live-trading`: `product:razor/operational/installation-and-deployment/verifying-the-installation` -
  the first-run check crosses into the live-trading domain through adapter connectivity.

## Change Entry Point

Start impact discovery here for anything that changes what a user must do between buying a licence and
seeing a working engine. `product:razor/blueprint/internal-architecture/cloud-control-plane` contributes
the instance provisioning and profile surface this flow depends on.
