---
title: "Dev Tooling, CRLF, and Configuration Foundations"
author: "sinavali"
created_date: "2026-10-31"
target_branch: "fix/tooling-crlf-and-config"
risk_level: "LOW"
affected_projects:
  - "core"
  - "samples"
  - "frontends"
  - "scripts"
---

# Change Surface: Dev Tooling, CRLF, and Configuration Foundations

## 1. Intent & Business Rationale
Resolve fundamental developer tooling, execution environment, and configuration issues:
- Fix Linux execution failure caused by CRLF line endings on executable scripts in `scripts/bin/*` and `scripts/*.mjs` (Issue #87).
- Enforce `eol=lf` in `.gitattributes` for shell scripts, Node scripts, and CLI wrappers.
- Remove invalid duplicate XML attributes and insecure HTTP protocol flags from `nuget.config` files (Issue #88).
- Add central `core/VERSION.txt` initialized to `1.0.0` for SemVer resolution in MSBuild (Issue #89).
- Replace all legacy "Chronos" references with "Razor" across samples, adapters, build props, and readmes, and remove redundant C# `.editorconfig` from `frontends/` (Issue #90).
- Replace unjustified `<Pending>` Code Analysis suppression in `GlobalSuppressions.cs` with valid technical rationale (Issue #91).

## 2. Affected Monorepo Projects
- `core`
- `samples`
- `frontends`
- `scripts`

## 3. Code Surface
### Modified Files
- `.gitattributes`
- `core/VERSION.txt`
- `core/nuget.config`
- `core/src/Engine/GlobalSuppressions.cs`
- `frontends/.editorconfig`
- `frontends/README.md`
- `nuget.config`
- `samples/.editorconfig`
- `samples/Directory.Build.props`
- `samples/Plugins/Adapters/MT5/Mql5BridgeEA.mq5`
- `samples/Plugins/Adapters/MT5/Mt5Adapter.cs`
- `samples/Plugins/Adapters/MT5/README.md`
- `samples/Plugins/Adapters/MT5/winsock.mqh`
- `samples/Plugins/Adapters/Nobitex/NobitexAdapter.cs`
- `samples/Plugins/Strategies/CfdSmtDivergence/CfdSmtDivergenceStrategy.cs`
- `samples/README.md`
- `samples/nuget.config`
- `scripts/bin/audit-runner`
- `scripts/bin/check-nc-items`
- `scripts/bin/engine`
- `scripts/bin/ep`
- `scripts/bin/validate-change-surface`
- `scripts/bin/verify-agent-manifests`
- `scripts/bin/verify-nx-targets`
- `scripts/build-engine.mjs`
- `scripts/dev-all.mjs`
- `scripts/run-engine.mjs`
- `scripts/test-all.mjs`

## 4. Test Surface
### Unit & Integration Suites
- `core/tests/Engine.UnitTests`
- `scripts/bin/ep preflight`

## 5. Invariants
- Execution scripts on Linux must have valid LF line endings and executable permissions.
- NuGet package configurations must enforce TLS 1.2+ HTTPS without insecure downgrade flags.
- Branding must be strictly unified under Razor.

## 6. Risk Matrix
- Rollback: Revert commits via standard git rollback.
- Blast radius bounded strictly to declared Code Surface.
