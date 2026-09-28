---
id: product:razor/flows/engine-update
title: Engine Update
level: product
kind: contract
domains: [cloud, engine, extensions, operations, security]
flows: [engine-update]
keywords:
  - engine update
  - self update
  - update engine
  - rollback
  - staged update
  - manual update
  - binary replacement
references:
  - product:razor/blueprint/engine-technical-blueprint/self-update
  - product:razor/blueprint/engine-technical-blueprint/cli-and-startup
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering
  - product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management
  - product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
  - product:razor/blueprint/engine-technical-blueprint/platform-details
  - product:razor/blueprint/product-model/deployment-distribution
  - product:razor/blueprint/product-model/appendix-a-supported-commands
  - product:razor/contracts/extension-developer-guide/compatibility
  - product:razor/operational/installation-and-deployment/updating-and-uninstalling-the-engine
  - product:razor/operational/installation-and-deployment/getting-your-engine-binary
  - product:razor/operational/installation-and-deployment/authentication-and-startup
implements: [engine-update]
---

# Engine Update

## Purpose

Replace the running engine binary with a new version, remotely and without a separate updater process,
then resume normal operation on the new version. The Cloud announces the version; the engine downloads,
verifies, stages, restarts and - if the new version fails to start - rolls back.

## Participants

| Component | Role in this flow |
|---|---|
| Cloud | Publishes the new version, carries the download metadata in the heartbeat, and owns the release artifact. |
| Engine | Verifies, stages, restarts and rolls back. |
| Extensions (already loaded) | Their capability requirements gate the update; they are reloaded after the restart. |
| Operator | Can trigger an update from the Cloud, or perform a manual replacement. |

## Steps

| # | Step | Owner | Specified by |
|---|---|---|---|
| 1 | Trigger the update: the operator uses **Engines -> Update Engine**, or the Cloud advertises `NewVersion`, `DownloadUrl` and `Checksum` in a `HeartbeatResponse`. | Cloud, or operator | `product:razor/operational/installation-and-deployment/updating-and-uninstalling-the-engine`, `product:razor/blueprint/engine-technical-blueprint/self-update` |
| 2 | Download the new binary to a temporary location and verify its SHA-256 checksum. | Engine | `product:razor/blueprint/engine-technical-blueprint/self-update`, `product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering` |
| 3 | Compatibility gate: confirm every currently loaded extension's required capabilities are supported by the new engine's capability set. | Engine | `product:razor/blueprint/engine-technical-blueprint/self-update`, `product:razor/contracts/extension-developer-guide/compatibility` |
| 4 | Stage the binary in `update/` and write the `update.pending` marker recording the version and the backup path. | Engine | `product:razor/blueprint/engine-technical-blueprint/self-update`, `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management` |
| 5 | If a live task is running, close all positions per the user's settings before restarting. | Engine | `product:razor/operational/installation-and-deployment/updating-and-uninstalling-the-engine` |
| 6 | Launch the new binary with `--auth` (the three credentials) and `--command=restart`, then exit. | Engine | `product:razor/blueprint/engine-technical-blueprint/self-update`, `product:razor/blueprint/engine-technical-blueprint/cli-and-startup` |
| 7 | The new process recognises `--command=restart`, finalises the replacement, and resumes normal operation. | Engine | `product:razor/blueprint/engine-technical-blueprint/self-update` |
| 8 | Re-authenticate and re-establish the session; the Cloud re-signs the engine's capability set. | Engine, Cloud | `product:razor/blueprint/engine-technical-blueprint/cli-and-startup`, `product:razor/operational/installation-and-deployment/authentication-and-startup` |
| 9 | Re-discover extensions and send a fresh manifest; the Cloud re-activates the profile's set. | Engine, Cloud | `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management` |
| 10 | Report the new engine version and capabilities to the Cloud. | Engine | `product:razor/blueprint/product-model/appendix-a-supported-commands` |
| 11 | Manual alternative: download the archive and replace the files, preserving the extension directories. | Operator | `product:razor/operational/installation-and-deployment/updating-and-uninstalling-the-engine`, `product:razor/operational/installation-and-deployment/getting-your-engine-binary` |

## Persisted and Reported

- `update/` holds the staged binary and `backup/` holds the previous executable; `update.pending` records
  the transition (`product:razor/blueprint/engine-technical-blueprint/self-update`,
  `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management`).
- The local SQLite state - engine ID, cronjobs, schedules, live and optimisation snapshots - survives the
  restart; a one-off in-memory schedule does not and is the Cloud's to re-establish
  (`product:razor/blueprint/engine-technical-blueprint/state-persistence`,
  `product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs`).
- Logs continue in `logs/` across the restart
  (`product:razor/blueprint/engine-technical-blueprint/logging-and-telemetry`).
- The Cloud knows the version it deployed and the version the engine reports back.

## Failure Modes

| Failure | What happens | Specified by |
|---|---|---|
| Checksum mismatch | The download is not staged; the running engine is untouched. | `product:razor/blueprint/engine-technical-blueprint/self-update` |
| An extension's capabilities are not supported by the new version | The compatibility check is a gate, not a warning, so the update does not proceed. | `product:razor/blueprint/engine-technical-blueprint/self-update` |
| The new version fails to start | The engine rolls back automatically to the previous executable in `backup/`. | `product:razor/blueprint/engine-technical-blueprint/self-update` |
| The Cloud is unreachable | No heartbeat means no advertised version, so no remote update happens; the engine keeps running on the last known configuration. | `product:razor/blueprint/engine-technical-blueprint/offline-handling-and-retry` |
| Live positions are open when the update lands | Positions are closed per the user's settings before the restart. | `product:razor/operational/installation-and-deployment/updating-and-uninstalling-the-engine` |
| Tampered or unsigned build | Integrity and signature checks fail; the update is refused. | `product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering` |
| Restart handling differs by platform | Windows handles `Console.CancelKeyPress` and `SessionEnding`; Linux handles SIGTERM, SIGINT and SIGHUP. | `product:razor/blueprint/engine-technical-blueprint/platform-details` |

## Domain References

- `engine`, `cloud`: `product:razor/blueprint/engine-technical-blueprint/self-update`,
  `product:razor/blueprint/engine-technical-blueprint/communication-protocol`.
- `extensions`: `product:razor/blueprint/engine-technical-blueprint/extension-and-slot-management`,
  `product:razor/contracts/extension-developer-guide/compatibility`.
- `security`: `product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering`.
- `operations`: `product:razor/operational/installation-and-deployment/updating-and-uninstalling-the-engine`,
  `product:razor/operational/installation-and-deployment/authentication-and-startup`.

## Change Entry Point

Start impact discovery here for anything that changes how a new engine version is published, verified,
staged, restarted or rolled back. The distribution shape it operates on is
`product:razor/blueprint/product-model/deployment-distribution`.
