# SKYSHIFT Architecture Cleanup 2.0 — Stage M: Station World and Offline Asset Authoring

**Base:** `daf237dee73259e702cbc04065ebcaa1dd28f3db` (Stage L merged). The PR remains **draft** until all Stage L post-merge checks and Stage M PR checks are green.

The stage relocates 16 coherent historical/active station-world source files:

- Eight `build-station-world-v020*.mjs` offline glTF authoring scripts to `skyshift/world/authoring/` — byte-identical source.
- Eight `environment-art-pipeline-v020*.mjs` runtime world modules to `skyshift/world/`. The only source rewrite is their relative `assetPath` string from `./assets/worlds/` to `../assets/worlds/`, necessary because the existing glTF loader resolves against `import.meta.url`. The target assets and geometry remain identical.
- Nine current/historical game consumers, eight original regression test files, and two existing CI workflows are rebased to correct locations.

Four original historical unit-test Git SHA audit scripts receive a narrow **reversible Stage M path-only overlay**. The original assertion logic and SHA expectations are not relaxed. A new independent guard checks all 16 original Git blob hashes (reconstructing the old glTF-relative string where applicable), all eight asset URLs, each affected game/test import and both workflow references.

**No changes to actual glTF files, active tunnel, 3D racing geometry, shader code, lighting coefficients, flight physics, camera, GRIP, ships or tracks.**

Mandatory merge gates: all required Stage L main-postmerge checks; Stage M complete 36/36 PR checks including every real Chromium/WebGL job; architecture SHA/asset URL test and all earlier Stage A–L original test-hash guards green; review changes for path-only/asset location rebase. Never merge while any gate is queued, red or missing. After merge verify historical main QA, Pages guard and Pages deployment and any triggered graphics smoke. Revert Stage M as a single merge if regression is detected.
