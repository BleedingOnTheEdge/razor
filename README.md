# Razor Documentation

**Version:** 1.0.0 LTS  
**Status:** Authoritative  
**Last Updated:** 2026-07-09  

---

Welcome to the Razor documentation hub. This directory contains organisation‑level documents that apply to all Razor projects, including the core engine, Cloud, and Marketplace. For repository‑specific documentation, see the `core/docs/` directory.

---

## Organisation‑Level Documents

| Document | Audience | Description |
|----------|----------|-------------|
| [Razor Principles](Razor%20Principles.md) | All teams | Immutable architectural rules governing every Razor project. |
| [Razor Product Model](Razor%20Product%20Model.md) | All teams | Product overview, components, licensing, and workflows. |
| [Razor Glossary](Razor%20Glossary.md) | All users | Definitions of all domain‑specific terms. |
| [Razor Future Features](Razor%20Future%20Features.md) | Internal & partners | Long‑term roadmap of planned features. |
| [Razor Proposal](Razor%20Proposal.md) | External (future) | High‑level introduction to Razor. |

---

## Core Engine Documentation

The following documents are located in the [core/docs/](../core/docs/) directory and provide detailed technical information about the Razor Engine and its components.

| Document | Audience | Description |
|----------|----------|-------------|
| [Razor Configuration Reference](../core/docs/Razor%20Configuration%20Reference.md) | Extension developers & power users | Complete catalog of configuration objects, enums, and validation rules. |
| [Razor Engine – Finalised Technical Blueprint](../core/docs/Razor%20Engine%20–%20Finalised%20Technical%20Blueprint.md) | Core developers | Complete engine specification: CLI, communication protocol, commands, security. |
| [Razor Extension Developer Guide](../core/docs/Razor%20Extension%20Developer%20Guide.md) | Extension developers | Comprehensive guide for building adapters, strategies, indicators, hook plugins, and NN models. |
| [Razor Installation & Deployment Guide](../core/docs/Razor%20Installation%20%26%20Deployment%20Guide.md) | End‑users & IT staff | Step‑by‑step installation, configuration, and troubleshooting. |
| [Razor Internal Technical Architecture Document](../core/docs/Razor%20Internal%20Technical%20Architecture%20Document.md) | Core developers | Data flow, broker architecture, hook system, GA engine, threading, telemetry. |

---

## Quick Links by Role

### For Extension Developers

1. Read the [Razor Principles](Razor%20Principles.md) to understand the design rules.
2. Read the [Extension Developer Guide](../core/docs/Razor%20Extension%20Developer%20Guide.md) for step‑by‑step instructions.
3. Refer to the [Configuration Reference](../core/docs/Razor%20Configuration%20Reference.md) for all config objects.
4. Use the [Glossary](Razor%20Glossary.md) for terminology.

### For Core Developers

1. Read the [Razor Principles](Razor%20Principles.md) for the architectural contract.
2. Study the [Internal Technical Architecture Document](../core/docs/Razor%20Internal%20Technical%20Architecture%20Document.md) for detailed implementation.
3. Review the [Engine Technical Blueprint](../core/docs/Razor%20Engine%20–%20Finalised%20Technical%20Blueprint.md) for the complete specification.
4. Use the [Configuration Reference](../core/docs/Razor%20Configuration%20Reference.md) for configuration details.

### For End‑Users and IT Staff

1. Read the [Product Model](Razor%20Product%20Model.md) to understand the product.
2. Follow the [Installation & Deployment Guide](../core/docs/Razor%20Installation%20%26%20Deployment%20Guide.md) to set up the Engine.
3. Refer to the [Glossary](Razor%20Glossary.md) for definitions.

---

## Document Versioning

All documents in this repository are versioned with the Razor release. The current version is **1.0.0 LTS**. Documents are updated as part of the release process and may be amended between releases for clarity and correctness.

---

## Contributing to Documentation

Documentation is maintained alongside the codebase. Improvements, corrections, and additions should be submitted via pull requests to the `core` repository. All documentation must adhere to the [Razor Principles](Razor%20Principles.md) and be written in clear, professional English.

---

*This documentation hub is the authoritative entry point for all Razor product and technical documentation. For code‑level details, refer to the source code and XML documentation comments in the respective projects.*