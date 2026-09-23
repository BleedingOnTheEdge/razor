---
id: product:razor/cross-cutting/principles/feature-based-versioning-future
parent: product:razor/cross-cutting/principles
title: 18. Feature‑Based Versioning (Future)
level: product
kind: cross-cutting
---

# 18. Feature‑Based Versioning (Future)
**When the extension system evolves, a feature‑based versioning system must be used to negotiate capabilities between the host and extensions.**  
This will be expressed via version attributes (e.g., `[RazorFeature("FeatureName", Version)]`) that allow the host to enable or restrict functionality based on extension compatibility. The design must ensure that older extensions remain loadable without recompilation when the host's major version advances, provided they declare their targeted SDK version and pass interface validation.

---
