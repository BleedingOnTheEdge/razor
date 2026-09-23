---
id: product:razor/operational/installation-and-deployment/logs-and-troubleshooting
parent: product:razor/operational/installation-and-deployment
title: 11. Logs and Troubleshooting
level: product
kind: operational
---

# 11. Logs and Troubleshooting

## 11.1 Log Files

Logs are written to the `logs/` directory with daily rotation:
```
logs/Razor-20260709.log
logs/Razor-20260708.log
...
```

Each log file is in JSON format (`CompactJsonFormatter`) and can be parsed by standard log aggregation tools.

## 11.2 Common Issues

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Engine exits immediately | Invalid `--auth` format or missing credentials | Verify the format or run interactively. |
| Engine cannot connect to Cloud | Firewall blocking outbound | Allow outbound TCP 443. |
| Engine shows "Invalid API key" | Key revoked or mistyped | Regenerate key in Cloud, update credentials. |
| Extensions not loaded | Missing `SdkVersion` attribute or mismatched version | Check assembly attributes. |
| Extension rejected – SDK major version mismatch | Extension compiled against a different SDK major | Recompile extension against the matching SDK. |
| MT5 adapter fails on Linux | MT5 is Windows‑only | Deploy engine on Windows. |
| High CPU on backtest | Normal (heavy workload) | Tune `MaxParallelThreads` in execution spec. |
| State database locked | Another engine instance running | Ensure only one instance runs. |
| Binary integrity check fails | Tampered binary or unsigned build | Download official build from Razor Cloud. |

## 11.3 Getting Support

Send the relevant log excerpts to Razor support through the Cloud dashboard. Do not share your credentials.

---
