---
id: product:razor/cross-cutting/principles/future-proofing-net-version
parent: product:razor/cross-cutting/principles
title: 16. Future‑Proofing & .NET Version
level: product
kind: cross-cutting
---

# 16. Future‑Proofing & .NET Version
**Razor must always target the latest stable major version of .NET available at the time of its own major release.**  
For the current LTS release, that is .NET 10 (as defined in the repository's `global.json` and project files); future LTS releases will adopt the latest stable major version available.

- All NuGet dependencies must be updated to their latest **stable** (non‑preview) releases. Security patches and bug‑fix updates are applied promptly, independent of the Razor release cycle.
- New C# features (e.g., `params ReadOnlySpan<T>`, improved pattern matching, `field` keyword) may be adopted when they improve clarity or performance.
- Reflection is permitted for extension loading and gene injection, as AOT compilation is incompatible with dynamic assembly loading.
- The architecture must remain cleanly layered so that future runtime upgrades require minimal code changes.

---
