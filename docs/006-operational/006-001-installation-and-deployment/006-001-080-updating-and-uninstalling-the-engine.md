---
id: product:razor/operational/installation-and-deployment/updating-and-uninstalling-the-engine
parent: product:razor/operational/installation-and-deployment
title: Updating and Uninstalling the Engine
level: product
kind: operational
domains: [operations, engine]
flows: [engine-update]
keywords:
  - updating the engine
  - engine update
  - self update
  - manual update
  - uninstalling
  - remove engine
  - revoke api key
references:
  - product:razor/blueprint/engine-technical-blueprint/self-update
---

# Updating and Uninstalling the Engine

## Updating the Engine

Razor Cloud notifies you when a new engine version is available. To update:

1. In the Cloud, go to **Engines** → select your engine → **Update Engine**.
2. The engine downloads the new binary, verifies its cryptographic signature, and schedules a restart.
3. If the engine is live, it will close all positions (per your settings) before restarting.

Manual update: download the new archive and replace the files, preserving your extension directories.

The download, checksum verification, staging and rollback contract behind a remote update is
specified in `product:razor/blueprint/engine-technical-blueprint/self-update`.

## Uninstalling

1. Stop the engine (Ctrl+C or `systemctl stop Razor`).
2. Delete the engine directory.
3. Revoke the engine's API key in Razor Cloud.
4. Remove the engine from the Cloud dashboard.

---
