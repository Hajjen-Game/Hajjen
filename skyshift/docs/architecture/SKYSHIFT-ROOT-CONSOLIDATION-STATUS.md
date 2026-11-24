# SKYSHIFT — ROOT CONSOLIDATION: SOURCE OF TRUTH

> **Status: NOT FINISHED** (`main`: merged PR #198, `02942b62a788`, **387 direct files**; R1E branch targeting **357** after independent CI and merge, 2026-11-24).  
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

**R0 — Evidence and ownership (COMPLETE).** Inventory all 468 root files, build a reference/asset dependency map, classify each file into (a) current entrypoint/runtime, (b) imported live module, (c) historical version needed by tests/A-B, (d) test/tool, or (e) confirmed unreferenced. Report **measured** categories. Never claim old versions are safe to remove without checking.

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

## R1B — 20 archived bootstrap files, merged as PR #196

Baseline after PR #195: **449 root files**. Merged PR #196 moved 20 historical `boot-v*.js` to `legacy/boot/` and adjusts 22 historical unit test source readers, leaving **429 root files** on `main`. Original boot Git blob SHA values and original test SHAs are protected by `legacy/boot/R1B-migration-manifest.json` and a reversible path-only audit. Live `boot-v0210.js`, `game-v0210.mjs`, and all rendering/flight code are untouched. Historical direct bootstrap URLs are not automatically redirected on GitHub Pages. **All 35 PR checks, the separate 0.20.3 WebGL regression and `main` Pages/QA succeeded.**

## R1C — early VFX and 0.13.x bootstrap readers (MERGED PR #197)

After PR #196, `main` had **429 direct-root files**. Merged PR #197 moves **20 additional historical boot scripts** into `legacy/boot/`, updating **24 original unit-test readers**, leaving **409 actual direct-root files** after merge. Four UI flow regression tests also update their import-path expectations from `./game-v` to `../../game-v`: they still verify the same target version and query, and their **entire original Git blob SHA** must be recoverable by the narrow reversible path overlay.

- Immutable source/reader manifest: `skyshift/legacy/boot/R1C-migration-manifest.json`.
- Mandatory independent SHA and root-count gate: `skyshift/tests/architecture/legacy-boot-migration-r1c.test.mjs`. Original Stage 5–8 unit-integrity checks remain strict.
- Active `index.html`, `boot-v0210.js` and `game-v0210.mjs` are unchanged; no rendering/flight/track edits.
- **Merged `5c724ec8e19bc67f1d84d57997b7e7316c380bc8`** after **36/36 successful PR checks**. Exactly **409** root files and the Pages publication guard and Pages deployment were verified; post-merge track logic QA was still being checked during this session.
- Remaining boot versions after R1C: **25**, including the active entrypoint (24 historical). Continue with the 0.13.4 lineage and older 0.4.9 compatibility tests, then the historical `game-v*` modules. The final target remains a few intentional root files, not just green CI.

## R1D — 22 remaining versioned boot readers (MERGED PR #198)

**Branch:** `skyshift/root-consolidation-r1d-historical-bootstrap-families` from merged PR #197 (`5c724ec8e19b`). After an explicit root-level inventory and literal-reference audit, this branch relocates **22 historical boot-v*.js scripts** (0.13.4 family, 0.16.5, 0.4.9.1.1–0.4.9.8, 0.7.1–0.8.1) into `skyshift/legacy/boot/`.

- **Actual merged `main` root before:** 409. **Merged R1D root:** 387, independently checked on `main` at `02942b62a78808a6ae9480b5170cf0976068345d`.
- **34 historical source readers** have only literal file paths updated; exact import URL assertions are adapted only for changed script location. Manifest: `skyshift/legacy/boot/R1D-migration-manifest.json`; inverse source overlay: `skyshift/tests/architecture/r1d-boot-test-path-overlay.mjs`. Original test blob SHAs from R1C-main are required to match perfectly after inverse. Stage 5–8 original SHA guards compose this inverse; R1B/R1C and R1 source tests enforce the cumulative 387 count.
- **Intentionally untouched:** `index.html`, live `boot-v0210.js` and `game-v0210.mjs`, and legacy root `boot-v0101.js`, `boot-v0103.js` pending specific compatibility assessment. The original historical direct-root URLs of moved files cannot be redirected by GitHub Pages, as documented in prior batches.
- **Completed:** 36/36 PR checks passed; PR #198 merged as `02942b62a78808a6ae9480b5170cf0976068345d`; **409 → 387** direct files on `main`. Pages publication guard and Pages deployment passed; post-merge track logic workflow was still queued at last inspection. Leave 0.10.1/0.10.3 aliases until separate audit.

## R1E — 30 early historical game snapshots (CURRENT OPEN WORK / NOT MERGED)

**Branch:** `skyshift/root-consolidation-r1e-early-game-snapshots`, based on merged R1D main `02942b62a78808a6ae9480b5170cf0976068345d`. Move **30 early `game-v*.mjs` snapshots** (versions v02 through v0498, selected historical version chain) to `legacy/game/`, with coherent original ESM dependency target resolution. All 30 are tested to lack `new URL(` and `import.meta.url`, and their original Git blob identity is reconstructed by reversing only the import-specifier base `./` to `../../`.

- **Root count:** confirmed **387 on merged main**, expected **357 on R1E branch**. This is not merged/complete until all safety checks succeed and a subsequent main count confirms it.
- 28 audited historical unit-test readers have exact reversible path-only updates. Eight moved historical `legacy/boot/` scripts from R1D now point to the **same** archived game modules using `../game/game-v...`, retaining cache parameters and behavior. Their Git hashes are proven against the prior merged state.
- New manifest `skyshift/legacy/game/R1E-migration-manifest.json`, inverse `skyshift/tests/architecture/r1e-game-test-path-overlay.mjs`, and independent mandatory SHA/dependency/root-count test `skyshift/tests/architecture/legacy-game-migration-r1e.test.mjs`. Stage 5–8 original test assertion guards and R1D historic reader checks compose this inverse; 30 CI syntax paths are rewired.
- No production `index.html`, `boot-v0210.js`, `game-v0210.mjs`, physics/GRIP/tunnel shaders/track logic or visuals changed. Direct historical Pages URLs for removed game module files are not redirected; source remains available at the new archive path.
- **Merge gate:** all 35 PR visual/fast checks + architecture guard must be green, along with no genuine missing historical imports; verify **357** direct files, Pages and track logic after merge. Do not mistake this one cohort for root consolidation completion. Continue remaining 76 `game-v*.mjs` source files, CSS, and active-module grouping with dependency-aware batches and a goal of <=10 root files.

## Work history / last decision

- 2026-11-23: **468 root files** found; earlier "Architecture Cleanup 2.0 complete" statement corrected.
- The ongoing crash/slow long-chat problem is a separate ChatGPT product issue; **do not rely on chat history alone** for technical handoff.
- R0 was originally a **non-runtime correction**. R1–R1E are actual file moves, recorded separately above; the overarching root-consolidation goal remains unfinished.
