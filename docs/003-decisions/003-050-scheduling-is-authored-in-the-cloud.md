---
id: product:razor/decisions/scheduling-is-authored-in-the-cloud
parent: product:razor/decisions
title: Scheduling Is Authored in the Cloud and Executed by the Engine
level: product
kind: decision
domains: [cloud, engine, operations]
flows: [optimisation-run, live-trading-session, engine-update]
keywords:
  - scheduling
  - cron
  - cronjobs
  - virtual timers
  - schedules
  - who decides when
references:
  - product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs
  - product:razor/blueprint/internal-architecture/cloud-control-plane
  - product:razor/blueprint/product-model/control-monitoring
  - product:razor/blueprint/product-model/product-overview
  - product:razor/blueprint/engine-technical-blueprint/command-system
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
  - product:razor/blueprint/product-model/appendix-a-supported-commands
---

# Scheduling Is Authored in the Cloud and Executed by the Engine

## Context

Continuous optimisation, periodic reporting and recurring maintenance all need a timer somewhere. The
engine is headless and stateless, and the Cloud already holds every configuration, so the question is
which side owns the *decision* of what runs and when.

## Decision

**Scheduling is both.** The Cloud authors the timings and the cron configurations; the Engine executes
them. The engine's timers are mechanical holders of the Cloud's schedule, never decision-makers.

**Status: live ruling.**

## Consequences

- The Cloud sends `SetCronJob` with `JobId`, `CronExpression`, `Command` and `Enabled`, and the engine
  persists the job and schedules it with `NCrontab`; when it fires, the stored command is dispatched as
  though it had arrived over the wire
  (`product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs`).
- One-off `SetSchedule` timers are in-memory only, so on restart a cronjob survives and a one-off schedule
  does not - it is the Cloud's to re-establish
  (`product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs`).
- `CronJobs` and `Schedules` are two of the narrow set of tables the engine persists
  (`product:razor/blueprint/engine-technical-blueprint/state-persistence`).
- The command registry owns the surface: the schedules and cron band holds `SetCronJob`, `DeleteCronJob`,
  `ListCronJobs`, `SetSchedule`, `DeleteSchedule` and `ListSchedules`
  (`product:razor/blueprint/engine-technical-blueprint/command-system`,
  `product:razor/blueprint/product-model/appendix-a-supported-commands`).
- The Cloud holds all scheduling logic - continuous optimisation runs are triggered from user-defined
  calendars, and the engine keeps no operational timers of its own
  (`product:razor/blueprint/product-model/product-overview`).
- Instance and profile lifecycle actions are similarly Cloud-driven: provisioning, licence and extension
  deployment are Cloud surfaces
  (`product:razor/blueprint/internal-architecture/cloud-control-plane`).

## Reasoning the Documents Give

- `product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs` gives the reason in one
  line: "The Cloud decides *what* runs and *when*; the engine only holds the schedule and fires it.
  Scheduling logic itself lives in the Cloud ... so these timers are mechanical rather than
  decision-making - hence 'virtual'."
- `product:razor/blueprint/product-model/product-overview` gives the product reason: because the engine is
  stateless and holds no operational timers, all scheduling lives in the Cloud, which is where the user's
  calendar lives too.

## Alternatives Considered

Not recorded. No document considers an engine-owned scheduler, and no document weighs the two
responsibilities against each other.

**Nuance worth noting.** `product:razor/blueprint/product-model/product-overview` states "the engine keeps
no operational timers", while `product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs`
specifies persistent cronjobs and in-memory one-off schedules in the engine. The two are reconciled by
`product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs`: the timers the engine holds
are virtual - mechanical executions of the Cloud's decisions - not operational scheduling logic. This
reading is derived, not stated; the two documents do not cross-reference each other.
