---
id: product:razor/blueprint/internal-architecture/report-generation-engine-role
parent: product:razor/blueprint/internal-architecture
title: 14. Report Generation (Engine Role)
level: product
kind: blueprint
---

# 14. Report Generation (Engine Role)

The engine does **not** generate formatted reports (PDF, HTML, Excel, etc.). Report rendering is the responsibility of Razor Cloud. The engine's role is limited to:

1. Streaming raw `BacktestResult` and `Chromosome` data to the Cloud via events (`BacktestCompletedEvent`, `OptimizationGenerationEvent`, etc.).
2. Providing the `ReportGenerator` class, which exists solely to invoke the `report.before_generate` and `report.after_generate` hooks. These hooks allow plugins to capture or modify the raw data before it is sent to Cloud, or to perform custom logging.

**Summary:** The engine streams raw data; the Cloud renders reports.

---
