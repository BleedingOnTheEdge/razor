---
id: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin/the-ihookmanifest-interface
parent: product:razor/contracts/extension-developer-guide/developing-a-hook-plugin
title: 6.1 The `IHookManifest` Interface
level: product
kind: contract
---

# 6.1 The `IHookManifest` Interface

```csharp
public interface IHookManifest
{
    void RegisterHooks(IHookRegistry registry);
}
```

The engine calls `RegisterHooks` once at plugin load time, passing the root `IHookRegistry`.
