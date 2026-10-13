---
id: product:razor/blueprint/engine-technical-blueprint/schedules-and-cronjobs
parent: product:razor/blueprint/engine-technical-blueprint
title: Schedules and Cronjobs
level: product
kind: blueprint
domains: [engine, cloud]
keywords:
  - schedules
  - cronjobs
  - virtual timers
  - ncrontab
  - scheduled commands
  - one-off schedule
references:
  - product:razor/blueprint/product-model/control-monitoring
  - product:razor/blueprint/engine-technical-blueprint/state-persistence
code_paths:
  - core/src/Engine/Management/Scheduling/**
---

# Schedules and Cronjobs

The engine's timers exist to execute commands the Cloud has scheduled. The Cloud decides *what* runs
and *when*; the engine only holds the schedule and fires it. Scheduling logic itself lives in the
Cloud (see `product:razor/blueprint/product-model/control-monitoring`), so these timers are
mechanical rather than decision-making - hence "virtual".

## Cronjobs

- The Cloud sends `SetCronJob` carrying `JobId`, `CronExpression`, `Command` and `Enabled`.
- The engine persists the job in SQLite through `CronJobManager`, and schedules it with the
  `NCrontab` library.
- When the expression fires, the stored command is dispatched asynchronously, exactly as if it had
  arrived over the wire.

## Schedules (one-off)

- The Cloud sends `SetSchedule` carrying `ScheduleId`, `ScheduledTimeUtc`, `Command` and `Repeat`.
- The engine holds an **in-memory** timer for immediate scheduling.

The distinction matters on restart: cronjobs survive because they are persisted, whereas a one-off
schedule is in-memory only and is the Cloud's to re-establish.
