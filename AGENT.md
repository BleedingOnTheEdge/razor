---
id: repo:razor/agent
scope: razor
level: repo
kind: agent
requires_org_docs: true
org_docs_fallback: notify
skill: docs
excluded_paths: [.git/, .opencode/, node_modules/, dist/, build/, .cache/, coverage/]
included_paths: []
---

# Razor — Agent Router

`README.md` is human-facing and is not normative for agents.

## Skill (MUST)
Invoke the `docs` skill before reading or writing any doc.
Modes: read, index, validate, extend, init, repair.

## Upward reading order (MUST)
1. This file
2. `docs/INDEX.md` — the product documentation index.
3. The relevant type index (`docs/002-blueprint/INDEX.md`, `docs/004-contracts/INDEX.md`, `docs/005-cross-cutting/INDEX.md`, `docs/006-operational/INDEX.md`).
4. The one section the task requires. Do not load a whole document.

No org-root anchor is reachable from this workspace, so `org_docs_fallback: notify` applies. See `NEED_CLEARIFICATION.md` NC-0002.

## Doc map
| Purpose | Path |
|---|---|
| Documentation index | docs/INDEX.md |
| Design, architecture, and roadmap | docs/002-blueprint/INDEX.md |
| Configuration and extension contracts | docs/004-contracts/INDEX.md |
| Cross-cutting rules and vocabulary | docs/005-cross-cutting/INDEX.md |
| Install and operate the engine | docs/006-operational/INDEX.md |
| Open documentation questions | NEED_CLEARIFICATION.md |

## Index protocol (MUST)
Build an index of doc **paths**, not contents. Load contents only when a task requires them.
Load only the section a task requires: each document is a directory whose `INDEX.md` lists its sections. See `rules/sectioning.md` in the `docs` skill.

## File-level docs (MUST)
When modifying any source file, check for `<filename>.md` in the same directory. No file-level docs exist in this repository yet.

## Excluded paths
Tool-generated, VCS, and build paths. Do not create docs inside them:
`.git/`, `.opencode/`, `node_modules/`, `dist/`, `build/`, `.cache/`, `coverage/`

## Directory map
| Path | Purpose | Rules |
|---|---|---|
| core/ | Razor engine .NET solution (`Razor.sln`): Kernel, Engine, Sdk, Shared, tests. | `README.md` is human-facing. No `AGENT.md` yet — see NC-0006. |
| frontends/ | pnpm workspace for Razor web clients (`apps/`, `packages/`). | `README.md` is human-facing. No `AGENT.md` yet — see NC-0006. |
| mobile/ | Placeholder for mobile clients; contains no source yet. | — |
| samples/ | Sample plugins (`Plugins/Adapters/MT5`), `Samples.sln`. | `README.md` is human-facing. No `AGENT.md` yet — see NC-0006. |
| docs/ | Product documentation tree. Every document is a directory of section files. | Indexed by `docs/INDEX.md`. |
