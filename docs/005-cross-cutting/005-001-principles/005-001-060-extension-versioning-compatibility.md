---
id: product:razor/cross-cutting/principles/extension-versioning-compatibility
parent: product:razor/cross-cutting/principles
title: 6. Extension Versioning & Compatibility
level: product
kind: cross-cutting
---

# 6. Extension Versioning & Compatibility
**All extension assemblies must carry explicit version information that Razor validates before loading.**

- Every extension assembly must declare the version of the Razor SDK it targets (e.g., `SdkVersion("1.0.0")`) and optionally its own release version for diagnostics.
- A version manager in Razor must inspect the declared version and check compatibility:
  - Extensions written for an older major version may be loaded if backward compatibility is guaranteed and they pass an interface validation.
  - Extensions targeting a newer major version are rejected unless an explicit compatibility mode is configured.
- The SDK (contracts assembly) itself is versioned strictly; breaking changes require a major version bump.
- Future feature‑based versioning will be expressed through dedicated version attributes, allowing the host to negotiate features without breaking older extensions.

---
