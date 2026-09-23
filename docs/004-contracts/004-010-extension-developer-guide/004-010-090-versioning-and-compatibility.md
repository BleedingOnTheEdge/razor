---
id: product:razor/contracts/extension-developer-guide/versioning-and-compatibility
parent: product:razor/contracts/extension-developer-guide
title: 10. Versioning and Compatibility
level: product
kind: contract
---

# 10. Versioning and Compatibility

## 10.1 Declaring Compatibility

Your extension assembly must include `[assembly: SdkVersion("1.0.0")]`. The engine's version manager checks this attribute.

- Extensions targeting an older major version may be loaded if backward‑compatible.
- Extensions targeting a newer major version are rejected unless an explicit compatibility mode is configured.

## 10.2 Breaking Changes

Razor follows SemVer. Minor releases add new hook points or interface members without breaking existing extensions. Major releases may break APIs, but older extensions can still run if they target an older SDK version (provided the engine supports that SDK major).

---
