---
id: product:razor/blueprint/engine-technical-blueprint/platform-specific-details
parent: product:razor/blueprint/engine-technical-blueprint
title: 15. Platform‑Specific Details
level: product
kind: blueprint
---

# 15. Platform‑Specific Details

## 15.1 Windows

- Can run as Windows Service (`--service` flag).
- Signal handling: `Console.CancelKeyPress`, `SessionEnding`.

## 15.2 Linux (Ubuntu)

- Systemd unit file.
- Signal handling: SIGTERM, SIGINT, SIGHUP.

## 15.3 General

- All times UTC.
- Paths relative to Engine executable.
- Uses `Environment.ProcessorCount` for core count.

---
