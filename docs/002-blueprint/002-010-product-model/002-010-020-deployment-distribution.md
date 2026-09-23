---
id: product:razor/blueprint/product-model/deployment-distribution
parent: product:razor/blueprint/product-model
title: 3. Deployment & Distribution
level: product
kind: blueprint
---

# 3. Deployment & Distribution

## 3.1 Engine Distribution
The Engine binary is distributed as a compressed archive for Windows and Linux. It is fully obfuscated and protected against reverse engineering (see Section 6). Updates are triggered remotely by Razor Cloud; the engine downloads the new binary, verifies its integrity, and restarts.

**Archive contents:**
```
razor/
├── Engine.exe       (Windows) / Engine (Linux)
├── *.dll                    (engine dependencies)
├── Adapters/                (empty – place adapter DLLs here)
├── Strategies/              (empty – place strategy DLLs here)
├── Indicators/              (empty – place indicator DLLs here)
├── Plugins/                 (empty – place hook plugin DLLs here)
├── NeuralNetworks/          (empty – place NN model DLLs here)
└── logs/                    (created on first run)
```

**No configuration file is included.** All operational parameters are supplied by Razor Cloud after authentication.

## 3.2 Client Responsibilities
The client must:

- Provision a server (physical, virtual, or cloud) meeting minimum specifications.
- Install the Engine binary.
- Ensure outbound network access to Razor Cloud and any required broker APIs.
- Manage server‑level security (firewall, OS patches).
- Provide credentials at startup (interactively or via `--auth` flag).

## 3.3 Extension Development Environment
Extension developers:

- Install the `Sdk` NuGet package in their .NET project.
- Compile their extension DLL against the SDK contracts.
- Test locally by running the Razor Engine in their development environment. The same engine binary is used; a free development license from Razor Cloud limits capabilities (e.g., only a mock adapter for live testing, limited historical data range).
- Deploy extensions by uploading them to Razor Cloud (which then pushes to the engine) or, during local testing, by placing the DLL in the appropriate engine directory.

---
