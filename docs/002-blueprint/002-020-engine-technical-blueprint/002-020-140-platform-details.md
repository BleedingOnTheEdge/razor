---
id: product:razor/blueprint/engine-technical-blueprint/platform-details
parent: product:razor/blueprint/engine-technical-blueprint
title: Platform Details
level: product
kind: blueprint
domains: [engine, operations]
keywords:
  - windows
  - linux
  - ubuntu
  - systemd
  - signal handling
  - utc
  - paths
references:
  - product:razor/blueprint/product-model/deployment-distribution
  - product:razor/operational/installation-and-deployment
---

# Platform Details

The engine supports two platforms, and the differences between them are only about how the process is
hosted and stopped.

## Windows

- Runs as a service or in a console.
- Handles `Console.CancelKeyPress` and `SessionEnding`.

## Linux (Ubuntu)

- Runs under a systemd unit.
- Handles SIGTERM, SIGINT and SIGHUP.

## Common to both

- **All times are UTC.** There is no local-time handling anywhere in the engine.
- **All paths are relative to the engine executable**, which is what makes the archive layout in
  `product:razor/blueprint/product-model/deployment-distribution` portable.
- Core count comes from the platform's processor count.
