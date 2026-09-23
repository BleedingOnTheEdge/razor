---
id: product:razor/blueprint/engine-technical-blueprint/error-handling-recovery
parent: product:razor/blueprint/engine-technical-blueprint
title: 14. Error Handling & Recovery
level: product
kind: blueprint
---

# 14. Error Handling & Recovery

## 14.1 Global Exception Handler

- Catch unhandled exceptions, log, attempt graceful shutdown.
- Send final status to Cloud before exit.

## 14.2 Task‑Level Error Handling

- Each task has try‑catch; on fault, task marked `Faulted`; Engine notifies Cloud.
- Live task: if faulted, Engine attempts restart (if configured) or stops.

## 14.3 Adapter Failures

- Log, try reconnect.
- If unreachable, Live task stopped.

## 14.4 Kill‑Switch

- `KillSwitch` command: closes all positions, stops all tasks, sends final status, exits.

---
