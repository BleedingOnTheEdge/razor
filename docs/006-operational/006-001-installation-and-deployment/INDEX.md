---
id: product:razor/operational/installation-and-deployment
title: Razor Installation & Deployment Guide
level: product
kind: operational
domains: [operations, cloud, security, extensions, engine]
flows: [onboarding, engine-update, extension-deployment, live-trading-session]
keywords:
  - installation
  - deployment
  - engine setup
  - onboarding
  - engine update
  - uninstall
  - troubleshooting
references:
  - product:razor/blueprint/engine-technical-blueprint
  - product:razor/contracts/extension-developer-guide
---

# Razor Installation & Deployment Guide — Index

Install, connect, verify, update, and troubleshoot the Razor Engine on Windows and Linux. This
section is the operator-facing counterpart to the engine contract in
`product:razor/blueprint/engine-technical-blueprint`: it gives procedures, not specifications.

| ID | Purpose | Domains | Flows | Code |
|---|---|---|---|---|
| product:razor/operational/installation-and-deployment/introduction | Scope, audience, prerequisites, and where to find related documentation. | operations | onboarding | |
| product:razor/operational/installation-and-deployment/system-requirements | Minimum and recommended hardware, supported operating systems, and the .NET runtime. | operations | onboarding | |
| product:razor/operational/installation-and-deployment/getting-your-engine-binary | Downloading the engine archive and what it contains. | operations, cloud | onboarding | |
| product:razor/operational/installation-and-deployment/installation | Extract the archive, place extensions, and obtain an instance API key. | operations, cloud | onboarding | |
| product:razor/operational/installation-and-deployment/authentication-and-startup | Authenticate, run as a service, and the command-line flags. | operations, cloud, security | onboarding | |
| product:razor/operational/installation-and-deployment/network-requirements | Outbound connectivity, firewall ports, and proxy support. | operations, cloud | onboarding | |
| product:razor/operational/installation-and-deployment/verifying-the-installation | Startup log, Cloud online status, and a test backtest. | operations, cloud, live-trading | onboarding, backtest-run | |
| product:razor/operational/installation-and-deployment/extension-management | Placing extension DLLs and how hot-reload works. | extensions, operations | extension-deployment | |
| product:razor/operational/installation-and-deployment/updating-and-uninstalling-the-engine | Remote and manual update, and removing an installed engine. | operations, engine | engine-update | |
| product:razor/operational/installation-and-deployment/security-considerations | Protecting credentials and where secrets are stored. | security, operations | onboarding | |
| product:razor/operational/installation-and-deployment/logs-and-troubleshooting | Log location and format, common failures and fixes, and support. | operations | onboarding, live-trading-session | |
