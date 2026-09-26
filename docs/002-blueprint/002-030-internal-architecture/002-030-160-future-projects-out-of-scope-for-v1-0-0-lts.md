---
id: product:razor/blueprint/internal-architecture/future-projects-out-of-scope-for-v1-0-0-lts
parent: product:razor/blueprint/internal-architecture
title: 17. Future Projects (Out of Scope for v1.0.0 LTS)
level: product
kind: blueprint
---

# 17. Future Projects (Out of Scope for v1.0.0 LTS)

## 17.1 Razor.Cloud

- SaaS web application.
- Sends commands, receives progress/results, stores all data.
- Provides dashboards for monitoring, reporting, and configuration.
- Manages user accounts, licenses, extension deployment.
- Stores user profiles with active adapter, strategy, indicators, and hook plugin selections per engine instance.

### Status

**In progress — no longer out of scope for v1.0.0 LTS** (owner ruling, 2026-09-26; issue #24).
The statements above that place Cloud after the stable v1.0.0 kernel release and in a separate
private repository are superseded for Cloud.

- Cloud is implemented in this repository at `core/src/Cloud`. The owner ruled that its main
  place is there, because co-location gives it versioning, maintenance, testing and reuse of
  `Shared`/`Kernel`/`Sdk` by project reference.
- The project is named exactly `Cloud`: the project file is `Cloud.csproj`, the assembly is
  `Cloud`, and the root namespace is `Cloud`. This is the name the owner fixed for it; the
  `Razor.Cloud` heading above is retained pending the deferred naming pass.
- The §17.1 surface is being built in slices. The foundation slice delivers the Engine wire
  protocol, the persistence model, the command and profile surface, and instance provisioning.
  The Cloud-orchestrated flows (simple backtest, simple optimisation and walk-forward analysis)
  are specified by the product glossary and by 002-040-040, and are the next slice; they are not
  part of the foundation slice.

Both will be private repositories, developed after the stable v1.0.0 kernel release.

---

*This document is the authoritative internal reference. Any architecture deviation must be approved by the Razor architecture board.*