---
id: product:razor/operational/installation-and-deployment/getting-your-engine-binary
parent: product:razor/operational/installation-and-deployment
title: Getting Your Engine Binary
level: product
kind: operational
domains: [operations, cloud]
flows: [onboarding]
keywords:
  - download engine
  - engine binary
  - engine archive
  - distribution
  - archive contents
---

# Getting Your Engine Binary

## Download

1. Log in to Razor Cloud.
2. Navigate to **Engines** → **Download Engine**.
3. Select your operating system (Windows or Linux).
4. Download the compressed archive.

## Archive Contents

The archive contains:

```
Razor/
├── Engine.exe                    (Windows) / Engine (Linux)
├── *.dll                         (engine dependencies)
├── Adapters/                     (empty – place adapter DLLs here)
├── Strategies/                   (empty – place strategy DLLs here)
├── Indicators/                   (empty – place indicator DLLs here)
├── Plugins/                      (empty – place hook plugin DLLs here)
├── NeuralNetworks/               (empty – place NN model DLLs here)
├── state/                        (created on first run – SQLite database)
├── logs/                         (created on first run)
├── downloads/                    (created on first run)
├── backup/                       (created on first run)
├── update/                       (created on first run)
└── behavior_logs/                (created on first run)
```

**There is no configuration file in the archive.** All operational parameters are supplied by Razor Cloud after authentication.

---
