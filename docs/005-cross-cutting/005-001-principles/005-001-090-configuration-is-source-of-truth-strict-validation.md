---
id: product:razor/cross-cutting/principles/configuration-is-source-of-truth-strict-validation
parent: product:razor/cross-cutting/principles
title: 9. Configuration is Source of Truth – Strict Validation
level: product
kind: cross-cutting
---

# 9. Configuration is Source of Truth – Strict Validation
**Every configuration object (specification record) must be the final, validated, immutable source of truth.**

- All specification records implement `Validate()` that throws `ConfigurationException` on invalid values.
- Configuration loaders must **not** silently default critical parameters (e.g., leverage, stop‑out level). Sensitive fields must be explicitly set by the user or omitted entirely (causing a validation error).
- Sensible defaults may exist only for non‑critical parameters (e.g., thread count, file retention policy) and must be clearly documented.
- Parsing of user input (e.g., timeframe strings) must use `TryParse` and provide clear error messages.
- Validation must be exhaustive: every field that affects trading behaviour is checked.

---
