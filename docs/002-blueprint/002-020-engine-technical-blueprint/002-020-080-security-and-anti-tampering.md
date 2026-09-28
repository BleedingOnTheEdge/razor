---
id: product:razor/blueprint/engine-technical-blueprint/security-and-anti-tampering
parent: product:razor/blueprint/engine-technical-blueprint
title: Security and Anti-Tampering
level: product
kind: blueprint
domains: [security, engine]
keywords:
  - authentication
  - three factor
  - pbkdf2
  - ecdh
  - p-256
  - aes-256-gcm
  - sequence numbers
  - key rotation
  - obfuscation
  - anti-debugging
  - integrity verification
  - extension signing
references:
  - product:razor/blueprint/engine-technical-blueprint/communication-protocol
  - product:razor/blueprint/product-model/communication-security
code_paths:
  - core/src/Engine/Core/SecurityManager.cs
---

# Security and Anti-Tampering

The engine holds all trading logic, so it is defended at every layer. This is the technical detail;
the product-level statement of the same guarantees is in
`product:razor/blueprint/product-model/communication-security`.

## Authentication

- **Three-factor:** username, password, instance API key.
- Credentials are entered through the CLI on each start and **never stored on disk**.
- In memory they are encrypted with AES-GCM under a key derived with PBKDF2.

## Transport encryption

- **Key exchange:** ECDH over P-256.
- **Symmetric encryption:** AES-256-GCM.
- **Replay protection:** a sequence number on every message.
- **Key rotation:** session keys rotate every 24 hours, delivered through `HeartbeatResponse`.

## Binary protection

- **Obfuscation** - symbol renaming, control-flow obfuscation and string encryption, applied in the
  build pipeline.
- **Signing** - the binary is signed, and the Cloud verifies the signature on updates.
- **Anti-debugging** - the engine checks for an attached debugger and refuses to run if one is found.
- **Integrity** - the engine can be challenged to prove its in-memory image is unmodified; a mismatch
  leads to instance suspension.

## Extension security

- Extensions must be strong-named (signed) in production.
- Each loads into an isolated `AssemblyLoadContext`.
- The SDK version and capability requirements are validated before an assembly is loaded.
