---
id: product:razor/blueprint/engine-technical-blueprint/schedules-cronjobs-virtual-timers
parent: product:razor/blueprint/engine-technical-blueprint
title: 7. Schedules & Cronjobs (Virtual Timers)
level: product
kind: blueprint
---

# 7. Schedules & Cronjobs (Virtual Timers)

## 7.1 Cronjobs

- Cloud sends `SetCronJob` with `JobId`, `CronExpression`, `Command`, `Enabled`.
- Engine stores in SQLite (`CronJobManager` in `Razor.Core.Engine.Management.Scheduling`).
- Uses `NCrontab` library to schedule.
- When triggered, executes the command asynchronously.

## 7.2 Schedules (One‑Off)

- Cloud sends `SetSchedule` with `ScheduleId`, `ScheduledTimeUtc`, `Command`, `Repeat`.
- Engine uses an in‑memory `Timer` for immediate scheduling.

---
