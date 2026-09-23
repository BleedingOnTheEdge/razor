# NEED_CLEARIFICATION

Open items are provisional intent. They are NOT product intent.
When confirmed, promote into the target doc and remove the item.

## Index

| ID | Status | Date | Scope | Summary |
|---|---|---|---|---|
| NC-0001 | open | 2026-09-23 | product:razor | Version/Status/Last Updated blocks removed during docs repair |
| NC-0002 | open | 2026-09-23 | repo:razor | No org-root anchor reachable above the razor repo |
| NC-0003 | open | 2026-09-23 | product:razor | Section boundaries and generated headings chosen without doc authority |
| NC-0004 | open | 2026-09-23 | product:razor | `kind` assignments are judgment calls; docs/INDEX.md kind unauthorised |
| NC-0005 | open | 2026-09-23 | repo:razor | README.md documentation hub links are stale and out of repair scope |
| NC-0006 | open | 2026-09-23 | repo:razor | Subtree anchors (core/, frontends/, samples/) have no AGENT.md |

## NC-0001 — Removed Version/Status/Last Updated blocks

- **Status:** open
- **Date:** 2026-09-23
- **Agent:** qwen-code (docs skill, repair mode)
- **Scope:** product:razor
- **Affected repos:** razor
- **Situation:** Nine of the ten source documents carried a body-level metadata block (`**Version:**`, `**Status:**`, `**Last Updated:**`, and on seven of them `**Audience:**`). `rules/frontmatter.md` lists `version`, `status`, and `last_reviewed` as removed fields that MUST NOT appear, because VCS is the version store and docs are always live. Removing the blocks is therefore required — but it deletes body content the guideline never marked as non-semantic.
- **Options considered:**
  1. Remove the blocks and reproduce the exact removed text here.
  2. Retain the blocks in the body, violating the removed-fields rule.
- **Chosen approach:** Option 1. Removed from all nine documents that had a block; the text below is reproduced verbatim.
- **Rationale:** The removed-fields rule is explicit authority that this is bookkeeping rather than intent, and every removed line is preserved below, so no information is lost. All of it remains recoverable from git (`e424b8b`).
- **Reversibility:** high
- **Promotion target:** none — the content is intentionally dropped from the doc set; promote only if the requirement to keep it changes.

### Removed text (verbatim)

`Razor Proposal.md` (now `docs/002-blueprint/002-001-project-overview/`):

```
**Version:** 1.0.0 LTS
**Audience:** Investors, partners, and prospective users
**Status:** Authoritative
**Last Updated:** 2026-07-09
```

`Razor Product Model.md` (now `docs/002-blueprint/002-010-product-model/`): no block was present.

`Razor Engine – Finalised Technical Blueprint.md` (now `docs/002-blueprint/002-020-engine-technical-blueprint/`):

```
**Version:** 1.0.0 LTS
**Status:** Authoritative – Single Source of Truth
**Last Updated:** 2026-07-09
```

`Razor Internal Technical Architecture Document.md` (now `docs/002-blueprint/002-030-internal-architecture/`):

```
**Version:** 1.0.0 LTS
**Audience:** Razor core developers (Kernel, Engine, Cloud)
**Status:** Authoritative
**Last Updated:** 2026-07-09
```

`Features.md` (now `docs/002-blueprint/002-040-future-features/`):

```
**Version:** 1.0.0 LTS (current)
**Audience:** Internal & partner teams
**Status:** Forward‑looking roadmap – no commitments implied
**Last Updated:** 2026-07-09
```

`Razor Configuration Reference.md` (now `docs/004-contracts/004-001-configuration-reference/`):

```
**Version:** 1.0.0 LTS
**Audience:** Extension developers & power users
**Status:** Authoritative
**Last Updated:** 2026-07-09
```

`Razor Extension Developer Guide.md` (now `docs/004-contracts/004-010-extension-developer-guide/`):

```
**Version:** 1.0.0 LTS
**Audience:** Extension developers (adapters, strategies, indicators, hook plugins, NN models)
**Status:** Authoritative
**Last Updated:** 2026-07-09
```

`Razor Principles.md` (now `docs/005-cross-cutting/005-001-principles/`):

```
**Version:** 1.0.0 LTS
**Status:** Authoritative
**Last Updated:** 2026-07-09
```

`Razor Glossary.md` (now `docs/005-cross-cutting/005-010-glossary/`):

```
**Version:** 1.0.0 LTS
**Audience:** All users (developers, traders, IT)
**Status:** Authoritative
**Last Updated:** 2026-07-09
```

`Razor Installation & Deployment Guide.md` (now `docs/006-operational/006-001-installation-and-deployment/`):

```
**Version:** 1.0.0 LTS
**Audience:** End‑users (traders, quants, IT staff)
**Status:** Authoritative
**Last Updated:** 2026-07-09
```

## NC-0002 — Org-root anchor unreachable

- **Status:** open
- **Date:** 2026-09-23
- **Agent:** qwen-code (docs skill, repair mode)
- **Scope:** repo:razor
- **Affected repos:** razor
- **Situation:** `templates/agent.md` expects a repo `AGENT.md` to name an `org_root` and an `org_docs_fallback`. No org-root docs anchor exists in this workspace: the workspace root is a non-git container, and `razor/` is the organisation's only repository. The anchor above `repo:razor` is therefore unknown.
- **Options considered:**
  1. Treat the razor repo root as the org root (`is_org_root: true`, `level: org`).
  2. Anchor razor at `level: repo` with `requires_org_docs: true` and `org_docs_fallback: notify`, omitting `org_root`.
- **Chosen approach:** Option 2.
- **Rationale:** `org_docs_fallback: notify` is the behaviour the skill defines for exactly this case — an unreachable org root — so it needs no invention. Option 1 would assert an organisation structure (that razor *is* the org root) that the repository does not evidence.
- **Reversibility:** high
- **Promotion target:** `razor/AGENT.md`

## NC-0003 — Section boundaries and generated headings

- **Status:** open
- **Date:** 2026-09-23
- **Agent:** qwen-code (docs skill, repair mode)
- **Scope:** product:razor
- **Affected repos:** razor
- **Situation:** `rules/sectioning.md` requires sectioning to be semantic — "one concern per section", not a heading-depth mirror — and requires recursion until every loadable unit is under the threshold. The sources are single flat files with their own numbered `##` headings. Choosing where to cut, and how deep to recurse, required decisions the sources do not authorise. Six decisions were made.
- **Options considered:**
  1. Apply the decisions below and record them here.
  2. Leave the ten documents unsectioned, violating Core Rule 11 and `rules/sectioning.md`.
- **Chosen approach:** Option 1. The decisions were:
  1. **Boundaries at the sources' own numbered top-level headings.** Each numbered `##` heading in the sources is a single concern (a principle, a configuration object, a protocol aspect), so they were used as section boundaries.
  2. **Glossary split by letter, not by its single H2.** The Glossary's only H2 (`## Purpose`) encloses the entire document, so splitting at H2 would produce one 449-line section. Sections were taken at the alphabetical H3 headings instead: an intro section plus one per letter `A`–`X`.
  3. **Recursion only where the threshold required it.** `Extension Developer Guide` §4 (197 lines / 963 words) and §6 (278 lines / 1090 words) crossed the soft threshold, so each became a directory split at its own H3 headings. Every other document fell under the threshold after one split, so no further recursion was needed.
  4. **Three generated lead-in sections.** The `Future Features` preamble and the lead-ins to `Extension Developer Guide` §4 and §6 are prose with no heading of their own. Each became a section titled `Overview`. **These three headings are generated text, not source text.**
  5. **Section titles keep the sources' own numbering** (e.g. `006-001-020` carries the title "2. System Requirements"). File and doc-ID numbering is canonical; order is defined by `INDEX.md` per `rules/numbering.md`. Titles were not renumbered, because that would edit source text.
  6. **INDEX purpose lines are the section headings verbatim**, not authored summaries. Writing 171 bespoke summaries would invent intent the sources do not state.
  Also noted: the tiny Glossary letter sections (7–19 lines) were **not** merged with neighbours. Each letter is an independent alphabetical bucket, so the merge condition in `rules/sectioning.md` — "shares a single concern with a sibling" — does not hold. Separator `---` rules that stood between sections in the sources are preserved at the end of the preceding section file, for losslessness.
- **Rationale:** Each decision follows `rules/sectioning.md` as closely as the source material allows; the only generated text is the three `Overview` headings, disclosed above. No semantic content was added, removed, or reordered: the section files concatenate back to each source body line-for-line.
- **Reversibility:** medium — re-cutting boundaries is mechanical, but section doc IDs are path-derived and callers may already reference them.
- **Promotion target:** `docs/INDEX.md` and the affected per-document `INDEX.md` files.

## NC-0004 — `kind` assignments are judgment calls

- **Status:** open
- **Date:** 2026-09-23
- **Agent:** qwen-code (docs skill, repair mode)
- **Scope:** product:razor
- **Affected repos:** razor
- **Situation:** No source document declares its own `kind`, and the required `kind` enum offers no exact fit for three of them. The contested assignments are: `future-features` → `blueprint` (it is a roadmap); `glossary` → `cross-cutting` (there is no `reference` kind); `configuration-reference` → `contract` (it is a data contract, but `operational` is arguable). Separately, `docs/INDEX.md` itself must carry a `kind` while indexing all four kinds, and was set to `blueprint`.
- **Options considered:**
  1. The assignments above.
  2. Reassign, e.g. `configuration-reference` → `operational`, or move `glossary` into `002-blueprint`.
- **Chosen approach:** Option 1.
- **Rationale:** Each assignment follows the kind definitions in `rules/frontmatter.md`; no source document states a conflicting classification, and no two documents at the same level conflict under `rules/precedence.md`.
- **Reversibility:** high
- **Promotion target:** `docs/INDEX.md` and the affected `INDEX.md` files.

## NC-0005 — README.md documentation hub links are stale

- **Status:** open
- **Date:** 2026-09-23
- **Agent:** qwen-code (docs skill, repair mode)
- **Scope:** repo:razor
- **Affected repos:** razor
- **Situation:** `razor/README.md` is a documentation hub whose links resolve as though it sat inside `docs/` (`Razor%20Principles.md`, `Razor%20Product%20Model.md`) or point at a `../core/docs/` directory that no longer exists (`../core/docs/Razor%20Configuration%20Reference.md`). These links were already broken before this repair: commit `bdd5054` moved the documents out of `core/docs/` into `docs/`. This repair has now split the documents into directories and relocated them to canonical paths, so every one of those links is stale. `core/README.md` and `core/src/*/README.md` share the defect, and `core/README.md` additionally links a non-existent `Razor Plugin Developer Guide.md`.
- **Options considered:**
  1. Leave `README.md` untouched and record the defect here.
  2. Rewrite the `README.md` links to the new doc IDs.
- **Chosen approach:** Option 1.
- **Rationale:** Core Rule 2 and the `repair` mode rules both forbid editing `README.md`; the repair cannot fix it. Recording it lets a human fix the hub, which is outside the `docs` skill's authority.
- **Reversibility:** high
- **Promotion target:** `razor/README.md` (human-authored; not covered by the `docs` skill)

## NC-0006 — Subtree anchors have no AGENT.md

- **Status:** open
- **Date:** 2026-09-23
- **Agent:** qwen-code (docs skill, repair mode)
- **Scope:** repo:razor
- **Affected repos:** razor
- **Situation:** `repair` mode step 10 requires an `AGENT.md` at each anchor boundary, and to raise an NC item when a boundary is unclear rather than guess. The razor repo contains three subtrees that could each be their own anchor — `core/` (the engine solution), `frontends/` (web clients), `samples/` (sample plugins) — and `mobile/` is an empty placeholder. None currently holds documentation, and the source material offers no basis for deciding whether they are separate anchors or subordinate to the repo anchor.
- **Options considered:**
  1. Create `AGENT.md` only at the razor repo root (what was done).
  2. Also create `AGENT.md` for `core/`, `frontends/`, and `samples/`.
- **Chosen approach:** Option 1.
- **Rationale:** A documentation scope begins where documentation lives, and all documentation lives in `docs/`; creating routers for subtrees with no docs would assert scopes the sources do not support. The repo `AGENT.md` records each subtree in its directory map so the boundary can be revisited.
- **Reversibility:** high
- **Promotion target:** `razor/AGENT.md` (and new `core/AGENT.md`, `frontends/AGENT.md`, `samples/AGENT.md` if the boundary is confirmed)
