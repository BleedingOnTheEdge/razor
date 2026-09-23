---
id: product:razor/operational/installation-and-deployment/updating-the-engine
parent: product:razor/operational/installation-and-deployment
title: 9. Updating the Engine
level: product
kind: operational
---

# 9. Updating the Engine

Razor Cloud notifies you when a new engine version is available. To update:

1. In the Cloud, go to **Engines** → select your engine → **Update Engine**.
2. The engine downloads the new binary, verifies its cryptographic signature, and schedules a restart.
3. If the engine is live, it will close all positions (per your settings) before restarting.

Manual update: download the new archive and replace the files, preserving your extension directories.

---
