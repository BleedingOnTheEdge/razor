---
id: product:razor/blueprint/internal-architecture/introduction
parent: product:razor/blueprint/internal-architecture
title: 1. Introduction
level: product
kind: blueprint
---

# 1. Introduction

This document describes the complete internal architecture of the Razor engine. It covers all closed‑source components (`Razor.Core.Kernel`, `Razor.Core.Engine`, and future `Razor.Cloud`) and explains how they interact with the public `Razor.Core.Sdk` and extensions.

It is the primary technical reference for:

- Modifying the core engine
- Building the Engine executable and Cloud backend
- Understanding data flows, threading, and determinism
- Integrating new subsystems

**It does not cover** the public SDK contracts—those are the domain of the Extension Developer Guide. Extension developers should never see this document.

Every design decision described here must comply with the **Razor Principles** (see `RazorPrinciples.md`). This document explains *how* those principles are implemented, not why they exist.

---
