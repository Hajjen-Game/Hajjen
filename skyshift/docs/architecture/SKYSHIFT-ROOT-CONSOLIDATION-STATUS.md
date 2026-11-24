# SKYSHIFT — ROOT CONSOLIDATION: SOURCE OF TRUTH

> **Status: NOT FINISHED** (`main`: L1C PR #205 merged at 553566c3c3ccd1b529bb89f300a8e69e7dbefb21; 1,157 total, 286 direct, 118 legacy; all three L1C post-merge workflows green. L1D candidate removes 37 historical files).
> **User's actual goal:** Few essential root files (target <=10), organized active code, and removal of redundant obsolete versions from the working tree. Keep only live dependencies and justified historical fixtures, with Git history as the archive.

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

## R1E — 30 early historical game snapshots (MERGED PR #199)

**Branch:** `skyshift/root-consolidation-r1e-early-game-snapshots`, based on merged R1D main `02942b62a78808a6ae9480b5170cf0976068345d`. Move **30 early `game-v*.mjs` snapshots** (versions v02 through v0498, selected historical version chain) to `legacy/game/`, with coherent original ESM dependency target resolution. All 30 are tested to lack `new URL(` and `import.meta.url`, and their original Git blob identity is reconstructed by reversing only the import-specifier base `./` to `../../`.

- **Root count:** confirmed **387 → 357 on merged `main`** at `0e63f59bddb73e68a68a0e81bfecb50194f09414`, after 36/36 PR checks success.
- 28 audited historical unit-test readers have exact reversible path-only updates. Eight moved historical `legacy/boot/` scripts from R1D now point to the **same** archived game modules using `../game/game-v...`, retaining cache parameters and behavior. Their Git hashes are proven against the prior merged state.
- New manifest `skyshift/legacy/game/R1E-migration-manifest.json`, inverse `skyshift/tests/architecture/r1e-game-test-path-overlay.mjs`, and independent mandatory SHA/dependency/root-count test `skyshift/tests/architecture/legacy-game-migration-r1e.test.mjs`. Stage 5–8 original test assertion guards and R1D historic reader checks compose this inverse; 30 CI syntax paths are rewired.
- No production `index.html`, `boot-v0210.js`, `game-v0210.mjs`, physics/GRIP/tunnel shaders/track logic or visuals changed. Direct historical Pages URLs for removed game module files are not redirected; source remains available at the new archive path.
- **Completed:** all 36 PR checks successful; PR #199 merged at `0e63f59bddb73e68a68a0e81bfecb50194f09414`, confirmed 357 direct-root files on `main`. Pages publication guard and Pages deployment succeeded. Main track QA was last seen queued. This does not complete root consolidation.

## R1F — 29 early-to-mid historical game variants (CURRENT OPEN WORK / NOT MERGED)

**Branch:** `skyshift/root-consolidation-r1f-mid-game-snapshots`, based on merged R1E main `0e63f59bddb73e68a68a0e81bfecb50194f09414`. Relocate **29 `game-v*.mjs` variants** (v0499–v0921, v010, v0102, v0104–v01091) to `legacy/game/`; **measured branch root count 328**, previous merged `main` **357**. Remain *unmerged* pending full PR checks and post-merge publication confirmation.

- Version-aware ESM relative import rebases retain their existing dependencies and game module identity. No `new URL(` or `import.meta.url` used in this cohort.
- 29 archived historical boot scripts now target their matching `../game/game-v*.mjs`; original source Git blob SHA is recoverable by one exact boot URL inverse. **25 historical source reader tests** have path-only reversible changes, exact previous Git blob SHA verified. No gameplay, flight, tunnel, rendering, ship/GRIP, shaders or assets changed.
- Original `boot-v0101.js`, `game-v0101.mjs`, `boot-v0103.js`, `game-v0103.mjs` are intentionally held in root for a separate compatibility audit (historical HTML and many unit fixture references). Production `index.html`, `boot-v0210.js` and `game-v0210.mjs` byte-identical.
- Immutable `skyshift/legacy/game/R1F-migration-manifest.json`, exact inverse `skyshift/tests/architecture/r1f-game-test-path-overlay.mjs`, mandatory `skyshift/tests/architecture/legacy-game-migration-r1f.test.mjs`: validates original Git SHAs for 29 games, 25 unit readers, 29 boots, resolved module dependency paths, original live/held entrypoints and exact 328 root-file count.
- Previous R1, R1C, R1D, R1E and Stage 5–8 historical original SHA checks compose the new inverse as applicable. All 29 game syntax-check paths are updated. If any visual/browser/check fails, **fix without bypassing original source assertions**.
- **Merge gate:** all 36 PR checks green (including separate architecture guard), then verified GitHub merge, **328 actual files in `main`**, Pages/track checks. Afterward continue remaining 47 `game-v*.mjs` files, 28 root CSS files, other historical modules and documentation to target <=10 intentional root files.

## Work history / last decision

- 2026-11-23: **468 root files** found; earlier "Architecture Cleanup 2.0 complete" statement corrected.
- The ongoing crash/slow long-chat problem is a separate ChatGPT product issue; **do not rely on chat history alone** for technical handoff.
- R0 was originally a **non-runtime correction**. R1–R1F are actual file moves, recorded separately above; the overarching root-consolidation goal remains unfinished.

## R1G — 42 later historical game snapshots (MERGED #201)

R1F PR #200 merged at ab926746c1a356d8f2a9c079968e7e65dc804901, 328 direct files, all main checks green. R1G exhaustive reference audit run 45343324620 found 42 eligible of 43 candidates. Move those 42 to legacy/game/ and preserve the exact prior Git blob after reversing only static relative imports; rewire matching bootstraps and audited unit readers, including exact boot import regex paths. Keep v0191 (missing unique CI syntax check), v0101/v0103 compatibility pairs, v0203 comparison page, and live v0210. Historical direct-root Pages script URLs are not redirected. Root target 286. Require independent R1G SHA guard and all original cumulative gates plus full PR checks before merge; verify Pages and track QA afterward. No runtime behavior or asset changes intended. Next: audit held game/boot compatibility, then CSS/UI and subsystem modules. Goal remains <=10 intentional direct files.

### R1G CI follow-up

PR #201 first fast run 45345177629 failed four historic 0.16.5 subtests because eight exact static import assertions in two track test readers still expected ./ paths. Rebase only those assertions to ../../, retaining identical module names and inverse SHA verification. No production code or baseline SHA changed. Full PR checks required before merge.

Post-R1G direction: distinguish active dependency graph, explicit A/B fixtures and obsolete full snapshots. Prefer preserving redundant versions via Git history rather than carrying all historical snapshots in the working tree. Audit current regression coverage and dependencies before retiring anything; never remove tests merely to turn CI green. This is a proposed next cleanup phase, not an assertion of completion.

## R1G post-merge repair and L0 next step

R1G merged after 36/36 checks. Main Pages guard and deployment succeeded; track logic run 45347598692 failed 11/185 assertions due to old static ESM import path expectations on archived snapshots. Repair exactly the 11 affected test readers, with reversible SHA checks and no game changes. Add the exact full post-merge track test command to mandatory pre-merge architecture guard to prevent recurrence. L0 inventory 45347691497 is green: 186 game/boot snapshots outside the literal runtime graphs; 2 active and 2 comparison snapshots. All 186 still have executable references (test, workflow or other), so they need coherent retirement, not blind deletion. 160 literal live graph nodes, 95 comparison, 33 dynamic references for review. L1 should retire a substantial redundant family only after preserving unique current coverage and establishing a durable Git-history rollback point. No legacy removal in this repair PR. User has explicitly approved actual deletion of obsolete files, not merely relocating them.

## L1A — first actual legacy retirement (MERGED #203)

Base and immutable rollback commit: `06754fc69e87b23e63b73e1552f99883fadc3897` (PR #202). All 36 required PR checks and both post-merge Pages workflows passed. L0 run 45347691497 identified 186 historical snapshots outside the literal live/comparison graph. This cohort removes 19 legacy bootstraps and 3 complete historical games (v02, v03, v0170), each with the exact same blob SHA as the L0 inventory and only historical workflow syntax references outside architecture metadata and the retiring cohort. No ordinary unit or browser reader is removed. Manifest `skyshift/docs/architecture/legacy-retirement-l1a.json` pins each deleted path and blob to the rollback commit. Previous SHA assertions still run using the archived Git objects for these exact approved paths; retained sources still require ordinary file existence. The new independent retirement gate asserts all 22 are absent, recoverable, and have no remaining executable literal references outside the architecture audit/metadata. Remove only their obsolete syntax commands; preserve all actual tests and High/4GB checks. Adds 3 audit files: expected net total 1,222 → 1,203, root unchanged 286, legacy 190 → 168. No production game or assets changed. Direct old URLs for these retired scripts will no longer be available. Verify full PR and main workflows. Next: review legacy snapshot-specific test readers and unique modern coverage, retire larger coherent families while keeping required comparison fixtures. Do not mark project complete before <=10 intentional root files and actual reduced total.

## L1B — nine historical game/bootstrap pairs (MERGED #204)

L1A #203 merged with 36/36 checks; verified main 1,203 tracked SKYSHIFT files, 286 direct, 168 legacy. Both post-merge Pages checks green; track logic run 45364611837 queued at start. This candidate retires 18 full historical files (v0180, v0190, v0192, v0200, v0201, v0202, v02021, v0204, v02041). L0 reference audit and current tree SHAs confirm each has one ordinary source reader, not a live or comparison dependency. Nine source-reader imports redirect only file reads through the SHA-verified Git history adapter, with exact inverse source SHA and all assertions preserved. Fetch pinned Git commit in relevant CI, preserve actual runtime tests. New independent manifest and gate require absent retired paths, exact archive blobs, exact original reader identity and no new executable references outside allowlisted readers/architecture records. Stage M historical consumers still check actual source. No gameplay or assets changed. Target net 1,203 → 1,187 files (18 deletions, two new audit files), legacy 168 → 150, root 286. Do not merge before L1A post-merge track and all L1B mandatory checks green. Next: retire remaining historical source-only snapshots and simplify redundant historical checks, then active module structure. 

## L1C — 16 early VFX / performance / race historical game-bootstrap pairs (MERGED #205)

L1B #204 merged after 36/36 checks and all L1A main workflows green. Verified main 1,187 tracked SKYSHIFT files, 286 direct, 150 legacy. L1B main workflows 45367698470, 45367698659, 45367699558 pending at start. L1C retires 32 full historical files (v0104, v0105, v0106, v0107, v01071, v0108, v0109, v01091, v0110, v0111, v0112, v0113, v0114, v0120, v0121, v0130). L0 audit and exact current tree blobs show each has a single historical unit source reader outside the architecture and syntax checks. Redirect only its readFileSync import through the already verified pinned Git-history adapter, preserving every test assertion and exact inverse reader SHA. These 16 historic readers are currently syntax-checked, not executed by the normal workflows; do not claim they are live gameplay coverage. Retain their source, original CI coverage and all current tests. New manifest and independent audit verify exact archived blobs, absence, exact reader SHA and no unapproved executable references. No runtime or assets changed. Expected 1,187 → 1,157 total (32 deletions, two new audit files), legacy 150 → 118, root 286. Require all L1C checks and L1B post-merge workflows green before merge. Next: remaining historical source-only families, then reduce redundant test infrastructure and consolidate active root modules. 

## L1D — nine historical game/bootstrap pairs and 19 early game snapshots (UNMERGED)

L1C #205 merged; all main workflows 45377114682, 45377114676, 45377113896 completed successfully. Verified main 1,157 total SKYSHIFT files, 286 direct, 118 legacy. L1D retires 37 historical files: 9 pairs (v01346, v01347, v01348, v0140, v0150, v0151, v0160, v0161, v0163) and 19 standalone early games (v031–v0491, exact list in manifest). L0 audit and current tree verify one historical unit source reader per snapshot, no identified live/comparison consumer. Reader filesystem import alone changes to existing pinned SHA-verified Git-history adapter; exact source reader SHA inversion includes the early spaced import. All existing assertions and CI coverage retained. New independent manifest and retirement gate enforce absence, exact Git blobs, exact reader identity and no unapproved executable references. No runtime or assets changed. Expected 1,157 → 1,122 tracked files (37 deletions, two new audit files), legacy 118 → 81, direct root 286. Require full PR and post-merge checks. Next: remaining multi-reader snapshots, root-only historic entrypoints, then consolidate active modules. 

### L1D CI follow-up

PR #206 first run 45380832785 failed Stage 8 source-reader target verification for retired v0160. Keep static import, dynamic import, URL and subprocess checks requiring physical files. Permit only the manifest-declared historical source reader/path pair to verify the SHA-checked archived Git object instead. No change to live modules, test assertions or original test blob identity. Re-run all PR checks before merging.
