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
| [Razor Principles](docs/005-cross-cutting/005-001-principles/INDEX.md) | All teams | Immutable architectural rules governing every Razor project. |
| [Razor Product Model](docs/002-blueprint/002-001-project-overview/INDEX.md) | All teams | Product overview, components, licensing, and workflows. |
| [Razor Glossary](docs/005-cross-cutting/005-010-glossary/INDEX.md) | All users | Definitions of all domain‑specific terms. |
| [Razor Future Features](docs/002-blueprint/002-040-future-features/INDEX.md) | Internal & partners | Long‑term roadmap of planned features. |
| [Razor Proposal](docs/002-blueprint/002-001-project-overview/INDEX.md) | External (future) | High‑level introduction to Razor. |

---

## Core Engine Documentation

The following documents are located in the [docs/](docs/) directory and provide detailed technical information about the Razor Engine and its components.

| Document | Audience | Description |
|----------|----------|-------------|
| [Razor Configuration Reference](docs/004-contracts/004-001-configuration-reference/INDEX.md) | Extension developers & power users | Complete catalog of configuration objects, enums, and validation rules. |
| [Razor Engine – Finalised Technical Blueprint](docs/002-blueprint/002-020-engine-technical-blueprint/INDEX.md) | Core developers | Complete engine specification: CLI, communication protocol, commands, security. |
| [Razor Extension Developer Guide](docs/004-contracts/004-010-extension-developer-guide/INDEX.md) | Extension developers | Comprehensive guide for building adapters, strategies, indicators, hook plugins, and NN models. |
| [Razor Installation & Deployment Guide](docs/006-operational/006-001-installation-and-deployment/INDEX.md) | End‑users & IT staff | Step‑by‑step installation, configuration, and troubleshooting. |
| [Razor Internal Technical Architecture Document](docs/002-blueprint/002-030-internal-architecture/INDEX.md) | Core developers | Data flow, broker architecture, hook system, GA engine, threading, telemetry. |

---

## Quick Links by Role

### For Extension Developers

1. Read the [Razor Principles](docs/005-cross-cutting/005-001-principles/INDEX.md) to understand the design rules.
2. Read the [Extension Developer Guide](docs/004-contracts/004-010-extension-developer-guide/INDEX.md) for step‑by‑step instructions.
3. Refer to the [Configuration Reference](docs/004-contracts/004-001-configuration-reference/INDEX.md) for all config objects.
4. Use the [Glossary](docs/005-cross-cutting/005-010-glossary/INDEX.md) for terminology.

### For Core Developers

1. Read the [Razor Principles](docs/005-cross-cutting/005-001-principles/INDEX.md) for the architectural contract.
2. Study the [Internal Technical Architecture Document](docs/002-blueprint/002-030-internal-architecture/INDEX.md) for detailed implementation.
3. Review the [Engine Technical Blueprint](docs/002-blueprint/002-020-engine-technical-blueprint/INDEX.md) for the complete specification.
4. Use the [Configuration Reference](docs/004-contracts/004-001-configuration-reference/INDEX.md) for configuration details.

### For End‑Users and IT Staff

1. Read the [Product Model](docs/002-blueprint/002-001-project-overview/INDEX.md) to understand the product.
2. Follow the [Installation & Deployment Guide](docs/006-operational/006-001-installation-and-deployment/INDEX.md) to set up the Engine.
3. Refer to the [Glossary](docs/005-cross-cutting/005-010-glossary/INDEX.md) for definitions.

---

## Document Versioning

All documents in this repository are versioned with the Razor release. The current version is **1.0.0 LTS**. Documents are updated as part of the release process and may be amended between releases for clarity and correctness.

---

## Contributing to Documentation

Documentation is maintained alongside the codebase. Improvements, corrections, and additions should be submitted via pull requests to the `core` repository. All documentation must adhere to the [Razor Principles](docs/005-cross-cutting/005-001-principles/INDEX.md) and be written in clear, professional English.

---

*This documentation hub is the authoritative entry point for all Razor product and technical documentation. For code‑level details, refer to the source code and XML documentation comments in the respective projects.*