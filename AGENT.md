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

## Product — Definition

A **Product** is the top-level unit of intent that a documentation system describes and an agent must not drift from. It is an organisation or directory (or org-root) that contains one or more codebases, domains, or repos, and that exists to deliver a coherent set of capabilities to defined users.

The Product here is **Razor**. Its defined users, in priority order, are **Traders** (the primary end users), **Developers** (building hooks, slots and extensions on the ecosystem), and the **Owner / shareholders / potential investors**. See the `Product` entry in the glossary.

## Skill (MUST)
Invoke the `docs` skill before reading or writing any doc.
Modes: read, index, validate, extend, init, repair.

## Upward reading order (MUST)
1. This file
2. `docs/INDEX.md` — the documentation map: which domains and flows exist and what each flow spans.
3. The relevant domain index (`docs/002-blueprint/INDEX.md`, `docs/004-contracts/INDEX.md`, `docs/005-cross-cutting/INDEX.md`, `docs/006-operational/INDEX.md`).
4. The one section the task requires. Do not load a whole document.

An organisation-level anchor exists one directory up, at `../AGENTS.md` in the `org-root` repository, alongside `CONTRIBUTING_AGENTS.md`. It carries no docs-graph frontmatter, so the `docs/` tree here is Razor's authoritative documentation graph.

## Doc map
| Purpose | Path |
|---|---|
| Documentation map (domains, flows, participation) | docs/INDEX.md |
| Design, architecture, and roadmap | docs/002-blueprint/INDEX.md |
| Configuration and extension contracts | docs/004-contracts/INDEX.md |
| Cross-cutting rules and vocabulary | docs/005-cross-cutting/INDEX.md |
| Install and operate the engine | docs/006-operational/INDEX.md |
| Open documentation questions | NEED_CLEARIFICATION.md |

## Agents and skills
| Purpose | Invocation |
|---|---|
| Loop operating procedure | skill `product-loop` |
| Gap analysis, triage, delegation, merge decision | agent `orchestrator` |
| Implement one issue on one branch | agent `coder` |
| Multi-aspect review of a PR | agent `reviewer` |

## Operating constraints (MUST)
- **Scope of work is `core/` only.** Do not build UI or mobile. `samples/` is deferred by decision.
- **Stack:** FastEndpoints on ASP.NET, PostgreSQL for storage, with **EF Core** for data access and schema migrations. **Not in v1.0.0: no Docker, no Redis.** Keep cache logic behind an interface so Redis can be swapped in later without redesign. (A v1 scope constraint, not a permanent prohibition — the roadmap plans a Docker host, Docker Swarm/Kubernetes and a Redis message bus for a later release; see the infrastructure section of `product:razor/blueprint/future-features/catalog`.)
- The **Cloud** backend project is named exactly **`Cloud`** in the solution — not `Razor.Cloud`, and not `Panel`. It is the backend the frontend will consume, and it is built last (see the Active directive in the `product-loop` skill).
- Development runs as a **continuous loop**: follow the `product-loop` skill.
- **Merge into `main` only** (protected, PRs only). **Never merge to `prod`** — that branch is human-only. Delete the source branch after merge and resynchronise checkouts.

## Continuous integration and coverage (MUST)
- Workflows live in **`.github/workflows/` at the repository root** — GitHub reads no other location. Before issue #2 they sat in `core/.github/workflows/`, which is why no pull request in this repository ever had a check run.
- The .NET steps run from `core/` (`working-directory: core` in the workflow): that is the working directory the quality gates in `CONTRIBUTING_AGENTS.md` are written for, and the one that makes the single SDK pin at `razor/global.json` resolve — see issue #11. Running `dotnet` against an absolute path from outside `core/` bypasses that pin and picks up whatever SDK the machine has installed.
- `build.yml` runs, in order and from `core/`: `dotnet restore Razor.sln`, `dotnet build Razor.sln -c Release --no-incremental`, `dotnet test Razor.sln -c Release --no-build --collect:"XPlat Code Coverage" --settings coverlet.runsettings --results-directory TestResults`, then `dotnet format --verify-no-changes`.
- **`--settings coverlet.runsettings` is not optional.** Without it coverlet ignores the generated-source exclusions, instruments generated code at 0% and fails the gate on a measurement artifact rather than a real shortfall. The runsettings file also cannot contain a `--` sequence inside an XML comment: that silently stops coverlet producing any report at all.
- **Coverage command.** Coverlet writes one Cobertura report per test project; they overlap, so the gate merges them before measuring. The same two commands run locally — CI adds `--no-build` because `build.yml` builds immediately before testing:

  ```bash
  cd core
  dotnet test Razor.sln -c Release --collect:"XPlat Code Coverage" --settings coverlet.runsettings --results-directory TestResults
  cd ..
  python3 .github/scripts/coverage_gate.py --results-dir core/TestResults --min-line 95 --min-branch 95 --declared-scope Sdk Shared Cloud
  ```

  It prints a per-project and merged table, writes `coverage-merged.cobertura.xml` and `coverage-summary.md` under `core/TestResults/`, publishes them as the `coverage` artifact, and exits non-zero when either rate is below its floor.
- **Threshold.** The agreed gate is line AND branch >= 95% (`CONTRIBUTING_AGENTS.md`, Definition of Done item 4), and `build.yml` enforces exactly that on the **declared scope `Sdk Shared Cloud`**. Everything instrumented is merged, measured and printed, but the floors apply only to the declared assemblies, and out-of-scope assemblies are named in the summary; a second, non-gating step reports whole-solution coverage. Coverlet only instruments assemblies a test project loads, so **`Kernel` and `Engine` are currently outside the declared scope** — they have no test project of their own. **Issue #4 adds both.**

## Index protocol (MUST)
Build an index of doc **paths**, not contents. Load contents only when a task requires them.
Load only the section a task requires: each document is a directory whose `INDEX.md` lists its sections. See `rules/sectioning.md` in the `docs` skill.

## File-level docs (MUST)
When modifying any source file, check for `<filename>.md` in the same directory.

## Excluded paths
Tool-generated, VCS, and build paths. Do not create docs inside them:
`.git/`, `.opencode/`, `node_modules/`, `dist/`, `build/`, `.cache/`, `coverage/`

## Directory map
| Path | Purpose | Rules |
|---|---|---|
| core/ | Razor engine .NET solution (`Razor.sln`): Engine, Kernel, Sdk, Shared, Cloud, and the test projects. | `README.md` is human-facing. |
| frontends/ | pnpm workspace for Razor web clients (`apps/`, `packages/`). | `README.md` is human-facing. |
| mobile/ | Placeholder for mobile clients; contains no source yet. | — |
| samples/ | Sample plugins (`Plugins/Adapters/MT5`), `Samples.sln`. | `README.md` is human-facing. |
| docs/ | Product documentation tree. Each document is a directory of section files. | Indexed by `docs/INDEX.md`. |

## Mandatory Impact Workflow

For any non-trivial code change, this repository requires the following sequence.

1. Determine the affected flow or domain.
2. Consult the documentation graph (`docs/INDEX.md`, then the mode-index metadata).
3. Follow documentation relationships until the impact surface is closed.
4. Resolve affected `code_paths` and `test_paths`.
5. Produce a **Change Surface** (`templates/change-surface.md`).

Use the `docs-map` tool (see the `docs` skill's `USAGE.md`); invoke it from the repository root:

```bash
node "$DOCS_SKILL/tools/docs-map/index.js" --root . generate        # rebuild .qwen/docs-index/
node "$DOCS_SKILL/tools/docs-map/index.js" --root . impact "<request>"   # seed, expand, resolve code + tests
```

The `/change` command runs this workflow end to end.

6. Do not implement before the Change Surface is complete.
7. The reviewer MUST verify coverage against the Change Surface.

### Orchestrator

- Own steps 1-5: seed from `docs/INDEX.md`, expand through `references` / `affects` / `implements`, and resolve `code_paths` and `test_paths` before any work is scheduled.
- The graph cache in `.qwen/docs-index/` is derived — regenerate it, never commit it, and never hand-edit it.

### Coder

- Start from the Change Surface, not the raw request.
- Do not run independent architecture discovery unless the surface marks an area incomplete.
- If a needed file lies outside the surface, stop and mark the surface incomplete.

### Reviewer

- Input: original request + Change Surface + diff.
- Verify every declared doc dependency, code path, affected flow, new consumer, and existing consumer of changed contracts.
- Verify tests cover the affected behavior.
- If the diff reveals a surface absent from the Change Surface, mark the Change Surface incomplete and return control to the orchestrator.

### Before Modifying Any Source File

1. Check for a sibling `<filename>.md` file-level doc. Read it first.
2. Confirm the file is inside a `code_paths` glob declared by a doc in the Change Surface. If not, the surface is incomplete.
