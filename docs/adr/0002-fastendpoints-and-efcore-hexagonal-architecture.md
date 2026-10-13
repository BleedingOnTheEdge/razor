---
id: "ADR-0002"
title: "FastEndpoints and EF Core Hexagonal Architecture with Pure Domain Isolation"
status: "Accepted"
date: "2026-10-13"
deciders:
  - "Razor Enterprise Architecture Team"
  - "Antigravity OS Orchestrator"
affected_projects:
  - "core/src/Cloud"
  - "core/src/Engine"
  - "core/src/Kernel"
tier_override: false
---

# ADR-0002: FastEndpoints and EF Core Hexagonal Architecture with Pure Domain Isolation

## 1. Context and Problem Statement
The backend services require high-throughput HTTP/REST APIs, real-time WebSocket communication, and robust relational persistence for instance management, backtesting runs, and licensing. Coupling web routing and ORMs directly to domain execution introduces architectural rot and prevents independent testing.

## 2. Decision Drivers
- Strict conformance to Architectural Profile A (DDD + Hexagonal Ports & Adapters).
- Zero framework and ORM leakage into pure core domain entities (`Kernel`, `Shared`).
- High-throughput endpoint handling with FastEndpoints.
- Reliable relational persistence via Entity Framework Core with PostgreSQL.

## 3. Considered Options
- **Option 1: Hexagonal Ports & Adapters with FastEndpoints and EF Core**: Clean domain separation; EF Core and HTTP transport encapsulated in adapters.
- **Option 2: Minimal APIs with tightly coupled DbContext in endpoints**: Simple for prototypes, but violates Profile A layer boundaries and introduces untestable dependencies.
- **Option 3: Full Clean Architecture with MediatR CQRS**: Over-engineered for FastEndpoints, adding indirection without tangible domain benefits.

## 4. Decision Outcome
**Chosen Option**: Option 1. Domain logic resides purely in domain aggregates with zero web or EF dependencies. Cloud endpoints consume services through ports, and EF Core models isolate database schema details behind repository/service boundaries.

## 5. Consequences
### Positive Consequences
- Pure domain logic is 100% testable in-memory without database or web servers.
- FastEndpoints provides declarative request binding, validation, and typed OpenAPI generation.
- Database access is isolated and easily migrated.

### Negative Consequences / Trade-Offs
- Requires mapping between domain models and persistence DTOs/entities where schemas diverge.

## 6. Compliance & Verification Strategy
- **Automated Verification**: `scripts/audit-runner.py` enforces RULE-2.1-ORM-IN-DOMAIN preventing ORM imports in domain layers.
- **Test Implementation**: Domain unit tests run isolated; integration tests run against real PostgreSQL containers.
