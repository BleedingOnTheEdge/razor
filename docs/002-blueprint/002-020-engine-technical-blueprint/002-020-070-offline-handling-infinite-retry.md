---
id: product:razor/blueprint/engine-technical-blueprint/offline-handling-infinite-retry
parent: product:razor/blueprint/engine-technical-blueprint
title: 8. Offline Handling & Infinite Retry
level: product
kind: blueprint
---

# 8. Offline Handling & Infinite Retry

## 8.1 Connection Monitoring

- Engine maintains persistent WebSocket.
- If connection drops, it attempts reconnection with exponential backoff (starting at 1s, doubling up to 60s, then stays at 60s).

## 8.2 No Grace Period – Infinite Retry

- The Engine **never** stops live tasks or exits due to Cloud unavailability.
- It retries indefinitely until the connection is restored.
- While offline:
  - All user commands continue running using the last known configuration.
  - Outgoing data is queued in memory and persisted to SQLite (`QueuedMessages` table).
  - The Engine does not accept new commands (they are queued by Cloud).

## 8.3 User Notification

- Cloud monitors Engine heartbeat. If offline > 5 minutes, sends alerts.
- Cloud dashboard shows "Offline" with last contact time.

---
