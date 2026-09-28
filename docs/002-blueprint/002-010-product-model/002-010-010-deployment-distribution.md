---
id: product:razor/blueprint/product-model/deployment-distribution
parent: product:razor/blueprint/product-model
title: Deployment and Distribution
level: product
kind: blueprint
domains: [engine]
flows: [engine-update, extension-development]
keywords:
  - distribution
  - archive layout
  - engine binary
  - client responsibilities
  - development environment
  - obfuscation
references:
  - product:razor/blueprint/product-model/product-overview
  - product:razor/blueprint/product-model/communication-security
  - product:razor/operational/installation-and-deployment
---

# Deployment and Distribution

## Engine distribution

The engine ships as a compressed archive for Windows and Linux. It is fully obfuscated and protected
against reverse engineering (see `product:razor/blueprint/product-model/communication-security`).
Updates are triggered remotely by the Cloud: the engine downloads the new binary, verifies its
integrity, and restarts.

```text
razor/
  Engine.exe            (Windows) / Engine (Linux)
  *.dll                 engine dependencies
  Adapters/             empty - adapter DLLs are placed here
  Strategies/           empty - strategy DLLs are placed here
  Indicators/           empty - indicator DLLs are placed here
  Plugins/              empty - hook plugin DLLs are placed here
  NeuralNetworks/       empty - neural-network model DLLs are placed here
  logs/                 created on first run
```

**No configuration file is included.** All operational parameters are supplied by the Cloud after
authentication.

## Client responsibilities

The client must:

- provision a server (physical, virtual or cloud) meeting the minimum specification;
- install the engine binary;
- ensure outbound network access to the Cloud and to any required broker APIs;
- manage server-level security - firewall, OS patches;
- provide credentials at startup, interactively or via `--auth`.

## Extension development environment

Extension developers:

- install the `Sdk` NuGet package in their .NET project;
- compile the extension DLL against the SDK contracts;
- test locally by running the engine in their development environment - the same binary, with a free
  development licence that limits capabilities (mock adapter for live trading, restricted historical
  data range);
- deploy by uploading to the Cloud, which pushes to the engine, or during local testing by placing
  the DLL in the appropriate engine directory.
