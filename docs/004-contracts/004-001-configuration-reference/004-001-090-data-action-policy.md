---
id: product:razor/contracts/configuration-reference/data-action-policy
parent: product:razor/contracts/configuration-reference
title: 9. Data Action Policy
level: product
kind: contract
---

# 9. Data Action Policy

**Type:** `DataActionPolicy` (enum)  
**Namespace:** `Razor.Core.Sdk.Shared`

| Value | Meaning |
|-------|---------|
| `KeepUntilExit` | File stays until engine process ends. |
| `DeleteAfterTask` | Deleted immediately after backtest/optimisation completes. |
| `PersistentCache` | Kept for future reuse. Adapter manages cleanup. |

---
