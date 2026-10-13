---
id: product:razor/operational/installation-and-deployment/installation
parent: product:razor/operational/installation-and-deployment
title: Installation
level: product
kind: operational
domains: [operations, cloud]
flows: [onboarding]
keywords:
  - installation
  - install engine
  - windows installation
  - linux installation
  - extract archive
  - permissions
  - instance api key
  - register engine
references:
  - product:razor/operational/installation-and-deployment/authentication-and-startup
  - product:razor/operational/installation-and-deployment/extension-management
---

# Installation

The engine ships as an archive and takes all of its configuration from the Cloud; there is no
configuration file to edit. Extract it, place your extensions, obtain an instance API key, and then
start it as described in
`product:razor/operational/installation-and-deployment/authentication-and-startup`.

## Windows Installation

1. **Extract the archive** to a permanent location, e.g., `C:\Razor\`.
2. **Place extensions** – copy your adapter, strategy, indicator, hook plugin, and NN model DLLs into the appropriate directories (see `product:razor/operational/installation-and-deployment/extension-management` for details).
3. **Run the engine**:
   - Open a **Command Prompt** or **PowerShell** as Administrator.
   - Navigate to `C:\Razor\`.
   - Run: `.\Engine.exe`
   - On first startup, the engine will prompt you for your **Cloud Username**, **Cloud Password**, and **Instance API Key**. Enter them interactively.
   - For automated or service deployments, you can pass credentials via the `--auth` flag (see `product:razor/operational/installation-and-deployment/authentication-and-startup`).

## Linux Installation

1. **Extract the archive** to `/opt/Razor/`:
   ```bash
   sudo mkdir -p /opt/Razor
   sudo tar -xzf Razor-linux-x64.tar.gz -C /opt/Razor
   ```
2. **Set permissions**:
   ```bash
   sudo chmod +x /opt/Razor/Engine
   ```
3. **Place extensions** in the appropriate subdirectories under `/opt/Razor/`.
4. **Run the engine**:
   ```bash
   cd /opt/Razor
   ./Engine
   ```
   - If you are running interactively, the engine will prompt for credentials.
   - For background or service operation, use the `--auth` flag as described in `product:razor/operational/installation-and-deployment/authentication-and-startup`.

## Obtaining an Instance API Key

1. In Razor Cloud, go to **Engines** → **Register New Engine**.
2. Give the engine a friendly name.
3. Copy the generated API key.
4. Use this key as the third component of the `--auth` flag or enter it when prompted.

Never share this key. If compromised, revoke it in the Cloud dashboard and generate a new one.

---
