# SKYSHIFT unit tests — staged migration

This directory is a new home for existing Node.js unit tests. **The active game source and GitHub Pages entrypoint remain at their existing locations.**

## First safely migrated tests (stage 4)

- `fullscreen-v02.test.mjs`: fullscreen interaction behavior
- `trial-v02.test.mjs`: original authored road / gaps / jumping semantics
- `trial-v03.test.mjs`: early trial layout, physics and risk route regression

The only changes to these tests are the import paths from `./<module>.mjs` to `../../<module>.mjs`, required when the tests are moved from `skyshift/` to `skyshift/tests/unit/`. Test assertions and production modules are unchanged.

**Run these tests**:
```bash
node --test skyshift/tests/unit/fullscreen-v02.test.mjs skyshift/tests/unit/trial-v02.test.mjs skyshift/tests/unit/trial-v03.test.mjs
```

They are enforced on pull requests by `.github/workflows/skyshift-architecture-guard.yml`. The historical full SKYSHIFT workflow also retains its call to `trial-v02.test.mjs` with an updated path.

## Future migration protocol

1. Verify a test's source-module dependencies and all direct/indirect file-path references before moving it.
2. Preserve test assertions and behavior; change only necessary relative imports and CI/test-runner paths.
3. Run the relocated test explicitly and verify the existing fast + full WebGL suite remains green.
4. Migrate in small batches. **Do not move the active game or shared tunnel code during test moves.**

## Stage 5 — 10 additional historical tests

The following test files were relocated with **only static import path adjustments**; their assertions remain identical and are checked against original Git blob SHA-1 hashes by `tests/architecture/unit-migration-integrity.test.mjs`:

- `performance-audit-v0110.test.mjs`
- `render-optimizer-v0111.test.mjs`
- `cinematic-space-lighting-v0170.test.mjs`
- `ship-hero-loader-v0133.test.mjs`
- `ship-hero-loader-v0134.test.mjs`
- `ship-hero-loader-v01342.test.mjs`
- `unified-flight-v0112.test.mjs`
- `visual-fidelity-v0113.test.mjs`
- `visual-fidelity-v0114.test.mjs`
- `track.test.mjs`

Source modules still live at the original `skyshift/` paths. `migration-manifest-02898-stage5.json` records each original test Git blob and allowed import count. The full historical workflow has been updated to invoke the new paths; architecture-guard runs these tests on each PR. Do not rearrange game rendering, physics, tunnel, or active boot as part of test relocation.

## Stage 6 — safe bulk unit-test migration

Sixty additional historical unit tests were relocated from `skyshift/` into this folder, using only transformation of static import path prefixes `./` → `../../` and `new URL(localPath, import.meta.url)` → `new URL("../../" + localPath, import.meta.url)`. Source modules were not changed.

Their original Git blob hashes are recorded in `migration-manifest-02898-stage6.json`. The architecture gate runs `../architecture/bulk-unit-migration-integrity.test.mjs` to reverse the permitted text changes and verify byte-identical original assertions, module paths and workflow references. All 73 files are syntax-checked and protected by migration integrity guards. Tests that remain part of the established SKYSHIFT CI suites are executed normally. Historical tests with obsolete hardcoded expectations (such as old index.html boot versions) are preserved verbatim but are not added as new always-on test gates; this avoids confusing a historical baseline mismatch with a migration regression.

Only a successful full Chrome/WebGL and Node CI run can authorize merging the stage-6 PR. The production tunnel, driving physics, active bootstrap and WebGL renderer are not part of the migration.
