---
id: product:razor/operational/installation-and-deployment/authentication-and-startup
parent: product:razor/operational/installation-and-deployment
title: Authentication and Startup
level: product
kind: operational
domains: [operations, cloud, security]
flows: [onboarding]
keywords:
  - authentication
  - interactive prompt
  - instance api key
  - environment variable
  - razor_auth_token
  - windows service
  - systemd
  - command-line flags
  - --auth
references:
  - product:razor/blueprint/engine-technical-blueprint/cli-and-startup
  - product:razor/blueprint/engine-technical-blueprint/self-update
---

# Authentication and Startup

The engine is started with credentials supplied at startup; there is no configuration file. The
engine's CLI and credential contract - the exact `--auth` format, the `--command=restart` flag, and
the absence of any bootstrap file - is specified in
`product:razor/blueprint/engine-technical-blueprint/cli-and-startup` and
`product:razor/blueprint/engine-technical-blueprint/self-update`. This document is the operator
procedure.

## Authentication Options

Credentials are **never stored on disk**. They are held in memory only for the duration of the session.

**Option 1: Interactive Prompt** (default)

- Run the engine with no arguments. It will display:
  ```
  === Engine Authentication ===
  Cloud Username:
  Cloud Password:
  Instance API Key:
  ```
- Enter your credentials. They are validated against Razor Cloud and then used to establish the secure session.

**Option 2: Command‑line `--auth` flag** (for automation)

- Use the following syntax:
  ```bash
  Engine.exe --auth=username,password,apikey
  ```
- The three values must be comma‑separated, with no spaces.
- **Security warning:** The command line is visible to other processes and may be stored in shell history. Use this only in secure, controlled environments. For production services, ensure that the command line is not logged.

**Option 3: Environment variable** (recommended for services)

- Set the environment variable `Razor_AUTH_TOKEN` to a base64‑encoded string of `username:password:apikey`.
- The engine reads this variable on startup if the `--auth` flag is not provided.

## Running as a Service

The engine can be installed as a background service on both Windows and Linux.

### Windows Service

1. Install the engine binary in a permanent directory, e.g., `C:\Razor`.
2. Create a service using `sc`:
   ```
   sc create RazorEngine binPath = "C:\Razor\Engine.exe --service --auth=username,password,apikey" start=auto
   ```
3. Start the service:
   ```
   sc start RazorEngine
   ```
4. Monitor logs in `C:\Razor\logs\`.

### Linux systemd Service

1. Install the engine binary in `/opt/Razor`.
2. Create `/etc/systemd/system/Razor.service`:
   ```ini
   [Unit]
   Description=Razor Engine
   After=network.target

   [Service]
   ExecStart=/opt/Razor/Engine --service --auth=username,password,apikey
   WorkingDirectory=/opt/Razor
   Restart=on-failure
   RestartSec=10
   User=Razor
   Group=Razor
   StandardOutput=append:/opt/Razor/logs/stdout.log
   StandardError=append:/opt/Razor/logs/stderr.log

   [Install]
   WantedBy=multi-user.target
   ```
3. Enable and start:
   ```
   sudo systemctl daemon-reload
   sudo systemctl enable Razor
   sudo systemctl start Razor
   ```

> **Note:** Replace `username,password,apikey` with the actual credentials. The `--service` flag tells the engine to run as a daemon/service.

## Command‑Line Reference

| Flag | Description |
|------|-------------|
| `--auth=username,password,apikey` | Sets credentials via command line. |
| `--help`, `-h` | Shows help message. |
| `--version`, `-v` | Shows version information. |
| `--service` | Runs as a Windows Service (Windows) or systemd (Linux). |
| `--development` | Runs in development mode (disables some security checks). |
| `--command=restart` | Internal use for self‑update. |

The credential semantics of `--auth` and the restart semantics of `--command=restart` are owned by
`product:razor/blueprint/engine-technical-blueprint/cli-and-startup` and
`product:razor/blueprint/engine-technical-blueprint/self-update`.

---
