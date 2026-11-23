# SKYSHIFT — ROOT CONSOLIDATION: SOURCE OF TRUTH

> **Status: NOT FINISHED** (checked against GitHub `main` at `87e9fb706c`, 2026-11-23).  
> **User's actual goal:** Just a few essential files directly inside `skyshift/`; organize all remaining live modules, historical versions, tests and documentation into clearly named subdirectories. **Do not mark this goal complete merely because the shared tunnel architecture tests are green.**

## Verified baseline

- `skyshift/`: **1,197 tracked files** in total, **468 tracked files immediately under `skyshift/`** (not including nested directories).
- Those 468 direct files comprise **349 `.mjs`**, **84 `.js`**, **28 `.css`**, **2 `.html`**, and **5 `.md`** files.
- Name-based inventory includes **106 `game-v*.mjs`**, **84 `boot-v*.js`** and **24 `style-v*.css`** at the root. These are version families, **not automatically dead code**.
- `skyshift/index.html` is the live GitHub Pages entrypoint; it loads `./boot-v0210.js`, which dynamically loads `./game-v0210.mjs`. The HTML also loads **several CSS version files** simultaneously. Thus an old-looking version string does **not** prove the file is unreferenced.
- Existing subsystem folders: `tests/`, `docs/`, `tracks/`, `flight/`, `core/`, `world/`, `rendering/`, `tunnel/`, `ships/`, `assets/`. Prefer them over new catch-all folders for active shared code.
- The final cross-track audit (PR #192, merged `87e9fb706c`) verified shared Skyline/Aurora/Vault contracts **only**. This did not satisfy the root-layout objective.
- PR #191 relocated 16 Stingray HERO modules on a separate branch but was **closed without merge** because it was mistakenly called Stage N. Its work remains in Git history; do not quietly resurrect it without a new reference audit.

## Non-negotiable safety rules

1. **Do not delete or mechanically archive based solely on filenames.** Verify the live entrypoint graph, dynamic imports, HTML/CSS URLs, `new URL(..., import.meta.url)` asset resolution, historical test paths and `.github/workflows/` references first.
2. Move a **cohesive functional family** in each PR, updating import specifiers, test paths, workflow references and asset URLs together. Record original Git blob SHAs and enforce content identity except for documented path substitutions.
3. Preserve real Three.js/WebGL renderer behavior, image output, controls, physics, GRIP, track layouts and racing experience. Test both High and 4 GB profiles where a live module moves. Maintain historical A/B checks and rollback ability.
4. Avoid endless 10-file batches: use **roughly 30–80 files per batch where dependency analysis supports it**; smaller batches for path-sensitive assets. Optimize CI with existing change-scope checks rather than skipping necessary safety gates.
5. Do not merge while any required check is red/queued. Verify `main` historical track logic checks, Pages publication guard and Pages deployment after appropriate merges. Fix or rollback genuine regressions.
6. Keep this file updated after every PR: number of direct-root files **before → after**, families moved, current SHA, any unresolved risks, and exact next step.
7. **Success criterion:** after safety verification, only a small intentional set of root entrypoint/compatibility files remains (working target **at most 10**, subject to genuine hosting constraints). All other relevant source and archived versions have explicit homes. A green test suite is **necessary but not sufficient** to claim completion.

## R0 automated audit — first execution

The new `skyshift/tests/architecture/root-consolidation-inventory.test.mjs` is invoked by the existing mandatory entrypoint safety guard. It reads a **468-file original path + SHA baseline**, traverses the live HTML, CSS and JavaScript relative-reference graph, checks its local files exist, and groups each original root file into `entrypoint`, `activeReachable`, `otherReferenced`, `noObservedReference`, or `relocated`. It prints the measured groups to CI with the prefix `SKYSHIFT_ROOT_R0_COUNTS`.

**Important:** `noObservedReference` is not the same as unused. Dynamic/templated/external URLs can evade a static scanner. R1 moves require additional code search and historical test/URL reviews. Every later group must change the measured root count and preserve source Git SHAs.

## Safe migration roadmap

**R0 — Evidence and ownership (CURRENT).** Inventory all 468 root files, build a reference/asset dependency map, classify each file into (a) current entrypoint/runtime, (b) imported live module, (c) historical version needed by tests/A-B, (d) test/tool, or (e) confirmed unreferenced. Report **measured** categories. Never claim old versions are safe to remove without checking.

**R1 — Historical entry versions.** Relocate eligible `game-v*` and `boot-v*` snapshots to an explicit `legacy/` structure in coherent batches. Protect current `game-v0210.mjs` and `boot-v0210.js`, preserve A/B URLs when required, and update every historical test, import and workflow. A legacy URL compatibility decision must be explicit before relocation.

**R2 — CSS and UI.** Many `style-v*` and `fleet-v*` stylesheets are **currently referenced** by `index.html`. Consolidate/move only with identical stylesheet order, resolved asset URLs and real rendering comparisons.

**R3 — Remaining active modules.** Relocate the many root gameplay, world, flight, ship, and lighting modules to their existing subsystem folders in dependency-aware batches with Git-SHA audits. Do not blindly merge older versions into latest implementations.

**R4 — Actual finish line.** Count the remaining direct files, validate live and historical behavior, confirm Pages deploy, document deliberate root exceptions and **only then** declare root consolidation complete and continue with further gameplay/performance/visual passes.

## Continuity across ChatGPT crashes / new conversations

The **Git repository, not the previous chat, is the durable project state**. In a new conversation, ask:  
"Read `skyshift/docs/architecture/SKYSHIFT-ROOT-CONSOLIDATION-STATUS.md` in `Hajjen-Game/Hajjen`, inspect current GitHub `main` and open PRs, then proceed with the next safe unmerged root-consolidation step. Do not claim the cleanup is finished until the root count meets the exit criteria."

For each work session: verify latest `main`, look for open PRs, reconcile the last finished stage, show the concrete before/after root count, and stop calling this task done prematurely.

## R1 — first actual migration cohort (19 legacy bootstraps)

**Proposed PR:** move 19 historical `boot-v*.js` files into `legacy/boot/`, preserving their bodies byte-for-byte except that their dynamic game import changes from `./game-v` to `../../game-v` (same target game file). Update `.github/workflows/skyshift-tests.yml` to check the new paths and add mandatory, original Git-blob SHA/integrity/path tests.

- **Root before:** 468 files
- **Root after this PR merges:** **449** files
- **Moved:** 19 historical bootstrap files with no exact-string reference in the unit-test code search; all original SHAs recorded in `legacy/boot/R1-migration-manifest.json`.
- **Explicit exclusions:** live `index.html`, `boot-v0210.js`, `game-v0210.mjs`; every bootstrap directly read by historical unit tests (those will need a separate controlled pass).
- **Caveat:** old absolute GitHub Pages URLs ending in the removed root-level bootstrap filenames are not redirected by GitHub Pages; original scripts are preserved in `legacy/boot/`. No active entrypoint or visible game URL changes.
- **CI acceptance:** mandatory root-count audit, SHA/content equivalence, preserved dynamic-import target URLs, all PR checks and post-merge Pages publication.

**This is the first cohort, not the completion of root consolidation.** Next: remaining bootstraps that have historical test consumers; update those tests with reversible SHA checks, then game snapshots and styles.

## Work history / last decision

- 2026-11-23: **468 root files** found; earlier "Architecture Cleanup 2.0 complete" statement corrected.
- The ongoing crash/slow long-chat problem is a separate ChatGPT product issue; **do not rely on chat history alone** for technical handoff.
- This document is a **non-runtime correction**. It neither moves source files nor claims the remaining migration has started or been completed.
