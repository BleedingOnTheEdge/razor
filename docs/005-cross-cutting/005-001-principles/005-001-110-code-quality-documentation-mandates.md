---
id: product:razor/cross-cutting/principles/code-quality-documentation-mandates
parent: product:razor/cross-cutting/principles
title: 11. Code Quality & Documentation Mandates
level: product
kind: cross-cutting
---

# 11. Code Quality & Documentation Mandates
**Code is the ultimate specification; it must be self‑documenting, strictly styled, and rigorously reviewed.**

- Every public and protected member must have XML documentation comments (enforced by `CS1591` as error).
- `.editorconfig` enforces consistent style; intentional suppressions (`#pragma warning disable`) must be scoped and justified in a comment.
- Suppressed warnings like `CA5394` (non‑secure Random) are allowed within the deterministic‑seeded GA context but must be accompanied by a `// Reason:` comment.
- All async methods that accept `CancellationToken` must forward it to all downstream operations.
- Dead code, unused variables, and obsolete patterns must be removed before release.

---
