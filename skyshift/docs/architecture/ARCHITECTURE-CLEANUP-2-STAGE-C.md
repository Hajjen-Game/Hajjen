# SKYSHIFT Architecture Cleanup 2.0 — Stage C: first LIVE rendering modules

**Caution:** unlike the earlier tests-only cleanup, this batch moves **14 active
shader, metal, reflection, and lighting modules** to `skyshift/rendering/`.
It is intentionally staged as a draft PR with **full 35-job PR CI** and
independent architecture validation, not a blind file move.

- Move 14 source modules into `rendering/`.
- Rebase **9 imports inside moved modules**; modules referring to other moved
  modules keep their sibling-relative import unchanged.
- Update the live game's import declarations and all known other source
  consumers, 23 historical unit-test files, and three GitHub workflows.
- Preserve all graphics calculations, shader bodies, material coefficients,
  physics and runtime behavior. Differences are limited to ESM and source
  test path rewrites.
- `rendering/stageC-migration-manifest.json` contains original immutable Git
  blob hashes and exact external import mapping for each of 14 modules.
- `tests/architecture/rendering-migration-stageC.test.mjs` reverses allowed
  import rebases to verify exact original code and checks the source import
  graph, old paths and workflow references.

**Required before merge:** architecture guard and all 35 PR jobs green;
inspect screenshot comparisons; verify root game `game-v0210.mjs` still boots
on Skyline, Aurora and Vault with unchanged shared tunnel lighting. As with
other runtime moves, confirm full historical `main` workflow after merge.

**Rollback:** revert this single PR to restore exact original import graph,
source file paths, and CI commands. No deletion of archived history.
