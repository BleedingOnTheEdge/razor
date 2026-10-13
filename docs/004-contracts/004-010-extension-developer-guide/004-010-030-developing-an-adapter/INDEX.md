---
id: product:razor/contracts/extension-developer-guide/developing-an-adapter
title: Developing an Adapter
level: product
kind: contract
domains: [sdk, extensions]
flows: [extension-development]
keywords:
  - developing an adapter
  - broker connectivity
  - exchange integration
  - data providers
  - execution
  - market calculator
references:
  - product:razor/contracts/configuration-reference/slot-capability-interfaces
---

# Developing an Adapter

An adapter bridges Razor and a real exchange or broker. You must implement `IAdapterCapability`,
which consolidates all adapter functionality into a single interface with capability flags. The
interface contract is in `product:razor/contracts/configuration-reference/slot-capability-interfaces`;
this section is how to implement it.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/contracts/extension-developer-guide/developing-an-adapter/adapter-capabilities-and-connection | Capability flags and the connection lifecycle. | sdk, extensions | extension-development | |
| product:razor/contracts/extension-developer-guide/developing-an-adapter/data-providers | Historical tick files and the live tick stream. | data, extensions | extension-development | |
| product:razor/contracts/extension-developer-guide/developing-an-adapter/execution-and-market-calculator | Order execution, execution reports and exchange-specific math. | sdk, extensions | extension-development | |
| product:razor/contracts/extension-developer-guide/developing-an-adapter/example-adapter-skeleton | A worked adapter skeleton. | sdk, extensions | extension-development | |
