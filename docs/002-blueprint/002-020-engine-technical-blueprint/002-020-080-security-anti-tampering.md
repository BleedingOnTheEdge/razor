---
id: product:razor/blueprint/engine-technical-blueprint/security-anti-tampering
parent: product:razor/blueprint/engine-technical-blueprint
title: 9. Security & Anti‑Tampering
level: product
kind: blueprint
---

# 9. Security & Anti‑Tampering

## 9.1 Authentication

- Three‑factor: Username + Password + Instance API Key.
- Credentials entered via CLI on each start; **never stored on disk**.
- Encrypted in memory using AES‑GCM with a key derived from PBKDF2 (`SecurityManager`).

## 9.2 Encryption (Transport)

- ECDH (P‑256) for key exchange.
- AES‑256‑GCM for symmetric encryption.
- Sequence numbers to prevent replay.
- Session keys rotated every 24 hours (via `HeartbeatResponse`).

## 9.3 Binary Protection

- Obfuscation (symbol renaming, control flow, string encryption).
- Signed with private key; Cloud verifies signature on updates.
- Anti‑debugging checks (`SecurityManager.IsDebuggerAttached()`).
- Integrity checks (`SecurityManager.VerifyIntegrity()`).

## 9.4 Extension Security

- All extensions must be strong‑named (signed) in production.
- Loaded in isolated `AssemblyLoadContext`s.
- SDK version and capability requirements validated before loading.

---
