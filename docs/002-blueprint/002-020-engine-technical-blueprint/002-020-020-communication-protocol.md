---
id: product:razor/blueprint/engine-technical-blueprint/communication-protocol
parent: product:razor/blueprint/engine-technical-blueprint
title: Communication Protocol
level: product
kind: blueprint
domains: [engine, cloud, security]
keywords:
  - websocket
  - wss
  - message envelope
  - cloudmessage
  - handshake
  - authconfirm
  - heartbeat
  - time sync
  - command execution
  - binary transfer
  - capability negotiation
  - broadcast message
  - fallback endpoint
references:
  - product:razor/blueprint/engine-technical-blueprint/cli-and-startup
  - product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering
  - product:razor/blueprint/product-model/licensing-subscriptions
code_paths:
  - core/src/Engine/Communication/**
---

# Communication Protocol

The engine's contract with the Cloud. This is the wire specification; the message flow of a working
session is the sum of the parts below.

## 1 Transport

- **Protocol:** secure WebSocket (WSS) over TLS.
- **Endpoints**, hardcoded in `AppConstants`:
  - `PrimaryEndpoint = "wss://cloud.Razor.io/engine"`
  - `FallbackEndpoint = "wss://cloud.Razor-fallback.io/engine"`
- **Fallback logic:** the primary is always attempted first. If it fails the engine switches to the
  fallback, and once on the fallback it periodically probes the primary and switches back when it
  returns.

## 2 Message envelope

All messages are JSON except binary chunks. The envelope is `CloudMessage`:

```json
{
  "MessageId": "uuid",
  "MessageType": "Command | Event | Heartbeat | Response | BinaryChunk | Auth",
  "Version": "1.0",
  "Encrypted": true,
  "Payload": { }
}
```

- `MessageId` - UUID used for tracking and deduplication.
- `MessageType` - the discriminator.
- `Encrypted` - whether the payload is encrypted; always true after the handshake.
- `Payload` - a JSON object, or base64-encoded binary data.

## 3 Authentication handshake

1. Engine sends `Auth` with `Username`, `Password`, `InstanceApiKey`, `EngineVersion`,
   `ClientCapabilities` (the feature IDs it supports) and `PublicKey` (an ephemeral ECDH key).
2. The Cloud validates the credentials and replies `AuthResponse` with `Status` (`Success` or
   `Failure`), `PublicKey` (the Cloud's ephemeral key), `Nonce`, `SessionId` and
   `RequiredCapabilities`.
3. The engine derives the shared secret from its private key and the Cloud's public key.
4. Engine sends `AuthConfirm` carrying a signed challenge - an HMAC of the nonce under the session
   key.
5. The Cloud verifies and sends `AuthAck`.
6. From here every message is encrypted with AES-256-GCM using the derived session key, and carries a
   sequence number to prevent replay.

**Capability negotiation** is part of this handshake, not a separate exchange: the engine declares
what it supports in `Auth`, and the Cloud validates that against what the licence and the deployment
require, rejecting an engine that lacks a required feature. The feature ID registry is the one in
`product:razor/blueprint/product-model/licensing-subscriptions`.

## 4 Heartbeat and time sync

- The engine sends `Heartbeat` at the interval the Cloud last specified in `HeartbeatResponse`.
- Heartbeat payload carries `EngineId`, `LocalTimestamp` and `Health` - CPU, memory, tasks running,
  live tick age.
- The Cloud replies `HeartbeatResponse` with:
  - `Status` - `OK`, `Stop`, `Pause`, `Lock`, `Exit` or `Ban`;
  - `NextIntervalSeconds`;
  - `ServerTime` - the Cloud's UTC time, for drift correction;
  - `Commands` - commands to execute immediately, if any;
  - `AuthValid` - re-validates the credentials;
  - `AdminMessage` - an optional broadcast, with style hints;
  - **self-update metadata** - `NewVersion`, `DownloadUrl` and `Checksum` when a new engine version is
    available.
- The engine corrects its internal clock against `ServerTime`.
- If `AuthValid` is false the engine stops all user tasks - live, backtest and optimisation - and
  refuses new ones until re-authentication succeeds.

## 5 Command execution

- The Cloud sends `Command` with `CommandId` (the numeric registry ID), `CommandType` (the name, for
  readability), `Parameters`, optional `TimeoutSeconds`, and `CorrelationId` to match the response.
- The engine executes it and returns optional `CommandProgress` events followed by a final
  `CommandCompleted` carrying the result or the error.
- Commands execute asynchronously; concurrency is managed by the task manager (see
  `concurrency-and-task-management`).

## 6 Binary transfers

Every large transfer - logs, optimisation results, raw tick data, behaviour logs, extension DLLs -
uses chunked transfer over the **same WebSocket**, so no extra ports or HTTP sessions are needed.

1. The sender sends `BinaryTransferStart`.
2. It then sends one or more `BinaryChunk` messages (base64-encoded).
3. It finalises with `BinaryTransferEnd`.
4. The receiver may answer `BinaryTransferAck` to confirm receipt or request retransmission.
5. A SHA-256 checksum is verified on completion.

Reusing the socket keeps latency and overhead low, and for very large files - multi-gigabyte tick
data - the engine streams directly from disk rather than loading the file into memory.

## 7 Admin broadcast

The Cloud may send `BroadcastMessage` with `Text` and `Style` (`info`, `warning`, `error` or
`success`). The engine displays it on the console with the matching styling. Display is
presentational only: a broadcast that cannot be styled - because the process has no console - must
still be printed, never dropped.
