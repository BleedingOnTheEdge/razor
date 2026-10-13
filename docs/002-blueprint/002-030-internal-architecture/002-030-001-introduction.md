---
id: product:razor/blueprint/internal-architecture/introduction
parent: product:razor/blueprint/internal-architecture
title: Introduction
level: product
kind: blueprint
domains: [engine]
keywords:
  - internal architecture
  - core developers
  - closed source
---

# Introduction

This document describes the complete internal architecture of the Razor engine. It covers all closed‑source components (`Kernel`, `Engine`, and `Cloud`) and explains how they interact with the public `Sdk` and extensions.

It is the primary technical reference for:

- Modifying the core engine
- Building the Engine executable and Cloud backend
- Understanding data flows, threading, and determinism
- Integrating new subsystems

**It does not cover** the public SDK contracts—those are the domain of the Extension Developer Guide. Extension developers should never see this document.

Every design decision described here must comply with the **Razor Principles** (see `product:razor/cross-cutting/principles`). This document explains *how* those principles are implemented, not why they exist.

---
