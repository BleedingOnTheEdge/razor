---
id: product:razor/blueprint/engine-technical-blueprint/cli-startup-no-bootstrap-file
parent: product:razor/blueprint/engine-technical-blueprint
title: 2. CLI & Startup (No Bootstrap File)
level: product
kind: blueprint
---

# 2. CLI & Startup (No Bootstrap File)

The Engine has a minimal CLI. It is launched without command‑line arguments in normal operation.

**Authentication Flow:**

1. Engine starts, displays a banner with version and capabilities.
2. **Credentials are never stored on disk.**  
   - On every fresh start, the Engine **prompts** the user interactively for:
     - Cloud Username
     - Cloud Password
     - Instance API Key
   - To support automated restarts (e.g., self‑update), the user can pass credentials via the command line:
     ```
     Razor.Core.Engine.exe --auth=MyUsername,MyPassword,MyInstanceApiKey
     ```
     - The `--auth` flag accepts exactly three comma‑separated values.
     - If provided, the interactive prompt is skipped.
3. Credentials are held **only in memory** and are **never** written to disk.
4. Establishes WebSocket connection to the primary Cloud endpoint (hardcoded: `wss://cloud.Razor.io/engine`).
5. Performs authentication handshake (see §4.3).
6. On success, begins normal operation (heartbeat, command listening, etc.).
7. On failure, attempts fallback endpoint (`wss://cloud.Razor-fallback.io/engine`). If all fail, it sleeps and retries indefinitely; it does not exit.

**No Persistent Files** – the Engine has no configuration file, no `.env`, no `bootstrap.json`. All operational parameters (strategy specs, execution specs, symbols, etc.) are pushed from the Cloud per command. The only local files are standard rotating logs (in `logs/`) and temporary binary tick files (managed by adapters).

**Self‑Update Restart Flag:**  
When the self‑update mechanism stages a new binary, it restarts the Engine with the `--auth` flag (carrying the stored credentials) and the `--command=restart` flag so the Engine knows it was invoked by the updater and can finalise the replacement.

---
