---
id: product:razor/contracts/extension-developer-guide/compatibility
parent: product:razor/contracts/extension-developer-guide
title: Compatibility
level: product
kind: contract
domains: [extensions]
flows: [extension-deployment]
keywords:
  - versioning
  - compatibility
  - sdkversion
  - semver
  - breaking changes
  - metatrader 5
  - platform notes
  - linux
references:
  - product:razor/contracts/extension-developer-guide/project-setup
---

# Compatibility

## Declaring Compatibility

Your extension assembly must include `[assembly: SdkVersion("1.0.0")]` (see `product:razor/contracts/extension-developer-guide/project-setup`). The engine's version manager checks this attribute.

- Extensions targeting an older major version may be loaded if backward-compatible.
- Extensions targeting a newer major version are rejected unless an explicit compatibility mode is configured.

## Breaking Changes

Razor follows SemVer. Minor releases add new hook points or interface members without breaking existing extensions. Major releases may break APIs, but older extensions can still run if they target an older SDK version (provided the engine supports that SDK major).

## Platform-Specific Notes

- **MetaTrader 5 Adapters:** MetaTrader 5 provides Windows-only DLLs, so an MT5 adapter cannot run on Linux servers. If you develop an adapter for MT5, document this restriction clearly.
- **Other Brokers:** Most modern APIs (REST + WebSocket) are cross-platform. Test your adapter on both Windows and Linux if you intend to support both.
