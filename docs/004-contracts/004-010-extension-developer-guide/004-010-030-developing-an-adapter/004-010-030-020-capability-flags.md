---
id: product:razor/contracts/extension-developer-guide/developing-an-adapter/capability-flags
parent: product:razor/contracts/extension-developer-guide/developing-an-adapter
title: 4.2 Capability Flags
level: product
kind: contract
---

# 4.2 Capability Flags

An adapter must declare which sub‑capabilities it supports. A data‑only adapter (no execution) sets:

```csharp
public bool SupportsHistoricalData => true;
public bool SupportsLiveData => true;
public bool SupportsExecution => false;
```

The engine queries these flags at startup and only invokes methods for supported capabilities. If an unsupported method is called, throw `NotSupportedException`.
