---
id: product:razor/contracts/extension-developer-guide/platform-specific-notes
parent: product:razor/contracts/extension-developer-guide
title: 11. Platform‑Specific Notes
level: product
kind: contract
---

# 11. Platform‑Specific Notes

- **MetaTrader 5 Adapters:** MetaTrader 5 provides Windows‑only DLLs, so an MT5 adapter cannot run on Linux servers. If you develop an adapter for MT5, document this restriction clearly.
- **Other Brokers:** Most modern APIs (REST + WebSocket) are cross‑platform. Test your adapter on both Windows and Linux if you intend to support both.

---
