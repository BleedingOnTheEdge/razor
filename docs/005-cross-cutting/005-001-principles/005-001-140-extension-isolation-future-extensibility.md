---
id: product:razor/cross-cutting/principles/extension-isolation-future-extensibility
parent: product:razor/cross-cutting/principles
title: 14. Extension Isolation & Future Extensibility
level: product
kind: cross-cutting
---

# 14. Extension Isolation & Future Extensibility
**Razor must load extension assemblies in isolated contexts to ensure stability and security.**

- Extension DLLs are loaded via a dedicated `AssemblyLoadContext` that resolves dependencies independently.
- Assemblies must be signed; unsigned extensions are rejected in production mode.
- The extension loading mechanism must discover adapters, strategies, indicators, hook plugins, and NN models by scanning designated directories and validating the declared SDK version before instantiation.
- This isolation prepares Razor for future versions where additional component types will also be loadable via the same versioned loading system.

---
