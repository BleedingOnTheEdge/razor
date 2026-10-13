---
id: product:razor/blueprint/product-model/communication-security
parent: product:razor/blueprint/product-model
title: Communication and Security
level: product
kind: blueprint
domains: [security, engine, cloud]
keywords:
  - websocket
  - ecdh
  - aes-256-gcm
  - replay protection
  - obfuscation
  - integrity verification
  - anti-debugging
  - extension signing
  - secrets
  - marketplace internal api
references:
  - product:razor/blueprint/product-model/product-overview
  - product:razor/blueprint/engine-technical-blueprint
  - product:razor/blueprint/internal-architecture
code_paths:
  - core/src/Engine/Communication/**
  - core/src/Engine/Core/SecurityManager.cs
  - core/src/Engine/Core/Credentials.cs
---

# Communication and Security

The product-level statement of how the engine talks to the Cloud, and how the engine binary and user
secrets are protected. The protocol detail lives in
`product:razor/blueprint/engine-technical-blueprint`; this document states the intent and the
guarantees.

## The engine-cloud channel

The engine maintains a persistent, encrypted WebSocket connection to the Cloud. Because client
servers may not have TLS certificates, a custom end-to-end encryption layer is used instead:

- **Session establishment** - ECDH key exchange, authenticated with the instance API key.
- **Data encryption** - AES-256-GCM, with per-message authentication tags and sequence numbers to
  prevent replay.
- **Everything encrypted, including binary payloads** - tick data, result files, logs.

## Engine binary protection

The engine is the sole container of all trading logic, and is protected against reverse engineering,
tampering and cracking:

- **Obfuscation** - symbol renaming, control-flow obfuscation, string encryption, integrated into the
  CI/CD pipeline.
- **Integrity verification** - the Cloud may issue periodic challenges requiring the engine to hash
  its in-memory image; a mismatch leads to instance suspension.
- **Anti-debugging** - runtime checks for attached debuggers; the engine refuses to start if one is
  detected.
- **Extension signing** - in production mode the engine rejects unsigned extension assemblies.

## User secrets

Broker API keys and other secrets are stored in the Cloud and retrieved by the engine over the
encrypted channel when needed. A local encrypted secrets file may serve as a cache, but it is not the
primary store; the Cloud is.

## Marketplace-cloud communication

The Marketplace and the Cloud communicate over secure internal APIs with mutual authentication
(client credentials or shared secrets). User data is shared only as far as licensing and extension
delivery require.
