---
id: product:razor/contracts/extension-developer-guide/developing-an-adapter/connection-lifecycle
parent: product:razor/contracts/extension-developer-guide/developing-an-adapter
title: 4.7 Connection Lifecycle
level: product
kind: contract
---

# 4.7 Connection Lifecycle

Implement `ConnectAsync` and `DisconnectAsync` to manage the underlying transport (WebSocket, REST session). Return `true` from `ConnectAsync` if the connection succeeded. The engine calls `ConnectAsync` once on startup, then uses the provider methods.
