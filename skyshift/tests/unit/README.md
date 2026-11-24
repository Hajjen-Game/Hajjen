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

## Stage 7 — 125 dependency-audited historical tests

The next **125** unit-test files were moved from `skyshift/` to `skyshift/tests/unit/`. The migration only changes actual static import paths and module-relative `new URL(..., import.meta.url)` bases to account for the extra two parent directories. Assertions and other source text have not been updated, including obsolete historical version expectations.

`migration-manifest-02898-stage7.json` records every original Git blob. `../architecture/stage7-unit-migration-integrity.test.mjs` reverses the limited import transformations, checks exact original test-byte hashes, confirms all moved imports exist and prevents stale workflow paths. All **198** tests in the reorganized unit directory are syntax-checked.

Twelve tests remain in the original root because they launch subprocesses, use relative working directories or have similar non-trivial path dependencies. They are **not** deleted or forcibly migrated. Existing active Node/Chromium/WebGL regression gates remain in place, and older tests with historical hardcoded version assertions are preserved without being newly added as unconditional CI execution gates.
 
## Stage 8 — the final 12 path-sensitive historical tests

The remaining 12 root-level `.test.mjs` files were dependency-audited individually and relocated into `skyshift/tests/unit/`. Their original assertions, import order and process invocation arguments are preserved; only module-relative paths were rebased. In particular, `track-physics-parity-probe-v0164.mjs` and `track-physics-parity-probe-v0165.mjs` remain at their original module paths and are called from the relocated tests.

`migration-manifest-02898-stage8.json` stores the original 12 immutable Git blob SHAs. `../architecture/stage8-unit-migration-integrity.test.mjs` reverses the allowed path-only edits, verifies byte-equivalence to the original Git blobs, checks import/probe target existence and prevents stale workflow references. All 210 unit tests are syntax-checked. Existing active tests execute normally in PR CI; older historical tests with superseded version expectations are preserved without adding new always-on execution gates.

**Do not move live game, boot, shaders, road, tunnel or physical modules in this stage.**

## EF02J — current dependency integrity
The four stage 5–8 immutable test-body guards above describe completed historical migration evidence. They are retired in EF02J after passing their final CI run. The original manifests and Git history preserve that evidence. The active replacement is `../architecture/current-unit-dependency-integrity.test.mjs`, which checks current imports and explicit CI test paths, no root test copies, retained protected complex tests and both physics probes. Actual unit test files and executable functional gates are unchanged in this candidate. Future historical retirement requires documented coverage/consumer review under Engineering Foundation; do not use the old fixed 210 count as a permanent design requirement.

EF02J follow-up: V2/V3 ship hero loader tests were superseded by the identical five behavior tests against the active V4 loader. Their historical migration manifest remains evidence, not a requirement to keep duplicate test files. The V4 suite remains in PR and post-merge execution.
