---
id: product:razor/blueprint/product-model/communication-security
parent: product:razor/blueprint/product-model
title: 6. Communication & Security
level: product
kind: blueprint
---

# 6. Communication & Security

## 6.1 Engine–Cloud Channel
The Engine maintains a persistent, encrypted WebSocket connection to Razor Cloud. Because client servers may not have TLS certificates, a custom end‑to‑end encryption layer is used:

- Session establishment: ECDH key exchange authenticated with the instance API key.
- Data encryption: AES‑256‑GCM with per‑message authentication tags and sequence numbers to prevent replay attacks.
- All traffic is encrypted, including binary payloads (tick data, result files, logs).

## 6.2 Engine Binary Protection
The Razor Engine is the sole container of all trading logic and must be protected against reverse engineering, tampering, and cracking.

- **Obfuscation**: Symbol renaming, control flow obfuscation, string encryption. Integrated into the CI/CD pipeline.
- **Integrity verification**: The Cloud may issue periodic challenges requiring the engine to compute a hash of its in‑memory image. Mismatches lead to instance suspension.
- **Anti‑debugging**: Runtime checks for attached debuggers; engine refuses to start if a debugger is detected.
- **Extension signing**: In production mode, the engine rejects unsigned extension assemblies.

## 6.3 User Secrets
Broker API keys and other secrets are stored in Razor Cloud. The engine retrieves them over the encrypted channel when needed. A local encrypted secrets file may be used as a cache but is not the primary store.

## 6.4 Marketplace–Cloud Communication
Razor Marketplace and Razor Cloud communicate via secure internal APIs with mutual authentication (client credentials or shared secrets). User data is shared only to the extent necessary for licensing and extension delivery.

---
