---
id: product:razor/operational/installation-and-deployment/security-considerations
parent: product:razor/operational/installation-and-deployment
title: 10. Security Considerations
level: product
kind: operational
---

# 10. Security Considerations

## 10.1 Protect Your Credentials

- Never share your Instance API Key.
- Use the interactive prompt or environment variable for authentication in production; avoid `--auth` where command‑line visibility is a concern.
- Credentials are held only in memory and are never persisted to disk.

## 10.2 Secrets Management

Broker API keys and other secrets are stored in Razor Cloud, not on the engine. The engine fetches them securely over the encrypted channel. A local encrypted secrets file may be used as a cache but is not the primary store.

---
