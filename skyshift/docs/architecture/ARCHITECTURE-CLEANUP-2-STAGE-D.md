# SKYSHIFT Architecture Cleanup 2.0 – Stage D (live tunnel optics)

This PR moves **12 active tunnel lighting/optics/reflection modules** from
the SKYSHIFT root to `skyshift/tunnel/` as part of the agreed modular structure.

The live `game-v0210.mjs` and other consumers have only their module import
paths changed. Internal sibling imports remain local, external imports are
rebased to `../module.mjs`. Three CI workflows and the affected unit-test
paths are updated.

Safety:
- `tunnel/stageD-migration-manifest.json` records original Git blobs.
- `tests/architecture/tunnel-migration-stageD.test.mjs` reproduces each
  original blob after inverting approved import rewrites and resolves all
  relative ESM imports.
- Old Stage 5–8 test integrity checks still verify original Git hashes:
  `rendering-test-path-overlay-stageC.mjs` and the new
  `tunnel-test-path-overlay-stageD.mjs` invert only approved target
  paths, before existing SHA audits.
- **No shader math, visual constants, metal material, flight handling,
  shared tunnel behavior, stage geometry, or ship code is intentionally changed.**
- This PR touches runtime modules and workflows, so the conservative CI 2.0
  policy correctly requires all **35** PR jobs and the separate architecture
  safety guard. Do not merge until full green.
- After merge, watch full historical main QA and Pages publication; rollback
  is one PR revert if anything regresses.
