# SKYSHIFT 0.28.9.8 — Repository Consolidation, stage 1: safety baseline

Baseline: **main at 294e752456a23b8f477a9485737e5718e3007a48 (0.28.9.7)**, captured 2026-11-22.
All work in this stage is on `skyshift/architecture-02898-stage1`. **Never move runtime files on main before validation and explicit review.**

## Verified baseline

The `skyshift/` tree at the baseline has **1,116 tracked files**, **1,048 directly under `skyshift/`**, and 3 immediate directories (`assets/`, `blender/`, `previews/`). The live gameplay entrypoint is `skyshift/index.html` -> `boot-v0210.js` -> `game-v0210.mjs`; it is not `game.mjs`. The live `game-v0210.mjs` is ~5,803 lines and has ~123 direct local module imports. The root also contains many historical versioned implementations, older browser runners, release notes, and tests.

The active entrypoint selects three courses: Skyline, Aurora, Vault. **`shared-tunnel-architecture-v0280.mjs`, `shared-tunnel-runtime-v0280.mjs`, and `true-shared-tunnel-renderer-v0281.mjs` already exist.** Consolidation must preserve their shared contract, old Skyline look, Vault materials, current optics and 0.28.9.7 startup optimizations.

## Stage 1 changes — no gameplay modifications

1. Create this small `docs/architecture/` area for the architecture contract and migration plan.
2. Create `tests/architecture/active-entrypoint.test.mjs` to verify the actual browser HTML/bootstrap, track selectors and transitive relative JavaScript module paths still resolve.
3. Run the new test in an independent GitHub Actions PR gate; keep the existing fast and historical visual suites.
4. Open a **draft PR**; do not merge this preliminary stage until the checks are reviewed.

The existing `index.html`, `boot-v0210.js`, `game-v0210.mjs`, shared tunnel modules, rendering, physics, art, and production CSS are **unchanged** in this stage.

## Risk controls for future stages

- Keep a fixed known-good baseline commit and a rollback route. Never remove historical modules solely because their names contain a version.
- Prefer isolated, reversible changes and a PR per stage. Avoid bulk moves on the active module graph until verified.
- Move documentation and truly inactive tests first, with all GitHub Actions paths, script references and relative imports updated in the same change.
- Before any **active** file move: take stable pixel-position screenshots of all three courses (especially Skyline tunnel vs Vault), compare startup elapsed time/JS heap/WebGL resources, verify three-track handling/GRIP/rails, and run both new graph guard and existing full historical Chrome/WebGL suites.
- A clean directory tree does not itself improve WebGL performance. Do not replace the approved shared tunnel with a rewrite or instantiate duplicate material/texture atlases.
- Stop and revert a stage if any test fails, a visual mismatch occurs, or startup degrades materially.
- Pages publishing continues to use `skyshift/index.html`; changing build/publishing layout is **out of scope**.

## Suggested target layout (incremental only)

```text
skyshift/
  index.html                   # stay at Pages entrypoint
  src/
    core/
    tracks/{skyline,aurora,vault}/
    graphics/{tunnel,lighting,materials,road}/
    ship/
    ui/
  tests/{architecture,unit,browser}/
  docs/{architecture,releases}/
  assets/
  blender/
  previews/
```

This is a **target**, not a new runtime module system. `src/` does not exist at stage 1. Avoid historical `archive/` churn for now: Git history can preserve inactive versions, but test/rollback dependencies must be explicitly audited before pruning.

## Gate before stage 2

A successful draft-PR run of the new architecture guard and existing PR regressions. Afterward, plan a narrowly scoped documentation/test migration while keeping the working live runtime untouched.
