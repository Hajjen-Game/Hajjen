# SKYSHIFT Architecture Cleanup 2.0 – Stage G: ship/fleet modules

This batch relocates **eight actual ship-related runtime modules** into
`skyshift/ships/`: fleet state, Manta hull, Stingray EVO, Stingray presentation,
wing clearance, reactive wing flaps, ship white-spill light containment and
ship polish.

- The eight implementations are source-identical except for reversible ESM
  import rebases. Git original blob hashes are in
  `ships/stageG-migration-manifest.json`.
- The active `game-v0210.mjs`, historical `game-v*.mjs` files, related
  Stingray sources, browser scripts, ten affected historical unit tests and
  the full historical GitHub Actions workflow had literal imports updated.
- A dedicated safety test checks source hashes, all moved local dependencies
  and that old root paths are absent from executable code and workflows.
- Original migration Stages 5–8 unit-test hash guarantees are preserved via
  a narrow Stage G path inversion added to their existing chain of overlays.
- No game math, rendering behavior, ship models, handling, lighting or source
  test assertions were deliberately changed.

**Important exclusions:** GLTF hero loader and art pipelines are
source-location-sensitive (`import.meta.url` + assets) and intentionally
left in the root. This batch must pass all 35 PR checks, including 33
Chromium/WebGL jobs, plus the separate architecture guard before merge.

After merge: verify full historical main regression and Pages, and revert
this PR as a unit if a regression is observed.
