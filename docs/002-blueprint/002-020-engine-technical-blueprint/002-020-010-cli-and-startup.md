---
id: product:razor/blueprint/engine-technical-blueprint/cli-and-startup
parent: product:razor/blueprint/engine-technical-blueprint
title: CLI and Startup
level: product
kind: blueprint
domains: [engine]
keywords:
  - cli
  - startup
  - bootstrap
  - auth flag
  - credentials
  - restart flag
  - no config file
references:
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/engine-technical-blueprint/self-update
code_paths:
  - core/src/Engine/Program.cs
  - core/src/Engine/Core/Credentials.cs
---

# CLI and Startup

The engine has a minimal CLI and is launched without arguments in normal operation.

## Authentication flow

1. The engine starts and displays a banner with its version and capabilities.
2. Credentials are collected, and **are never stored on disk**:
   - on every fresh start the engine **prompts interactively** for the Cloud username, Cloud
     password and instance API key;
   - to support automated restarts, for example after a self-update, they may be supplied on the
     command line:
     ```text
     Engine.exe --auth=MyUsername,MyPassword,MyInstanceApiKey
     ```
     The flag accepts **exactly three** comma-separated values; when present the interactive prompt is
     skipped.
3. Credentials are held **only in memory** and never written to disk.
4. The engine opens a WebSocket to the primary Cloud endpoint, `wss://cloud.Razor.io/engine`.
5. It performs the authentication handshake (see `communication-protocol`).
6. On success, normal operation begins - heartbeat, command listening, and so on.
7. On failure it attempts the fallback endpoint, `wss://cloud.Razor-fallback.io/engine`. If every
   endpoint fails it sleeps and retries indefinitely; it does not exit.

## No persistent files

There is no configuration file, no `.env`, no `bootstrap.json`. All operational parameters - strategy
specifications, execution specifications, symbols - arrive from the Cloud with each command. The only
local files are the rotating logs under `logs/` and the temporary binary tick files that adapters
manage.

## The restart flag

When the self-update mechanism has staged a new binary it restarts the engine with `--auth` (carrying
the credentials) and `--command=restart`, so the new process knows it was invoked by the updater and
can finalise the replacement. See `self-update`.
