---
id: product:razor/blueprint/engine-technical-blueprint/self-update
parent: product:razor/blueprint/engine-technical-blueprint
title: Self-Update
level: product
kind: blueprint
domains: [engine]
flows: [engine-update]
keywords:
  - self update
  - heartbeat update
  - checksum
  - sha-256
  - staging
  - rollback
  - compatibility check
  - restart flag
references:
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/engine-technical-blueprint/cli-and-startup
code_paths:
  - core/src/Engine/Services/Update/**
---

# Self-Update

The engine updates itself, driven entirely by the Cloud through the heartbeat. There is no separate
updater process and no manual step.

## The process

1. The Cloud includes `NewVersion`, `DownloadUrl` and `Checksum` in a `HeartbeatResponse`.
2. The engine notices a new version is available.
3. It downloads the new binary to a temporary location.
4. It verifies the **SHA-256 checksum**.
5. **Compatibility check** - it confirms every currently loaded extension's required capabilities are
   supported by the new engine's capability set.
6. If compatible, it stages the binary in the `update/` directory.
7. It writes a pending marker (`update.pending`) recording the version and the backup path.
8. It launches the new binary with `--command=restart` and exits.
9. The new process, seeing `--command=restart`, finalises the replacement - swapping itself in for the
   original executable - and resumes normal operation.

## Rollback

The previous executable is kept in `backup/`. If the new version fails to start, the engine rolls
back automatically.

The compatibility check in step 5 is what stops an update from silently disabling an extension the
user depends on - it is a gate, not a warning.
