---
id: product:razor/cross-cutting/principles/enforcement
parent: product:razor/cross-cutting/principles
title: 20. Enforcement
level: product
kind: cross-cutting
---

# 20. Enforcement
- Pull requests that contradict these principles are rejected.
- A static analysis step in CI verifies adherence (where automatable, e.g., no `DateTime.UtcNow` in `Kernel/Brokers`, no `if (assetClass...)` in core).
- The golden determinism test is a CI gate.
- Extension developers receive a separate SDK guide derived from this constitution, outlining the mandatory contracts they must honour.

---

*This document is living; it may be amended only with a formal review. Amendments must be backward‑compatible with existing adapters and strategies unless a major version increment occurs.*