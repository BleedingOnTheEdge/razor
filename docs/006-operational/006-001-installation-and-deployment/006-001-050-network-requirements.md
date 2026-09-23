---
id: product:razor/operational/installation-and-deployment/network-requirements
parent: product:razor/operational/installation-and-deployment
title: 6. Network Requirements
level: product
kind: operational
---

# 6. Network Requirements

## 6.1 Outbound Connectivity

The engine must be able to establish outbound WebSocket connections to:

- **Razor Cloud** – the hardcoded endpoint `wss://cloud.Razor.io/engine` (with a fallback to `wss://cloud.Razor-fallback.io/engine`).
- **Your broker's API** – whatever host/port your adapter requires.

The engine does **not** listen on any inbound port; it initiates all connections.

## 6.2 Firewall Configuration

Ensure your firewall allows outbound TCP traffic on:
- Port 443 (HTTPS/WebSocket Secure) for Razor Cloud.
- Any ports required by your broker adapter.

No inbound ports need to be opened.

## 6.3 Proxy Support

If your network requires a proxy, contact Razor support. Explicit proxy configuration will be added in a future release.

---
