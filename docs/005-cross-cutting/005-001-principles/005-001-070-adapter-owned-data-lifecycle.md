---
id: product:razor/cross-cutting/principles/adapter-owned-data-lifecycle
parent: product:razor/cross-cutting/principles
title: 7. Adapter‑Owned Data Lifecycle
level: product
kind: cross-cutting
---

# 7. Adapter‑Owned Data Lifecycle
**The adapter creates binary data files; the adapter is responsible for deleting them – but only when Razor signals it is safe.**

- The `IAdapterCapability` interface exposes `NotifyFileSafeToDeleteAsync(string filePath)`. Razor calls this after it has finished reading the file (memory‑mapped view released).
- The adapter must not delete a file until it receives this notification.
- The `BorrowedTickData` disposable wrapper guarantees this call on disposal.
- File management is entirely the adapter's concern; Razor never touches the file system directly for data files.

---
