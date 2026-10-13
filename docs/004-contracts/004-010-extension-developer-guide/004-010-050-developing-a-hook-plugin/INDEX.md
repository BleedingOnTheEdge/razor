---
id: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin
title: Developing a Hook Plugin
level: product
kind: contract
domains: [extensions]
flows: [extension-development]
keywords:
  - developing a hook plugin
  - ihookmanifest
  - hook registration
  - fire and forget
  - async void
  - hook examples
references:
  - product:razor/contracts/configuration-reference/hook-system
---

# Developing a Hook Plugin

Hook plugins are the primary extensibility mechanism: you implement `IHookManifest` and register
callbacks on named hook points. The hook contract - the registration interfaces, the hook contexts,
the priority rules and the complete hook catalogue - is in
`product:razor/contracts/configuration-reference/hook-system`. This section covers the implementation
patterns: how to run asynchronous work safely from a callback, and worked examples.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/safe-fire-and-forget-async-patterns | Running async work from a synchronous action callback without crashing the process. | extensions | extension-development | |
| product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/hook-plugin-examples | Worked examples: risk management and custom metrics. | extensions | extension-development | |
