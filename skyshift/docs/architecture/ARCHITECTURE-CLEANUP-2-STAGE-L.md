# SKYSHIFT Architecture Cleanup 2.0 — Stage L: 45 Chromium/WebGL QA runners

**Base:** `952bf0b87741363b65a772c30ebe3bc9e88be3f3` (Stage K was merged; post-merge gates must also be checked before merging this draft).

This stage moves **45 root-level browser QA scripts** to `skyshift/tests/browser/`, preserving each original Git blob SHA in `tests/browser/stageL-migration-manifest.json`. The root browser scripts were preflight checked for module-location dependence; no `import.meta.url`, static relative Node module imports or filesystem reads relative to a moved source location were detected. Browser-context dynamic imports are still resolved against the same SKYSHIFT web page, not the Node harness path.

**No modifications to any of these 45 runner contents.** GitHub CI workflow command references are updated in `skyshift-ci-fast.yml`, `skyshift-tests.yml`, and `skyshift-preview-v02891.yml` so historical, fast Chromium and visual QA keep running.

**Protected five stay at root:** `browser-cinematic-hero-v0210.mjs`, `browser-fairness-v0135.mjs`, `browser-grip-half-v01348.mjs`, `browser-grip-trick-v0165.mjs`, `browser-multi-track-v0160.mjs`.
These were excluded from the earlier Stage B audit because historical QA/source dependencies require a separate review. The five remaining historical `browser-smoke-*` unit-test fixtures from Stage K also stay in place. No original unit-test assertion source or strict historical SHA assertion has been altered.

The independent `browser-qa-migration-stageL.test.mjs` guard verifies original 45 Git blob hashes, all executable CI paths, no stale root files and protected runner locations; it also runs syntax checks on the full browser QA directory.

**Merge gate:** the four Stage K post-merge main QA/Pages workflows must all succeed, independent architecture guard and **all 35 fast PR jobs** must be green (including all 33 genuine Chromium/WebGL tests), and code review must show only exact renames, CI path updates and safeguards. Do not merge while any check is queued, red or missing. After merge check main QA, visual, Pages guard and Pages deployment; rollback via one revert commit if required.

Runtime `index.html`, `boot-v0210.js`, `game-v0210.mjs`, the shared Skyline/Aurora/Vault tunnel, optics, shaders, physics, gameplay and all art assets are unchanged. Historical documentation and consumer snapshots retain historical path strings intentionally.
