---
id: product:razor/cross-cutting/principles/versioning-long-term-support
parent: product:razor/cross-cutting/principles
title: 17. Versioning & Long‑Term Support
level: product
kind: cross-cutting
---

# 17. Versioning & Long‑Term Support
**Each major release of Razor (1.x, 2.x, …) is an LTS release.**  
Breaking changes are reserved for major version boundaries; minor and patch releases must preserve determinism, adapter compatibility, and API stability within the same major version.

- **Major (X.0.0):** may introduce breaking changes to public APIs, extension contracts, or engine behaviour.
- **Minor (X.Y.0):** may add non‑breaking features, new hook points, new interface members, or new configuration options. Must not alter existing backtest determinism or break extension loading.
- **Patch (X.Y.Z):** reserved for critical bug fixes and security patches only.
- Any change that could alter the output of a golden‑test determinism scenario is a **breaking change** and requires a major version increment.

---
