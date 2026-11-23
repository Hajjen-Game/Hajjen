# SKYSHIFT Architecture Cleanup 2.0 — Stage I: Runtime Performance & Fidelity

Base: `9a27cc3270070b07cc7e3d7ff3f0f6a80fbc167f` (Stage H merged).

This stage relocates **15 performance, frame-pacing, render-optimizer, adaptive visual fidelity and fidelity-settings modules** to `skyshift/core/`. No source behavior, thresholds, WebGL shaders, assets or visuals deliberately change. Files are exact originals after reversible root-external ESM import rebases; the original Git blob SHA for every moved module is recorded in `core/stageI-migration-manifest.json`.

Historical game releases, current `game-v0210.mjs`, directly affected unit tests, the existing full historical CI workflow and dependent source imports have their paths updated. Original historical Stages 5–8 SHA assertions remain intact; an added Stage I reversible path overlay restores only the approved path differences before the original hashes are checked.

**Merge gates:** independent Stage I architecture SHA + graph + stale path guard green; all **35 PR checks green**, including all 33 Chromium/WebGL visual regressions; inspect path-only source diff, confirm tested latest main. After merge full historical main track logic, graphite visual check, Pages guard and Pages publication green. Roll back this PR as one unit.
