---
id: product:razor/contracts/extension-developer-guide/developing-an-adapter/adapter-capabilities-and-connection
parent: product:razor/contracts/extension-developer-guide/developing-an-adapter
title: Adapter Capabilities and Connection
level: product
kind: contract
domains: [sdk, extensions]
flows: [extension-development]
keywords:
  - capability flags
  - supports historical data
  - supports live data
  - supports execution
  - connect
  - disconnect
  - notsupportedexception
references:
  - product:razor/contracts/configuration-reference/slot-capability-interfaces
---

# Adapter Capabilities and Connection

## Capability Flags

An adapter declares which sub-capabilities it supports through the boolean flags on `IAdapterCapability`. The flags and the engine's use of them - including the requirement to throw `NotSupportedException` from a method whose capability is not declared - are defined in `product:razor/contracts/configuration-reference/slot-capability-interfaces`.

## Connection Lifecycle

Implement `ConnectAsync` and `DisconnectAsync` to manage the underlying transport (WebSocket, REST session). Return `true` from `ConnectAsync` if the connection succeeded. The engine calls `ConnectAsync` once on startup, then uses the provider methods.
