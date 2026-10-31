# Operational Runbook: Marketplace & Licensing

## 1. Service Overview
The Marketplace service enables discovery, review, and cryptographic entitlement licensing of third-party algorithmic trading strategies, indicators, and adapter slots.

- **Service Tier**: Tier 2
- **Host Runtime**: Next.js 15 Standalone / Node.js 22 LTS
- **SLO Target**: 99.0% availability over 30d rolling window
- **Key Subsystems**: Stripe / Web3 Payment Providers, Cloud License Authority, Community Forum

---

## 2. Health Checks & Diagnostics
- **Liveness Probe**: `GET /api/health`
- **License Verification Probe**: `GET /api/marketplace/acquisitions`
- **Database Connection**: Checks EF Core read-replica availability

---

## 3. Standard Operational Procedures

### A. Webhook Reconciliation & Payment Failures
1. **Symptom**: User completes payment but license token is not issued in `MyLicensesPage`.
2. **Investigation**:
   - Check webhook processing logs: `docker logs cloud-api | grep -i "webhook"`.
   - Inspect transaction status in payment provider dashboard against incoming `session_id`.
   - Query acquisitions table:
     ```sql
     SELECT * FROM "MarketplaceAcquisitions" WHERE "AccountId" = '<tenant_id>' ORDER BY "AcquiredAt" DESC LIMIT 5;
     ```
3. **Remediation**:
   - Resend failed webhook event from payment provider portal.
   - If signature verification failed, verify `PAYMENT_WEBHOOK_SECRET` in secure environment settings.
   - Manually grant license entitlement using Admin CLI:
     ```bash
     dotnet run --project core/src/Cloud -- admin grant-license --account-id <id> --item-id <id>
     ```

### B. License Verification & Revocation
1. For corrupted or compromised engine licenses:
   - Call `POST /api/engine/revoke` with instance key.
   - Force license refresh on running engine fleet.

---

## 4. Escalation Paths
- **Primary On-Call**: Marketplace & Billing Team
- **Secondary On-Call**: Security & Licensing Authority Team
- **Slack / Incident Channel**: `#ops-marketplace`
