---
id: product:razor/operational/installation-and-deployment/installation-steps
parent: product:razor/operational/installation-and-deployment
title: 4. Installation Steps
level: product
kind: operational
---

# 4. Installation Steps

## 4.1 Windows Installation

1. **Extract the archive** to a permanent location, e.g., `C:\Razor\`.
2. **Place extensions** – copy your adapter, strategy, indicator, hook plugin, and NN model DLLs into the appropriate directories (see §8 for details).
3. **Run the engine**:
   - Open a **Command Prompt** or **PowerShell** as Administrator.
   - Navigate to `C:\Razor\`.
   - Run: `.\Razor.Core.Engine.exe`
   - On first startup, the engine will prompt you for your **Cloud Username**, **Cloud Password**, and **Instance API Key**. Enter them interactively.
   - For automated or service deployments, you can pass credentials via the `--auth` flag (see §4.3).

## 4.2 Linux Installation

1. **Extract the archive** to `/opt/Razor/`:
   ```bash
   sudo mkdir -p /opt/Razor
   sudo tar -xzf Razor-linux-x64.tar.gz -C /opt/Razor
   ```
2. **Set permissions**:
   ```bash
   sudo chmod +x /opt/Razor/Razor.Core.Engine
   ```
3. **Place extensions** in the appropriate subdirectories under `/opt/Razor/`.
4. **Run the engine**:
   ```bash
   cd /opt/Razor
   ./Razor.Core.Engine
   ```
   - If you are running interactively, the engine will prompt for credentials.
   - For background or service operation, use the `--auth` flag as described below.

## 4.3 Authentication Options

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
  Razor.Core.Engine.exe --auth=username,password,apikey
  ```
- The three values must be comma‑separated, with no spaces.
- **Security warning:** The command line is visible to other processes and may be stored in shell history. Use this only in secure, controlled environments. For production services, ensure that the command line is not logged.

**Option 3: Environment variable** (recommended for services)

- Set the environment variable `Razor_AUTH_TOKEN` to a base64‑encoded string of `username:password:apikey`.
- The engine reads this variable on startup if the `--auth` flag is not provided.

## 4.4 Running as a Service

The engine can be installed as a background service on both Windows and Linux.

### Windows Service

1. Install the engine binary in a permanent directory, e.g., `C:\Razor`.
2. Create a service using `sc`:
   ```
   sc create RazorEngine binPath = "C:\Razor\Razor.Core.Engine.exe --service --auth=username,password,apikey" start=auto
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
   ExecStart=/opt/Razor/Razor.Core.Engine --service --auth=username,password,apikey
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

---
