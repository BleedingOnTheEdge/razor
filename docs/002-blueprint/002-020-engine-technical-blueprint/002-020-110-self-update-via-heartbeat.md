---
id: product:razor/blueprint/engine-technical-blueprint/self-update-via-heartbeat
parent: product:razor/blueprint/engine-technical-blueprint
title: 12. Self‑Update (Via Heartbeat)
level: product
kind: blueprint
---

# 12. Self‑Update (Via Heartbeat)

## 12.1 Process

1. Cloud includes `NewVersion`, `DownloadUrl`, and `Checksum` in the `HeartbeatResponse`.
2. Engine detects that a new version is available.
3. Engine downloads the new binary to a temporary location.
4. Engine verifies the SHA‑256 checksum.
5. **Compatibility Check:** Engine checks that all currently loaded extensions' required capabilities are supported by the new Engine's capability set.
6. If compatible, Engine stages the new binary (moves it to `update/` directory).
7. Engine writes a pending marker (`update.pending`) with version and backup path.
8. Engine launches the new binary with `--command=restart` and exits.
9. The new binary, upon seeing `--command=restart`, finalises the replacement (replaces the original executable) and resumes normal operation.

## 12.2 Rollback

- Old executable kept as backup in `backup/`.
- If new version fails to start, automatic rollback attempted (via `RollbackAsync`).

---
