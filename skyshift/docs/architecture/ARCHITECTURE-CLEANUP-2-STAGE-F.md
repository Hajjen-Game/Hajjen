# SKYSHIFT Architecture Cleanup 2.0 – Stage F: shared tracks and Skyline

This batch creates two clear ownership boundaries:

- `skyshift/tracks/shared/`: track selection, circuit layout, 3D track geometry
- `skyshift/tracks/skyline/`: Skyline-specific challenge rules

**Four active source modules** are moved in one reversible commit. This
batch affects many import consumers, including older `game-v*.mjs` releases,
`trial-v016x.mjs`, legacy browser QA, unit tests, and the historical full CI
workflow. These consumers are deliberately updated so historical coverage
continues to work, rather than leaving broken rollback versions.

There are no intended changes to physics, road geometry, challenge mechanics,
ship feel, tunnel lighting, shaders or graphics. Only ESM/file-reader paths
are rebased. Relative source imports within `tracks/shared/` remain sibling
imports; external root imports are rebased two directories upward.

`tracks/shared/stageF-migration-manifest.json` records the exact original
Git blob for each moved file and its approved external import changes.
`tests/architecture/track-migration-stageF.test.mjs` verifies immutable
original-source equivalence, all moved ESM dependencies and old-root path
absence. The historic Stage 5–8 unit-test SHA verification is maintained by
a strict path-only Stage F overlay before the original source is reconstructed.

**Mandatory release gates:** independent architecture guard success,
35/35 pull-request jobs success including 33 Chromium/WebGL tests, no
conflicting main changes, and full historical main QA and Pages after merge.

Rollback: revert the single Stage F PR; do not delete older game versions.
