---
id: product:razor/contracts/extension-developer-guide/introduction
parent: product:razor/contracts/extension-developer-guide
title: Introduction
level: product
kind: contract
domains: [sdk, extensions]
flows: [extension-development]
keywords:
  - introduction
  - extension types
  - prerequisites
  - further resources
references:
  - product:razor/contracts/configuration-reference
  - product:razor/cross-cutting/principles
  - product:razor/operational/installation-and-deployment
---

# Introduction

This guide teaches you how to create extensions for Razor. An extension is a .NET DLL that implements one or more public contracts from the `Sdk` NuGet package. The engine discovers and loads extensions at runtime through isolated contexts, and activation is managed through Razor Cloud.

The following extension types are supported:

- **Adapter** - Connects Razor to a broker or exchange (`IAdapterCapability`).
- **Strategy** - Trading logic that reacts to ticks and places orders (`IStrategyCapability`).
- **Indicator** - Technical analysis tools (SMA, RSI, etc.) (`Indicator` base class).
- **Hook Plugin** - Intercepts engine events via filter and action hooks (`IHookManifest`).
- **Neural Network Model** - Feed-forward, ONNX, LSTM, RL models for strategy use (`INeuralNetworkModel`).

A single DLL can combine any of these - for example, a strategy that also registers hooks. All extension types share the same versioning and deployment mechanisms.

## Prerequisites

- .NET 10 SDK or later.
- Basic knowledge of trading concepts (bid/ask, margin, orders).
- A text editor or IDE (Visual Studio, Rider, VS Code).

## Where to Get Help

- The `Sdk` NuGet package contains XML documentation for every public member.
- This guide is your primary reference.
- `product:razor/contracts/configuration-reference` - every configuration object, enumeration and validation rule.
- `product:razor/cross-cutting/principles` - the engine's design rules.
- `product:razor/operational/installation-and-deployment` - setting up the engine.
