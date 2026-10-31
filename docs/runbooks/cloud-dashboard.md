# Operational Runbook: Cloud Dashboard

## 1. Service Overview
The Cloud Dashboard is a Next.js 15 enterprise web application providing quantitative research telemetry, live trading fleet orchestration, backtest inspection, and engine licensing management.

- **Service Tier**: Tier 1
- **Host Runtime**: Node.js 22 LTS / Containerized Docker multi-stage
- **SLO Target**: 99.5% availability, p95 SSR latency < 500ms
- **Dependencies**: Razor Cloud API (`http://localhost:5000` or production ingress), WebSocket telemetry stream (`/ws/telemetry`)

---

## 2. Health Checks & Diagnostics
- **Liveness Probe**: `GET /api/health` -> HTTP 200 `{"status": "ok"}`
- **Readiness Probe**: Verifies upstream Cloud API connectivity
- **Metrics Endpoint**: Next.js telemetry / Prometheus scrape endpoint

---

## 3. Standard Operational Procedures

### A. Deployment Verification
1. Inspect deployment rollout via `kubectl rollout status deployment/cloud-dashboard` or container logs.
2. Confirm static assets and `/panel` routing return HTTP 200 without hydration errors.
3. Verify JWT authentication cookie propagation.

### B. Incident Triage: Elevated Error Rates (5xx)
1. **Symptom**: SLO breach alert on `dashboard-availability`.
2. **Investigation**:
   - Check upstream Cloud API status: `curl -I http://cloud-api:5000/health`.
   - Inspect container logs for Next.js server crash loops: `docker logs --tail 200 cloud-dashboard`.
   - Verify environment variables `NEXT_PUBLIC_API_URL` and `INTERNAL_API_URL`.
3. **Remediation**:
   - If upstream API is degraded, engage Cloud API on-call engineer.
   - If dashboard build artifact is broken, trigger automatic rollback.

### C. Rollback Procedure
1. Revert to previous release image tag:
   ```bash
   kubectl rollout undo deployment/cloud-dashboard
   ```
2. Verify previous pod instances reach Ready state.

---

## 4. Escalation Paths
- **Primary On-Call**: Frontend Platform Team
- **Secondary On-Call**: Cloud Backend Infrastructure Team
- **Slack / Incident Channel**: `#ops-trading-cloud`
