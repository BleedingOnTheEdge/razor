---
id: product:razor/blueprint/engine-technical-blueprint/communication-protocol
parent: product:razor/blueprint/engine-technical-blueprint
title: 3. Communication Protocol
level: product
kind: blueprint
---

# 3. Communication Protocol

## 3.1 WebSocket Transport

- **Protocol:** Secure WebSocket (WSS) over TLS.
- **Endpoints:** Hardcoded in `AppConstants.cs`:
  - `PrimaryEndpoint = "wss://cloud.Razor.io/engine"`
  - `FallbackEndpoint = "wss://cloud.Razor-fallback.io/engine"`
- **Fallback Logic:** Engine always attempts primary first. If primary fails, switches to fallback. Once connected to fallback, periodically checks primary and switches back when available.

## 3.2 Message Envelope

All messages are JSON (except binary chunks). Envelope structure (`CloudMessage` in `Razor.Core.Engine.Communication`):

```json
{
  "MessageId": "uuid",
  "MessageType": "Command | Event | Heartbeat | Response | BinaryChunk | Auth",
  "Version": "1.0",
  "Encrypted": true,
  "Payload": { ... } | "base64..."
}
```

- `MessageId` – UUID for tracking and deduplication.
- `MessageType` – discriminator for handling.
- `Encrypted` – indicates if payload is encrypted (always true after handshake).
- `Payload` – either a JSON object or base64‑encoded binary data.

## 3.3 Authentication Handshake

1. Engine → Cloud: `Auth` with:
   - `Username`, `Password`, `InstanceApiKey`
   - `EngineVersion`, `ClientCapabilities` (list of supported feature IDs)
   - `PublicKey` (ECDH ephemeral public key)
2. Cloud validates credentials. If valid, returns `AuthResponse`:
   - `Status` – `Success` or `Failure`
   - `PublicKey` – Cloud's ephemeral public key
   - `Nonce` – for deriving session key
   - `SessionId` – for future reference
   - `RequiredCapabilities` – features the Engine must support
3. Engine derives shared secret from its private key and Cloud's public key.
4. Engine → Cloud: `AuthConfirm` with a signed challenge (HMAC of nonce with session key).
5. Cloud verifies and sends `AuthAck`.
6. From this point, all messages are encrypted with AES‑256‑GCM using the derived session key. Each message includes a sequence number to prevent replay.

## 3.4 Heartbeat & Time Sync

- Engine sends `Heartbeat` at intervals defined by Cloud in the previous `HeartbeatResponse`.
- Heartbeat payload includes:
  - `EngineId`
  - `LocalTimestamp` (Engine's current UTC time)
  - `Health` – CPU, memory, tasks running, live tick age, etc.
- Cloud responds with `HeartbeatResponse` containing:
  - `Status` – `OK`, `Stop`, `Pause`, `Lock`, `Exit`, `Ban`
  - `NextIntervalSeconds`
  - `ServerTime` – Cloud's current UTC time (for time sync)
  - `Commands` – list of commands to execute immediately (if any)
  - `AuthValid` – true/false (re‑validates credentials)
  - `AdminMessage` – optional broadcast message (with style hints)
  - **Self‑Update Metadata** – if a new Engine version is available, the response contains `NewVersion`, `DownloadUrl`, and `Checksum`.
- Engine updates its internal clock with `ServerTime` and adjusts drift.
- If `AuthValid` is false, Engine stops all user tasks (Live, Backtest, Optimisation) and prevents new user tasks until re‑authentication.

## 3.5 Command Execution

- Cloud sends a `Command` message with:
  - `CommandId` – numeric ID (from registry).
  - `CommandType` – string name (for readability).
  - `Parameters` – JSON object.
  - `TimeoutSeconds` – optional; if elapsed, Engine may cancel.
  - `CorrelationId` – to match responses.
- Engine executes the command and sends `CommandProgress` events (optional) and a final `CommandCompleted` event with result or error.
- Commands are executed asynchronously; concurrency is managed by the Task Manager.

## 3.6 Binary Transfers (Chunked over WebSocket)

All large data transfers (logs, optimisation results, raw tick data, behaviour logs, extension DLLs) use a chunked binary transfer over the **same WebSocket** to avoid opening extra ports or managing HTTP sessions.

**Protocol:**

1. **Sender** sends a `BinaryTransferStart` message (`BinaryTransferManager` in `Razor.Core.Engine.Communication`).
2. **Sender** then sends one or more `BinaryChunk` messages (base64‑encoded data).
3. **Sender** finalises with a `BinaryTransferEnd` message.
4. **Receiver** can send `BinaryTransferAck` to confirm receipt or request retransmission.
5. Checksum (SHA‑256) verification is performed on completion.

**Performance:** The same WebSocket is reused, reducing latency and overhead. For extremely large files (multi‑gigabyte tick data), the engine streams directly from disk without loading the entire file into memory.

---
