---
id: product:razor/operational/installation-and-deployment/system-requirements
parent: product:razor/operational/installation-and-deployment
title: 2. System Requirements
level: product
kind: operational
---

# 2. System Requirements

## 2.1 Minimum Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores (for optimizations) |
| **RAM** | 4 GB | 8+ GB (for large tick datasets) |
| **Disk** | 10 GB free | SSD with 50+ GB free |
| **Network** | 1 Mbps outbound | 10+ Mbps outbound |
| **OS** | Windows Server 2019+ / Ubuntu 20.04+ | Latest LTS |

## 2.2 Supported Operating Systems

- **Windows** – x64, Windows 10/11, Windows Server 2019 or later.
- **Linux** – x64, Debian 11+, Ubuntu 20.04+, or any modern distribution with .NET 10 runtime installed.

**Important platform note for MetaTrader 5 adapters:** MetaTrader 5 provides only Windows DLLs. MT5 adapters **cannot run on Linux**. If your trading workflow requires MetaTrader 5, you must deploy the Razor Engine on a Windows server. Other broker APIs (cTrader, Binance, Interactive Brokers, etc.) are typically cross‑platform.

## 2.3 .NET Runtime

The Razor Engine targets .NET 10. The correct runtime is bundled with the engine archive; you do not need to install .NET separately unless you are building extensions from source.

---
