---
id: product:razor/contracts/extension-developer-guide
title: Razor Extension Developer Guide
level: product
kind: contract
domains: [sdk, extensions]
flows: [extension-development, extension-deployment, strategy-development]
keywords:
  - extension developer guide
  - adapter
  - strategy
  - indicator
  - hook plugin
  - neural network model
  - sdk package
  - deployment
  - compatibility
references:
  - product:razor/contracts/configuration-reference
code_paths:
  - core/src/Sdk/**
---

# Razor Extension Developer Guide

How to build adapters, strategies, indicators, hook plugins and neural-network models against the
public `Sdk`. This section is the how-to; the exact interfaces, configuration objects and validation
rules it works against are the contract in `product:razor/contracts/configuration-reference`.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/contracts/extension-developer-guide/introduction | Extension types, prerequisites, and where to look next. | sdk, extensions | extension-development | |
| product:razor/contracts/extension-developer-guide/extension-concepts | Slots, indicators and hooks; what the `Sdk` package is. | sdk, extensions | extension-development | |
| product:razor/contracts/extension-developer-guide/project-setup | Class library setup and the `SdkVersion` assembly attribute. | sdk, extensions | extension-development | |
| product:razor/contracts/extension-developer-guide/developing-an-adapter | Building an adapter: the interface, data and execution providers, market calculator. | sdk, extensions | extension-development | |
| product:razor/contracts/extension-developer-guide/developing-a-strategy | Building a strategy: lifecycle, `StrategyBase`, indicators, genes, `TickWindow`. | sdk, extensions | strategy-development | |
| product:razor/contracts/extension-developer-guide/developing-a-hook-plugin | Hook plugin examples and the safe fire-and-forget async pattern. | extensions | extension-development | |
| product:razor/contracts/extension-developer-guide/developing-a-neural-network-model | Building a custom `INeuralNetworkModel`. | sdk, extensions | extension-development | |
| product:razor/contracts/extension-developer-guide/best-practices | Performance, thread-safety and determinism guidance. | sdk, extensions | extension-development | |
| product:razor/contracts/extension-developer-guide/deployment | Directory placement, activation and local testing. | extensions | extension-deployment | |
| product:razor/contracts/extension-developer-guide/compatibility | SDK version compatibility and platform constraints. | extensions | extension-deployment | |
